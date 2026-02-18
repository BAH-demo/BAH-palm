-- CreateTable: Unified ApiConfig
CREATE TABLE "ApiConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "ApiConfig_pkey" PRIMARY KEY ("id")
);

-- Add providerId column to AiProvider
ALTER TABLE "AiProvider" ADD COLUMN "providerId" TEXT NOT NULL DEFAULT '';

-- Migrate OpenAI configs
INSERT INTO "ApiConfig" ("id", "providerId", "config", "deletedAt")
SELECT "id", 'openai', jsonb_build_object('apiKey', "apiKey", 'orgKey', "orgKey"), "deletedAt"
FROM "ApiConfigOpenAi";

-- Migrate Azure OpenAI configs
INSERT INTO "ApiConfig" ("id", "providerId", "config", "deletedAt")
SELECT "id", 'azure-openai', jsonb_build_object('apiKey', "apiKey", 'apiEndpoint', "apiEndpoint", 'deploymentId', "deploymentId"), "deletedAt"
FROM "ApiConfigAzureOpenAi";

-- Migrate Anthropic configs
INSERT INTO "ApiConfig" ("id", "providerId", "config", "deletedAt")
SELECT "id", 'anthropic', jsonb_build_object('apiKey', "apiKey"), "deletedAt"
FROM "ApiConfigAnthropic";

-- Migrate Gemini configs
INSERT INTO "ApiConfig" ("id", "providerId", "config", "deletedAt")
SELECT "id", 'gemini', jsonb_build_object('apiKey', "apiKey"), "deletedAt"
FROM "ApiConfigGemini";

-- Migrate Bedrock configs
INSERT INTO "ApiConfig" ("id", "providerId", "config", "deletedAt")
SELECT "id", 'bedrock', jsonb_build_object('accessKeyId', "accessKeyId", 'secretAccessKey', "secretAccessKey", 'sessionToken', "sessionToken", 'region', "region"), "deletedAt"
FROM "ApiConfigBedrock";

-- Update AiProvider.providerId based on aiProviderTypeId
UPDATE "AiProvider" SET "providerId" = 'openai' WHERE "aiProviderTypeId" = 1;
UPDATE "AiProvider" SET "providerId" = 'azure-openai' WHERE "aiProviderTypeId" = 2;
UPDATE "AiProvider" SET "providerId" = 'bedrock' WHERE "aiProviderTypeId" = 3;
UPDATE "AiProvider" SET "providerId" = 'anthropic' WHERE "aiProviderTypeId" = 5;
UPDATE "AiProvider" SET "providerId" = 'gemini' WHERE "aiProviderTypeId" = 6;

-- Set defaults for deprecated columns
ALTER TABLE "AiProvider" ALTER COLUMN "aiProviderTypeId" SET DEFAULT 0;
ALTER TABLE "AiProvider" ALTER COLUMN "apiConfigType" SET DEFAULT 0;
