import { type AddDependency } from "wasp/server/operations";
import { HttpError } from "wasp/server";
import { recordActivity } from "./activities";
import { notifyUser } from "./notifications";

type AddDependencyInput = { dependentId: string; dependencyId: string; type?: string };

export const addDependency: AddDependency<AddDependencyInput, { dependency: any }> = async (args, context) => {
  if (!context.user) throw new HttpError(401);
  if (args.dependentId === args.dependencyId) throw new HttpError(400, "A deliverable cannot depend on itself");
  const [dependent, dependency] = await Promise.all([ context.entities.Deliverable.findUnique({ where: { id: args.dependentId }, include: { milestone: { include: { initiative: true } } } }), context.entities.Deliverable.findUnique({ where: { id: args.dependencyId }, include: { milestone: { include: { initiative: true } } } }) ]);
  if (!dependent || !dependency) throw new HttpError(404, "One or both deliverables not found");
  if (dependent.milestone.initiativeId !== dependency.milestone.initiativeId) throw new HttpError(400, "Deliverables must be in the same initiative");
  const membership = await context.entities.InitiativeMember.findUnique({ where: { initiativeId_userId: { initiativeId: dependent.milestone.initiativeId, userId: context.user.id } } }); if (!membership) throw new HttpError(403);
  const existing = await context.entities.DeliverableDependency.findUnique({ where: { dependentId_dependencyId: { dependentId: args.dependentId, dependencyId: args.dependencyId } } }); if (existing) throw new HttpError(400, "Dependency already exists");
  if (await wouldCreateCircularDependency(args.dependentId, args.dependencyId, context)) throw new HttpError(400, "Adding this dependency would create a circular dependency");
  const dep = await context.entities.DeliverableDependency.create({ data: { type: (args.type as any) ?? "BLOCKS", dependent: { connect: { id: args.dependentId } }, dependency: { connect: { id: args.dependencyId } } }, include: { dependent: true, dependency: true } });
  await recordActivity({ type: "DEPENDENCY_ADDED", initiativeId: dependent.milestone.initiativeId, milestoneId: dependent.milestoneId, deliverableId: args.dependentId, userId: context.user.id, description: `Added ${args.type ?? "BLOCKS"} dependency: ${dependent.key} depends on ${dependency.key}`, metadata: { dependentId: args.dependentId, dependencyId: args.dependencyId, type: args.type ?? "BLOCKS" } }, context);
  if (dependent.ownerId !== context.user.id) await notifyUser({ userId: dependent.ownerId, type: "DEPENDENCY_ADDED", title: `New dependency on ${dependent.key}`, message: `${dependent.key} now depends on ${dependency.key} (${dependency.name})`, data: { dependentId: dependent.id, dependencyId: dependency.id, type: args.type ?? "BLOCKS" }, context });
  return { dependency: dep };
};

async function wouldCreateCircularDependency(dependentId: string, dependencyId: string, context: { entities: any }): Promise<boolean> { const visited = new Set<string>(); const queue = [dependencyId]; while (queue.length > 0) { const current = queue.shift()!; if (current === dependentId) return true; if (visited.has(current)) continue; visited.add(current); const deps = await context.entities.DeliverableDependency.findMany({ where: { dependentId: current }, select: { dependencyId: true } }); queue.push(...deps.map(d => d.dependencyId)); } return false; }

export async function checkDependenciesMet(deliverableId: string, context: { entities: any }): Promise<boolean> { const blockingDeps = await context.entities.DeliverableDependency.findMany({ where: { dependentId: deliverableId, type: "BLOCKS" }, include: { dependency: true } }); for (const dep of blockingDeps) if (dep.dependency.status !== "DONE") return false; return true; }

export async function getDependencyGraph(initiativeId: string, context: { entities: any }): Promise<{ nodes: any[]; edges: any[] }> { const deliverables = await context.entities.Deliverable.findMany({ where: { milestone: { initiativeId } }, include: { dependencies: { include: { dependency: true } }, dependents: { include: { dependent: true } } } }); const nodes = deliverables.map(d => ({ id: d.id, key: d.key, name: d.name, status: d.status, type: d.type })); const edges = deliverables.flatMap(d => d.dependencies.map(dep => ({ from: dep.dependencyId, to: d.id, type: dep.type }))); return { nodes, edges }; }