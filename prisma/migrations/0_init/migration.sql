-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LAWYER', 'DISTRICT_ADMIN', 'STATE_ADMIN', 'REVIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PendingCaseFlag" AS ENUM ('NONE', 'CONFIRMED_MULTI', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ExclusionStatus" AS ENUM ('CLEAR', 'EXCLUDED', 'STRICTER_SCRUTINY', 'NEEDS_HUMAN_REVIEW');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('TIER_1', 'TIER_2');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('IDENTIFIED', 'DELIVERED', 'FILED', 'HEARD', 'BAIL_GRANTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "StatusSource" AS ENUM ('SYSTEM', 'ECOURTS', 'LAWYER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "barEnrolmentNo" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "districtId" TEXT,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "otpSecret" TEXT,
    "otpCodeHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "slsaContact" TEXT,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "nameVariants" TEXT[],
    "approxAge" INTEGER,
    "fuzzyMatchClusterId" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseSection" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "law" TEXT NOT NULL,
    "maxSentenceDays" INTEGER NOT NULL,
    "isDeathOrLife" BOOLEAN NOT NULL DEFAULT false,
    "isGraded" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL,
    "citation" TEXT,
    "notes" TEXT,

    CONSTRAINT "KnowledgeBaseSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "arrestDate" TIMESTAMP(3) NOT NULL,
    "chargedSectionIds" TEXT[],
    "custodyStatus" TEXT NOT NULL,
    "bailGranted" BOOLEAN NOT NULL DEFAULT false,
    "bailOrderDate" TIMESTAMP(3),
    "isJuvenile" BOOLEAN NOT NULL DEFAULT false,
    "pendingCaseFlag" "PendingCaseFlag" NOT NULL DEFAULT 'UNKNOWN',
    "specialActFlag" BOOLEAN NOT NULL DEFAULT false,
    "exclusionStatus" "ExclusionStatus" NOT NULL DEFAULT 'CLEAR',
    "exclusionReason" TEXT,
    "caseStatus" "CaseStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedFact" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sourceSentence" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,

    CONSTRAINT "ExtractedFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaResult" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "governingSectionId" TEXT NOT NULL,
    "applicableFraction" DOUBLE PRECISION NOT NULL,
    "thresholdDays" INTEGER NOT NULL,
    "daysInCustody" INTEGER NOT NULL,
    "tier" "Tier",
    "overdueDays" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormulaResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackBFlag" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "bailOrderDate" TIMESTAMP(3),
    "daysSinceBail" INTEGER,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackBFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "draftText" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL,
    "setByUserId" TEXT,
    "source" "StatusSource" NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_barEnrolmentNo_key" ON "User"("barEnrolmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_districtId_idx" ON "User"("districtId");

-- CreateIndex
CREATE INDEX "Case_districtId_idx" ON "Case"("districtId");

-- CreateIndex
CREATE INDEX "Case_caseStatus_idx" ON "Case"("caseStatus");

-- CreateIndex
CREATE INDEX "ExtractedFact_caseId_idx" ON "ExtractedFact"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaResult_caseId_key" ON "FormulaResult"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackBFlag_caseId_key" ON "TrackBFlag"("caseId");

-- CreateIndex
CREATE INDEX "CaseStatusEvent_caseId_idx" ON "CaseStatusEvent"("caseId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedFact" ADD CONSTRAINT "ExtractedFact_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedFact" ADD CONSTRAINT "ExtractedFact_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaResult" ADD CONSTRAINT "FormulaResult_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaResult" ADD CONSTRAINT "FormulaResult_governingSectionId_fkey" FOREIGN KEY ("governingSectionId") REFERENCES "KnowledgeBaseSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackBFlag" ADD CONSTRAINT "TrackBFlag_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusEvent" ADD CONSTRAINT "CaseStatusEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusEvent" ADD CONSTRAINT "CaseStatusEvent_setByUserId_fkey" FOREIGN KEY ("setByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

