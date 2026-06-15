-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubscriptionSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "refreshInterval" INTEGER,
    "excludeKeywords" TEXT NOT NULL DEFAULT '[]',
    "lastFetchedAt" DATETIME,
    "fetchStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SubscriptionSource" ("createdAt", "enabled", "fetchStatus", "id", "lastFetchedAt", "name", "updatedAt", "url") SELECT "createdAt", "enabled", "fetchStatus", "id", "lastFetchedAt", "name", "updatedAt", "url" FROM "SubscriptionSource";
DROP TABLE "SubscriptionSource";
ALTER TABLE "new_SubscriptionSource" RENAME TO "SubscriptionSource";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
