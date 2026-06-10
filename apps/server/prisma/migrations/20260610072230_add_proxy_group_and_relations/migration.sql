-- AlterTable
ALTER TABLE "SubscriptionSource" ADD COLUMN "fetchStatus" TEXT;
ALTER TABLE "SubscriptionSource" ADD COLUMN "lastFetchedAt" DATETIME;

-- CreateTable
CREATE TABLE "ProxyGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "_ProxyGroupToProxyNode" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProxyGroupToProxyNode_A_fkey" FOREIGN KEY ("A") REFERENCES "ProxyGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProxyGroupToProxyNode_B_fkey" FOREIGN KEY ("B") REFERENCES "ProxyNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProfileToProxyGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProfileToProxyGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProfileToProxyGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "ProxyGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProfileToRule" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProfileToRule_A_fkey" FOREIGN KEY ("A") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProfileToRule_B_fkey" FOREIGN KEY ("B") REFERENCES "Rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProxyNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "port" INTEGER,
    "raw" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "sourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProxyNode_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SubscriptionSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProxyNode" ("createdAt", "enabled", "id", "name", "port", "raw", "server", "sourceId", "type") SELECT "createdAt", "enabled", "id", "name", "port", "raw", "server", "sourceId", "type" FROM "ProxyNode";
DROP TABLE "ProxyNode";
ALTER TABLE "new_ProxyNode" RENAME TO "ProxyNode";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_ProxyGroupToProxyNode_AB_unique" ON "_ProxyGroupToProxyNode"("A", "B");

-- CreateIndex
CREATE INDEX "_ProxyGroupToProxyNode_B_index" ON "_ProxyGroupToProxyNode"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProfileToProxyGroup_AB_unique" ON "_ProfileToProxyGroup"("A", "B");

-- CreateIndex
CREATE INDEX "_ProfileToProxyGroup_B_index" ON "_ProfileToProxyGroup"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProfileToRule_AB_unique" ON "_ProfileToRule"("A", "B");

-- CreateIndex
CREATE INDEX "_ProfileToRule_B_index" ON "_ProfileToRule"("B");
