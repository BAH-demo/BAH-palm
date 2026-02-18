# PALM — Prompt & Agent Library Marketplace

PALM is Booz Allen's enterprise-ready, model-agnostic platform that connects users to a wide range of large language models (LLMs) and data sources through a unified, extensible interface. It provides secure, AI-powered chat and prompt workflows with full traceability — without vendor lock-in or the high costs of closed platforms.

With PALM, organizations can rapidly onboard user groups, assign access to specific models and data sources, and build mission-specific AI agents — all while giving administrators fine-grained control over provider integrations, knowledge base connections, usage monitoring, and role-based access.

## Table of Contents

- [Key Capabilities](#key-capabilities)
- [Core Modules](#core-modules)
- [AI Agents](#ai-agents)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [Feature Flags](#feature-flags)
- [Knowledge Base Providers](#knowledge-base-providers)
- [Document Uploads](#document-uploads)
- [Error Handling](#error-handling)
- [Deployment](#deployment)
- [Admin Accounts](#admin-accounts)
- [Security and SBOM](#security-and-sbom)
- [FAQ](#faq)
- [Additional Documentation](#additional-documentation)
- [Contributing](#contributing)
- [Release Management](#release-management)
- [License](#license)

## Key Capabilities

- **Multi-model access** — connect to Bedrock, Azure OpenAI, Gemini, and more from a single interface
- **AI Agents** — automated, multi-step analysis workflows (compliance checking, research discovery) powered by BullMQ and Redis
- **Knowledge Bases** — integrate external knowledge bases for citation-backed, context-aware responses
- **Document Uploads** — upload documents and use them as context in AI conversations
- **Prompt Library & Generator** — curate, customize, and share prompts across teams
- **Prompt Playground** — compare and fine-tune responses from multiple LLM providers side by side
- **Deep Research** — extended AI-powered research with real-time progress tracking
- **Role-based access control** — fine-grained admin controls over providers, knowledge bases, and user groups
- **Feature flags** — safely ship incremental work behind toggles

## Core Modules

PALM provides five primary user-facing modules:

| Module | Path | Description |
|---|---|---|
| **Chat** | `/chat` | Converse with LLMs, incorporate knowledge bases, generate documents and code artifacts |
| **Prompt Library** | `/library` | Browse predefined prompts and manage custom prompts |
| **Prompt Generator** | `/prompt-generator` | Build prompts from scratch with guided instruction generation and fine-tuning |
| **Prompt Playground** | `/prompt-playground` | Compare responses from multiple LLM providers (e.g., ChatGPT, Llama, Gemini) |
| **AI Agents** | `/ai-agents` | Run configurable, use-case-specific automated workflows |

## AI Agents

PALM includes a background job processing system built on **BullMQ** with **Redis** for running complex, time-intensive AI analysis tasks asynchronously.

### Built-in Agents

| Agent | Purpose | Key Features |
|---|---|---|
| **CERTA** (Compliance Evaluation, Reporting, and Tracking Agent) | Automated website compliance monitoring | Web crawling via Puppeteer, policy-based content analysis, real-time compliance scoring, multi-policy concurrent processing |
| **RADAR** (Research Article Discovery and Analysis) | Academic research discovery and trend analysis | Multi-database paper search, AI-powered trend analysis, category/institution filtering, intelligent caching |

### Agent Processing Flow

```
Frontend UI  ──▶  tRPC Routes  ──▶  Job Creation + Queue (Redis)
                                              │
Real-time UI  ◀──  Redis Hash  ◀──  BullMQ Worker (Background)
  Progress         Storage            Processing
```

1. User submits a request through the agent UI
2. System validates user access via user group permissions
3. Job is created and added to the BullMQ queue
4. Background worker picks up and processes the job
5. Intermediate results are stored in Redis as they complete
6. Frontend polls Redis every 4–5 seconds for status updates
7. Final results are stored in both Redis and the database

For full details, see [docs/ai-agents/README.md](docs/ai-agents/README.md).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (React 19) |
| Language | TypeScript |
| API | [tRPC](https://trpc.io/) (typesafe end-to-end) |
| Database | PostgreSQL ([pgvector](https://github.com/pgvector/pgvector)) + [Prisma](https://www.prisma.io/) ORM |
| Job Queue | [BullMQ](https://docs.bullmq.io/) + Redis |
| UI | [Mantine](https://mantine.dev/) v6 |
| Auth | [NextAuth.js](https://next-auth.js.org/) |
| Validation | [Zod](https://zod.dev/) |
| Logging | [Winston](https://github.com/winstonjs/winston) |
| Package Manager | Yarn |
| Containerization | Docker + Docker Compose |
| Production Deploy | Kubernetes (Amazon EKS) + Helm |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│   React 19 + Mantine UI + tRPC Client + React Query        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Next.js Server                          │
│   NextAuth.js │ tRPC Routers │ Middleware │ API Routes      │
└───────┬──────────────┬──────────────┬───────────────────────┘
        │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
   │PostgreSQL│   │   Redis   │  │ AI/LLM  │
   │(pgvector)│   │  (BullMQ) │  │Providers│
   └──────────┘   └───────────┘  └─────────┘
                                  Bedrock │ Azure OpenAI
                                  Gemini  │ Anthropic
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) v20+ (for local development outside Docker)
- [Yarn](https://yarnpkg.com/)

### Quick Start

1. **Create your environment file:**

   ```bash
   cp .env.local.sample .env.local
   ```

   Fill in the required values — see [Environment Variables](#environment-variables) below.

2. **Start the application:**

   ```bash
   docker compose up -d
   ```

   This starts three services: `frontend` (Next.js on port 3000), `db` (PostgreSQL on port 5432), and `redis` (port 6379).

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
├── features/            # Feature modules organized by domain
│   ├── ai-agents/       #   AI agent workflows (CERTA, RADAR)
│   ├── chat/            #   Chat interface and message handling
│   ├── library/         #   Prompt library
│   ├── playground/      #   Prompt playground (multi-model comparison)
│   ├── prompt-generator/#   Guided prompt builder
│   ├── settings/        #   Admin settings and configuration
│   ├── kb-provider/     #   Knowledge base provider integrations
│   ├── document-upload-provider/ # Document upload handling
│   └── shared/          #   Shared utilities, errors, and types
├── libs/                # Shared utilities and helpers
├── pages/               # Next.js pages and API routes
│   └── api/             #   tRPC and REST API endpoints
├── prisma/              # Database schema, migrations, and seed scripts
├── providers/           # React context providers
├── public/              # Static assets
├── server/              # Server-side tRPC routers and middleware
├── types/               # Shared TypeScript type definitions
├── deployment/          # Kubernetes and Helm deployment configs
├── docker/              # Docker-related build files
└── docs/                # Documentation (ADL, auth, getting started)
```

## Environment Variables

PALM is configured via a `.env.local` file. Copy `.env.local.sample` to get started. Key variables:

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_SECRET` | Yes | Session encryption key (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Application URL (default: `http://localhost:3000`) |
| `ENABLED_NEXTAUTH_PROVIDERS` | Yes | Comma-separated auth providers (e.g., `azure-ad,keycloak`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | Yes | Redis connection for BullMQ job queues |
| `AWS_ACCESS_KEY_ID` | No | AWS credentials for Bedrock integration |
| `AWS_SECRET_ACCESS_KEY` | No | AWS credentials for Bedrock integration |
| `AWS_REGION` | No | AWS region for Bedrock resources |
| `AZURE_AD_CLIENT_ID` | No | Azure AD OAuth client ID |
| `AZURE_AD_CLIENT_SECRET` | No | Azure AD OAuth client secret |
| `AZURE_AD_TENANT_ID` | No | Azure AD tenant ID |
| `KEYCLOAK_ID` / `KEYCLOAK_SECRET` | No | Keycloak OAuth credentials |
| `KEYCLOAK_ISSUER` | No | Keycloak realm URL |
| `FEATURE_FLAG_PREFIX` | No | Prefix for feature flags (default: `Feature_`) |
| `USER_ID_SALT` | No | Salt for hashing user IDs in storage object keys |
| `LOG_LEVEL` | No | Winston log level (`error`, `warn`, `info`, `debug`, etc.) |
| `LOG_FORMAT` | No | Log format (`json` or `prettyPrint`) |

See [`.env.local.sample`](.env.local.sample) for the full list with descriptions.

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

Set `INHERITED_OAUTH_ROLE_PATH` to the dot-notation path within your OAuth profile object that contains the user role. For example, given this profile:

```json
{
  "OAuthProfile": {
    "access": {
      "palm": {
        "roles": {
          "role": ["Admin"]
        }
      }
    }
  }
}
```

Set `INHERITED_OAUTH_ROLE_PATH=access.palm.roles.role`. PALM searches arrays for the first valid `UserRole` value, so indices are not needed.

If unset or invalid, PALM defaults to the role stored in the user's database record (`User`). Refer to the "Inheriting Session User Roles" section within each provider's configuration guide for setup details.

## Feature Flags

In-progress features are hidden behind feature flags to prevent unfinished work from appearing in production.

1. Add your flag to [`.env.local.sample`](.env.local.sample) and [`libs/featureFlags.ts`](libs/featureFlags.ts).
2. Use `useGetFeatureFlag()` on the frontend or `isFeatureOn()` on the backend to gate access.
3. Set the flag to `true` in your `.env.local` to enable it locally.

Current flags:

| Flag | Description |
|---|---|
| `Feature_PALM_KB` | PALM knowledge base features |
| `Feature_DEEP_RESEARCH` | Deep research functionality in chat |

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

PALM supports document uploads for use as context in AI conversations. Users can upload documents from their profile's Personal Document Library, which are then processed, embedded, and made available as chat context.

For detailed setup including S3 bucket configuration and CORS setup, see the [Document Upload Documentation](./docs/document-upload/README.md).

## Error Handling

PALM follows a layered error handling approach to ensure security and low coupling between architectural layers:

| Layer | Responsibility |
|---|---|
| **Data Access (DAL)** | Wrap DB calls in try/catch, log details with Winston, re-throw with sanitized messages |
| **Route** | Throw domain-specific errors (e.g., `Forbidden`); let DAL errors propagate. Uses predefined [route errors](features/shared/errors/routeErrors.ts) |
| **Middleware** | Convert errors to a consistent format (e.g., `TRPCError`) for the frontend |
| **Frontend** | Display errors to users via toast notifications; avoid `console.log` in components |

**DAL example:**

```javascript
try {
    // database operation
} catch (error) {
    logger.error('Error getting user role', error);
    throw new Error('Error getting user role'); // sanitized — no PII or internals
}
```

**Frontend example:**

```javascript
try {
    // await result from API call
} catch (error) {
    notifications.show({
        title: 'Submission Failed',
        message: error?.message || 'An unexpected error occurred.',
        variant: 'failed_operation',
    });
}
```

## Deployment

### Docker Compose (Development)

The default `docker-compose.yml` starts four services:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `frontend` | Built from `Dockerfile` (dev target) | 3000 | Next.js application |
| `db` | `ankane/pgvector:v0.5.1` | 5432 | PostgreSQL with vector extension |
| `redis` | `redis:latest` | 6379 | BullMQ job queue backend |
| `keycloak` | `quay.io/keycloak/keycloak:18.0.2` | 8080 | Local auth provider (optional) |

### Kubernetes (Production)

Deploy with Helm using the example configurations:

- [`deployment/examples/kubernetes/deployment.yaml`](deployment/examples/kubernetes/deployment.yaml) — deployment spec (replicas, image, ports, env vars, volumes)
- [`deployment/examples/kubernetes/values.yaml`](deployment/examples/kubernetes/values.yaml) — configurable Helm values

For production Redis, use AWS ElastiCache — see [docs/ai-agents/elasticache-setup.md](docs/ai-agents/elasticache-setup.md).

### Production Docker Image (Local)

```bash
docker build -t palm-prod .
docker run -it --rm --env-file .env.local -e NEXTAUTH_URL=http://localhost:3001 -p 3001:3000 --network palm-net palm-prod
```

For the hardened Chainguard image:

```bash
docker build -f Dockerfile.chainguard -t palm-prod .
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

This project maintains a Software Bill of Materials (SBOM) to track dependencies and address vulnerabilities. See [bom/README.md](bom/README.md) for details on viewing and generating the SBOM.

To report a security vulnerability, navigate to the **Security** tab in GitHub and click **Report a vulnerability**. See [SECURITY.md](SECURITY.md).

Architectural decisions are logged in [docs/adl/](docs/adl/) for future reference.

## FAQ

**What is PALM?**
PALM is a comprehensive AI productivity platform that combines a prompt library, chat interface, automated agentic workflows, and advanced AI model experimentation tools. It empowers users to leverage AI through multiple pathways — specialized prompts, natural conversations, multi-step automated workflows, and cross-provider model comparison.

**How is the application used?**
Users interact through five main modules: **Chat** (LLM conversations with knowledge base context), **Prompt Library** (predefined and custom prompts), **Prompt Generator** (guided prompt building), **Prompt Playground** (multi-model comparison), and **AI Agents** (automated analysis workflows).

**What's the roadmap?**
PALM continues to evolve with expanded agentic workflows, improved workflow customization, and additional AI model provider integrations.

For the full FAQ, see [docs/FAQ.md](docs/FAQ.md).

## Additional Documentation

| Document | Description |
|---|---|
| [Getting Started](docs/getting-started/index.md) | Full development setup guide |
| [AI Agents](docs/ai-agents/README.md) | Agent system architecture and configuration |
| [ElastiCache Setup](docs/ai-agents/elasticache-setup.md) | Production Redis configuration |
| [Azure AD Auth](docs/auth/AzureAD.md) | Azure AD provider setup |
| [Keycloak Auth](docs/auth/Keycloak.md) | Keycloak provider setup |
| [Document Uploads](docs/document-upload/README.md) | S3 and CORS configuration |
| [Architectural Decisions](docs/adl/README.md) | ADL index and template |
| [CHANGELOG](CHANGELOG.md) | Version history and release notes |
| [CONTRIBUTING](CONTRIBUTING.md) | Contribution guidelines |
| [SECURITY](SECURITY.md) | Vulnerability reporting |

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on style, branching, testing, and pull requests.

## Release Management

See [docs/release-management.md](docs/release-management.md) for information on our release process and schedule.

## License

Licensed under the [Booz Allen Public License v1.0](LICENSE).
