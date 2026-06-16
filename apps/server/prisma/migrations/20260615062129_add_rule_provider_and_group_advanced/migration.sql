-- AlterTable
ALTER TABLE "ProxyGroup" ADD COLUMN "filter" TEXT;
ALTER TABLE "ProxyGroup" ADD COLUMN "interval" INTEGER;
ALTER TABLE "ProxyGroup" ADD COLUMN "lazy" BOOLEAN;
ALTER TABLE "ProxyGroup" ADD COLUMN "tolerance" INTEGER;
ALTER TABLE "ProxyGroup" ADD COLUMN "url" TEXT;

-- CreateTable
CREATE TABLE "RuleProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "behavior" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'yaml',
    "url" TEXT,
    "path" TEXT,
    "interval" INTEGER,
    "proxy" TEXT,
    "payload" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_ProfileToRuleProvider" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProfileToRuleProvider_A_fkey" FOREIGN KEY ("A") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProfileToRuleProvider_B_fkey" FOREIGN KEY ("B") REFERENCES "RuleProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RuleProvider_name_key" ON "RuleProvider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_ProfileToRuleProvider_AB_unique" ON "_ProfileToRuleProvider"("A", "B");

-- CreateIndex
CREATE INDEX "_ProfileToRuleProvider_B_index" ON "_ProfileToRuleProvider"("B");
