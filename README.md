# Great Spring Solutions

Agentic delivery workspace for outcome-oriented teams. Built with [Wasp](https://wasp.sh) (React + Node.js + Prisma + PostgreSQL).

## Features

- **Outcome-oriented structure**: Initiatives → Milestones → Deliverables → Tasks
- **Agent-first design**: 20+ MCP tools for AI agents (Claude Code, OpenCode, Cursor)
- **Enforced lifecycle**: DRAFT → IN_PROGRESS → IN_REVIEW → APPROVED → DONE
- **Blocking dependencies**: Prevent IN_REVIEW until dependencies are DONE
- **Immutable evidence trail**: PR links, Figma, test reports, deployment logs
- **Automated status rollups**: PgBoss jobs every 15 minutes
- **Daily/Weekly digests**: Automated email summaries
- **Real-time collaboration**: WebSocket-powered live updates
- **Role-based access**: OWNER, LEAD, CONTRIBUTOR, REVIEWER, OBSERVER

## Quick Start (Coolify)

### Prerequisites
- Coolify instance running
- PostgreSQL 16+ (managed by Coolify)
- Redis 7+ (managed by Coolify)
- Domain with SSL certificate

### Deploy to Coolify

1. **Add application in Coolify**
   - Source: GitHub repository
   - Build: Docker Compose (`docker-compose.yml`)
   - Ports: 3000 (client), 3001 (server)

2. **Configure Environment Variables** (in Coolify UI)
   ```
   NODE_ENV=production
   POSTGRES_DB=great_spring_solutions
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=<secure-password>
   JWT_SECRET=<32-char-minimum-secret>
   WASP_SERVER_URL=https://your-domain.com
   WASP_WEB_CLIENT_URL=https://your-domain.com
   RESEND_API_KEY=re_xxx
   GOOGLE_CLIENT_ID=xxx
   GOOGLE_CLIENT_SECRET=xxx
   GITHUB_CLIENT_ID=xxx
   GITHUB_CLIENT_SECRET=xxx
   ```

3. **Deploy**
   - Coolify will build from `docker-compose.yml`
   - Run migrations automatically
   - Start application on ports 3000/3001

### Local Development (Docker)

```bash
# Clone and configure
git clone https://github.com/your-org/great-spring-solutions.git
cd great-spring-solutions
cp .env.example .env
# Edit .env with your values

# Start with Docker Compose
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# View logs
docker-compose logs -f app
```

### Local Development (Wasp Native)

```bash
# Prerequisites
- Node.js 24+
- PostgreSQL 16+
- Redis 7+

# Install Wasp
npm i -g @wasp.sh/wasp-cli@latest

# Install dependencies
wasp install

# Start database
docker-compose up -d postgres redis

# Run migrations
wasp db migrate-dev

# Start development servers
wasp start
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Coolify / Docker                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   PostgreSQL  │  │    Redis    │  │    App      │              │
│  │   (Port 5432) │  │  (Port 6379) │  │ (Ports 3000/3001)      │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack
- **Framework**: Wasp v0.26 (React + Node.js + Prisma)
- **Database**: PostgreSQL 16 (Prisma ORM)
- **Queue**: PgBoss (PostgreSQL-based job queue)
- **Real-time**: Socket.IO (WebSocket)
- **Auth**: Lucia Auth v3 (Email/Password + Google/GitHub OAuth)
- **Email**: Resend (production) / Dummy (development)
- **Deployment**: Docker + Coolify

## Project Structure

```
great-spring-solutions/
├── .github/workflows/       # GitHub Actions CI/CD
├── .wasp/                   # Wasp generated code (gitignored)
├── prisma/
│   └── schema.prisma        # Database schema (15 models, 10 enums)
├── src/
│   ├── auth/               # Auth hooks, signup fields
│   ├── components/         # Shared React components
│   ├── pages/              # React pages (12 pages)
│   ├── services/
│   │   ├── operations/     # Business logic (12 domain files)
│   │   └── jobs/           # Background jobs (5 jobs)
│   ├── api/                # REST API endpoints
│   ├── mcp/tools.ts        # MCP server tools (20+ tools)
│   ├── websocket.ts        # Socket.IO configuration
│   ├── server/             # Express middleware/setup
│   └── env/                # Zod env validation
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Coolify deployment
├── main.wasp.ts            # Wasp specification
├── schema.prisma           # Prisma schema
└── .env.example            # Environment template
```

## MCP Tools (Agent Interface)

| Tool | Description |
|------|-------------|
| `list_my_initiatives` | List user's initiatives |
| `get_initiative` | Full initiative tree |
| `create_initiative` | Create new initiative |
| `create_milestone` | Add milestone to initiative |
| `create_deliverable` | Create deliverable with acceptance criteria |
| `transition_deliverable` | Status transitions with validation |
| `request_review` | Assign reviewer, validate dependencies |
| `approve_deliverable` | Approve (reviewer only) |
| `reject_deliverable` | Reject with reason (reviewer only) |
| `create_task` | Add task to deliverable |
| `transition_task` | Task status transitions |
| `add_evidence` | Attach PR, Figma, test reports |
| `add_comment` | Threaded comments with mentions |
| `add_dependency` | BLOCKS/RELATES_TO/DUPLICATES |
| `get_my_assignments` | User's tasks + deliverables |
| `get_upcoming_reviews` | Pending reviews for user |

## Background Jobs (PgBoss)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `rollupInitiativeStatus` | Every 15 min | Auto-roll initiative status |
| `sendDailyDigest` | Daily 7:00 AM | Email + in-app assignments |
| `checkOverdueDeliverables` | Daily 9:00 AM | Flag overdue items |
| `generateWeeklyReport` | Monday 8:00 AM | Weekly initiative reports |
| `syncExternalWebhook` | Event-driven | GitHub/GitLab/Figma/Vercel sync |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 32+ char secret (openssl rand -hex 32) |
| `WASP_SERVER_URL` | Yes | Server URL (https://domain.com) |
| `WASP_WEB_CLIENT_URL` | Yes | Client URL (https://domain.com) |
| `RESEND_API_KEY` | Prod | Resend API key |
| `GOOGLE_CLIENT_ID` | OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth | Google OAuth secret |
| `GITHUB_CLIENT_ID` | OAuth | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | OAuth | GitHub OAuth secret |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `JWT_SECRET` | Yes | 32+ char secret |

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Support

- Documentation: [docs.greatspring.io](https://docs.greatspring.io)
- Issues: [GitHub Issues](https://github.com/your-org/great-spring-solutions/issues)
- Discord: [Join Community](https://discord.gg/greatspring)