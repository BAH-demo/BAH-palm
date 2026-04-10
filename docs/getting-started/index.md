# Getting Started

## Quick Start (Single Command)

Run the entire application with one command — no manual configuration required:

```bash
docker compose up
```

This will:
- Start PostgreSQL (with pgvector), Redis, and the PALM frontend
- Wait for the database to be healthy before starting the app
- Automatically run Prisma database migrations
- Start the Next.js development server on [http://localhost:3000](http://localhost:3000)

The default configuration uses credentials-based authentication. You can sign up and log in directly. To create an admin user, run:

```bash
docker exec -it frontend yarn ts-node -r tsconfig-paths/register prisma/scripts/admin.ts <email> <password>
```

> **Note:** The quick start uses built-in defaults (e.g., `postgres` as the DB password, a development-only NextAuth secret). These are fine for local development but **must** be changed for any shared or production environment.

## Custom Configuration

To customize environment variables (e.g., enable SSO, connect to AWS, change DB credentials):

**1.** Copy the sample environment file

```bash
cp .env.local.sample .env.local
```

**2.** Edit `.env.local` with your values (see comments in the file for guidance)

**3.** Start the application

```bash
docker compose up
```

Any values set in `.env.local` will override the built-in defaults.

## Optional Services

**Keycloak** (SSO provider): Start with the `keycloak` profile:

```bash
docker compose --profile keycloak up
```

**Knowledge Base** (local KB for testing): Start with the `kb` profile:

```bash
docker compose --profile kb up
```

You can combine profiles:

```bash
docker compose --profile keycloak --profile kb up
```

## Prisma

### Re-seeding the database

```bash
docker exec -it frontend yarn prisma migrate reset
```

### Generating migrations

```bash
yarn prisma migrate dev
```

### Starting Prisma studio

```bash
docker compose exec -it frontend yarn prisma studio
```

Open [http://localhost:5555](http://localhost:5555) to access the database GUI

## API Routes

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Build and Run Production Docker Containers Locally

When making changes to docker-related files, it will be necessary to build and test a production image locally. To build an image tagged as `myimg`, run the following:

```bash
docker build -t myimg .
```

Or, to build the hardened chainguard image, run:

```bash
docker build -f Dockerfile.chainguard -t myimg .
```

To run `myimg` locally:

- Have docker compose already up
- Bind to a port *other* than 3000 (used by the dev container), e.g. 3001
- Include the network docker compose created so the container will have access to the DB service
- Pass in the contents of your .env.local
- Override the NEXTAUTH_URL environment variable to reflect the bind port (3001 in this example)

```bash
docker run -it --rm --env-file .env.local -e NEXTAUTH_URL=http://localhost:3001 -p 3001:3000 --network palm-net myimg
```

If Docker reports `palm-net` is not a known network, docker compose may have used a different prefix, run `docker network list` to find the correct name for your machine- it'll be in the form `palm-net`.

## ESLint configuration

`.eslintrc.json` rules are derived from [https://eslint.org/docs/latest/rules](https://eslint.org/docs/latest/rules)

To check for any linter errors and warnings, run this command:

```bash
docker exec -it frontend yarn lint
```

To automatically resolve any errors or warnings identified by ESLint, use the following command:

```bash
docker exec -it frontend yarn lint:fix
```

**Note:** Not all linting issues can be automatically fixed. Some may require manual intervention.

## Run a Yarn Build

Run a local build via yarn to check for failing type errors or dependencies

```bash
docker exec -it -e NODE_ENV=production frontend yarn build
```

## Run Unit Tests Locally

Check for failing tests locally. Write unit tests for any changes you make and for related parts of the application that do not already have tests.

```bash
docker exec -it frontend yarn test
```
