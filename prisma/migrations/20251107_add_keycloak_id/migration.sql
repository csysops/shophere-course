-- AlterTable: Add keycloakId field to User table
-- Make passwordHash optional for Keycloak users

-- Step 1: Make passwordHash nullable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Step 2: Add keycloakId column
ALTER TABLE "User" ADD COLUMN "keycloakId" TEXT;

-- Step 3: Add unique constraint on keycloakId
ALTER TABLE "User" ADD CONSTRAINT "User_keycloakId_key" UNIQUE ("keycloakId");

-- Step 4: Create index on keycloakId for faster lookups
CREATE INDEX "User_keycloakId_idx" ON "User"("keycloakId");

