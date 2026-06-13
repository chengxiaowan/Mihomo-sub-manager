-- DropTable (Rule many-to-many with Profile)
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "_ProfileToRule";
DROP TABLE IF EXISTS "Rule";
PRAGMA foreign_keys=ON;

-- AlterTable: Profile add defaultPolicy
ALTER TABLE "Profile" ADD COLUMN "defaultPolicy" TEXT NOT NULL DEFAULT 'DIRECT';

-- CreateTable: ProfileRule
CREATE TABLE "ProfileRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT,
    "policy" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT NOT NULL,
    CONSTRAINT "ProfileRule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: RuleTemplate
CREATE TABLE "RuleTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: RuleTemplateItem
CREATE TABLE "RuleTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT NOT NULL,
    CONSTRAINT "RuleTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RuleTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
