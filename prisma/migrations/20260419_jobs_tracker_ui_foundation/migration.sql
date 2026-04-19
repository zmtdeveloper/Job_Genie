-- CreateTable
CREATE TABLE "SavedJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalJobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "location" TEXT,
    "locality" TEXT,
    "listingUrl" TEXT,
    "applyUrl" TEXT,
    "sourceUrl" TEXT,
    "salaryText" TEXT,
    "jobType" TEXT,
    "postedAt" TEXT,
    "description" TEXT,
    "matchScore" DOUBLE PRECISION,
    "matchLevel" TEXT,
    "matchReasons" TEXT[],
    "keySkills" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'saved',
    "notes" TEXT,
    "atsScore" DOUBLE PRECISION,
    "atsSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedJob_userId_externalJobId_key" ON "SavedJob"("userId", "externalJobId");

-- CreateIndex
CREATE INDEX "SavedJob_userId_status_idx" ON "SavedJob"("userId", "status");

-- AddForeignKey
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
