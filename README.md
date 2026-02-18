# PALM — Prompt & Agent Library Marketplace

PALM is Booz Allen's enterprise-ready, model-agnostic platform that connects users to a wide range of large language models (LLMs) and data sources through a unified, extensible interface. It provides secure, AI-powered chat and prompt workflows with full traceability — without vendor lock-in or the high costs of closed platforms.

## Table of Contents

- [Key Capabilities](#key-capabilities)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Authentication](#authentication)
- [Feature Flags](#feature-flags)
- [Knowledge Base Providers](#knowledge-base-providers)
- [Document Uploads](#document-uploads)
- [Error Handling](#error-handling)
- [Deployment](#deployment)
- [Admin Accounts](#admin-accounts)
- [Security and SBOM](#security-and-sbom)
- [Contributing](#contributing)
- [Release Management](#release-management)
- [License](#license)

## Key Capabilities

- **Multi-model access** — connect to Bedrock, Azure OpenAI, Gemini, and more from a single interface
- **AI Agents** — build mission-specific agents that leverage user-group-approved resources
- **Knowledge Bases** — integrate external knowledge bases for citation-backed, context-aware responses
- **Document Uploads** — upload documents and use them as context in AI conversations
- **Role-based access control** — fine-grained admin controls over providers, knowledge bases, and usage
- **Feature flags** — safely ship incremental work behind toggles

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) |
| Language | TypeScript |
| API | [tRPC](https://trpc.io/) |
| Database | PostgreSQL + [Prisma](https://www.prisma.io/) ORM |
| UI | [Mantine](https://mantine.dev/) |
| Auth | [NextAuth.js](https://next-auth.js.org/) |
| Package Manager | Yarn |
| Containerization | Docker |
| Production Deploy | Kubernetes (Amazon EKS) + Helm |

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) (for local development outside Docker)
- [Yarn](https://yarnpkg.com/)

### Quick Start

1. **Create your environment file:**

   ```bash
   cp .env.local.sample .env.local
   ```

   Fill in the required values (see `.env.local.sample` for descriptions).

2. **Start the application:**

   ```bash
   docker compose up -d
   ```

3. **Initialize the database:**

   ```bash
   docker exec -it frontend yarn prisma migrate deploy
   ```

4. **Open the app** at [http://localhost:3000](http://localhost:3000).

### Common Commands

| Command | Description |
|---|---|
| `docker exec -it frontend yarn lint` | Run ESLint checks |
| `docker exec -it frontend yarn lint:fix` | Auto-fix lint issues |
| `docker exec -it frontend yarn test` | Run unit tests |
| `docker exec -it -e NODE_ENV=production frontend yarn build` | Production build |
| `docker exec -it frontend yarn prisma studio` | Open Prisma Studio at [localhost:5555](http://localhost:5555) |
| `docker exec -it frontend yarn prisma migrate dev` | Generate new migrations |
| `docker exec -it frontend yarn prisma migrate reset` | Re-seed the database |

For more detailed developer guidance, see [docs/getting-started/index.md](docs/getting-started/index.md).

## Project Structure

```
BAH-palm/
├── components/          # Shared React components
├── features/            # Feature modules (chat, ai-agents, library, settings, etc.)
├── libs/                # Shared utilities and helpers
├── pages/               # Next.js pages and API routes
│   └── api/             # tRPC and REST API endpoints
├── prisma/              # Database schema, migrations, and seed scripts
├── providers/           # React context providers
├── public/              # Static assets
├── server/              # Server-side tRPC routers and middleware
├── types/               # Shared TypeScript type definitions
├── deployment/          # Kubernetes and Helm deployment configs
├── docker/              # Docker-related build files
└── docs/                # Documentation (ADL, auth guides, getting started)
```

## Authentication

PALM uses [NextAuth.js](https://next-auth.js.org/) and supports the following providers:

| Provider | Configuration |
|---|---|
| Azure AD | [docs/auth/AzureAD.md](docs/auth/AzureAD.md) |
| Keycloak | [docs/auth/Keycloak.md](docs/auth/Keycloak.md) |

Enable providers via the `ENABLED_NEXTAUTH_PROVIDERS` environment variable:

```bash
ENABLED_NEXTAUTH_PROVIDERS=azure-ad,keycloak
```

### Inheriting Roles from OAuth

Set `INHERITED_OAUTH_ROLE_PATH` to the dot-notation path within your OAuth profile object that contains the user role. For example:

```json
{ "access": { "palm": { "roles": { "role": ["Admin"] } } } }
```

```bash
INHERITED_OAUTH_ROLE_PATH=access.palm.roles.role
```

If unset or invalid, PALM defaults to the role stored in the user's database record (`User`). Refer to the "Inheriting Session User Roles" section within each provider's configuration guide for setup details.

## Feature Flags

In-progress features are hidden behind feature flags to prevent unfinished work from appearing in production.

1. Add your flag to [`.env.local.sample`](.env.local.sample) and [`libs/featureFlags.ts`](libs/featureFlags.ts).
2. Use `useGetFeatureFlag()` on the frontend or `isFeatureOn()` on the backend to gate access.
3. Set the flag to `true` in your `.env.local` to enable it locally.

## Knowledge Base Providers

### AWS Bedrock

Configure via **Settings > Knowledge Base Providers > Bedrock** in the admin UI. Required fields: Access Key ID, Secret Access Key, Session Token, and Region.

Falls back to `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, and `AWS_REGION` environment variables if admin configuration is not provided.

### Local Testing

Start the local KB service:

```bash
docker compose --profile kb up -d
```

Then configure a **PALM** provider in **Settings > Knowledge Base Providers** with:

- **API Endpoint:** `http://kb:5000`
- **API Key:** your `LOCAL_KB_API_KEY` value
- **External ID:** `my_knowledge_base`

## Document Uploads

PALM supports document uploads for use as context in AI conversations. See [Document Upload Documentation](./docs/document-upload/README.md) for S3 bucket configuration and CORS setup.

## Error Handling

PALM follows a layered error handling approach:

| Layer | Responsibility |
|---|---|
| **Data Access (DAL)** | Wrap DB calls in try/catch, log details with Winston, re-throw with sanitized messages |
| **Route** | Throw domain-specific errors (e.g., `Forbidden`); let DAL errors propagate |
| **Middleware** | Convert errors to a consistent format (e.g., `TRPCError`) |
| **Frontend** | Display errors to users via toast notifications; avoid `console.log` in components |

## Deployment

### Kubernetes

Deploy with Helm using the example configurations:

- [`deployment/examples/kubernetes/deployment.yaml`](deployment/examples/kubernetes/deployment.yaml) — deployment spec (replicas, image, ports, env vars, volumes)
- [`deployment/examples/kubernetes/values.yaml`](deployment/examples/kubernetes/values.yaml) — configurable Helm values

### Production Docker Image (Local)

```bash
docker build -t palm-prod .
docker run -it --rm --env-file .env.local -e NEXTAUTH_URL=http://localhost:3001 -p 3001:3000 --network palm-net palm-prod
```

## Admin Accounts

Promote an existing user to Admin:

```bash
docker exec -it frontend yarn ts-node -r tsconfig-paths/register prisma/scripts/admin.ts <email>
```

Create a new Admin user:

```bash
docker exec -it frontend yarn ts-node -r tsconfig-paths/register prisma/scripts/admin.ts <email> <password>
```

## Security and SBOM

This project maintains a Software Bill of Materials (SBOM) to track dependencies and address vulnerabilities. See [bom/README.md](bom/README.md) for details.

Architectural decisions are logged in [docs/adl/](docs/adl/) for future reference.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on style, branching, testing, and pull requests.

## Release Management

See [docs/release-management.md](docs/release-management.md) for information on our release process and schedule.

## License

Licensed under the [Booz Allen Public License v1.0](LICENSE).
