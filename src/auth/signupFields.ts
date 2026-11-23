import { defineUserSignupFields } from "wasp/server/auth";

export const userSignupFields = defineUserSignupFields({
  name: async (data) => {
    const name = data.name;
    if (typeof name !== "string") throw new Error("Name is required");
    if (name.length < 2) throw new Error("Name must be at least 2 characters");
    if (name.length > 100) throw new Error("Name must be at most 100 characters");
    return name;
  },
  role: async (data) => {
    const role = data.role;
    if (typeof role !== "string") return "CONTRIBUTOR";
    const validRoles = ["OWNER", "LEAD", "CONTRIBUTOR", "REVIEWER", "OBSERVER"];
    return validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : "CONTRIBUTOR";
  },
});