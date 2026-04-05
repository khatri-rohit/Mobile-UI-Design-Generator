-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditEventSource" AS ENUM ('REQUEST', 'WEBHOOK', 'SYSTEM');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "clerkUserId" TEXT,
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "organizationSlug" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "password";

-- CreateTable
CREATE TABLE "AppSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clerkSessionId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clerkUserId" TEXT,
    "clerkSessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventSource" "AuditEventSource" NOT NULL DEFAULT 'REQUEST',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClerkWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClerkWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSession_clerkSessionId_key" ON "AppSession"("clerkSessionId");

-- CreateIndex
CREATE INDEX "AppSession_userId_createdAt_idx" ON "AppSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AppSession_status_idx" ON "AppSession"("status");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_userId_createdAt_idx" ON "AuthAuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_clerkUserId_createdAt_idx" ON "AuthAuditEvent"("clerkUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_clerkSessionId_createdAt_idx" ON "AuthAuditEvent"("clerkSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "AppSession" ADD CONSTRAINT "AppSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAuditEvent" ADD CONSTRAINT "AuthAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
