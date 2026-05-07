-- CreateEnum
CREATE TYPE "WinType" AS ENUM ('PRIO', 'SR', 'MS', 'OS');

-- CreateTable
CREATE TABLE "RaidWeek" (
    "id" SERIAL NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RaidWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Raid" (
    "id" SERIAL NOT NULL,
    "softresId" TEXT NOT NULL,
    "instance" TEXT NOT NULL,
    "raidDate" TIMESTAMP(3) NOT NULL,
    "night" INTEGER NOT NULL,
    "weekId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Raid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "charName" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "class" TEXT,
    "spec" TEXT,
    "role" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootWin" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "raidId" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "bossName" TEXT NOT NULL,
    "winType" "WinType" NOT NULL DEFAULT 'MS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LootWin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftReserve" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "raidId" INTEGER NOT NULL,
    "weekId" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "bossName" TEXT NOT NULL,
    "weeksConsecutive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SoftReserve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LootPriority" (
    "id" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "instance" TEXT NOT NULL,
    "bossName" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "priorityTier" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LootPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCache" (
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "iconName" TEXT,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemCache_pkey" PRIMARY KEY ("itemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidWeek_weekStart_key" ON "RaidWeek"("weekStart");
CREATE UNIQUE INDEX "Raid_softresId_key" ON "Raid"("softresId");
CREATE UNIQUE INDEX "Player_charName_server_key" ON "Player"("charName", "server");
CREATE UNIQUE INDEX "SoftReserve_playerId_weekId_itemId_key" ON "SoftReserve"("playerId", "weekId", "itemId");
CREATE UNIQUE INDEX "LootPriority_itemId_class_spec_key" ON "LootPriority"("itemId", "class", "spec");

-- CreateIndex (non-unique)
CREATE INDEX "LootWin_playerId_idx" ON "LootWin"("playerId");
CREATE INDEX "LootWin_raidId_idx" ON "LootWin"("raidId");
CREATE INDEX "LootWin_itemId_idx" ON "LootWin"("itemId");
CREATE INDEX "SoftReserve_weekId_idx" ON "SoftReserve"("weekId");
CREATE INDEX "SoftReserve_itemId_idx" ON "SoftReserve"("itemId");
CREATE INDEX "LootPriority_itemId_idx" ON "LootPriority"("itemId");
CREATE INDEX "LootPriority_class_spec_idx" ON "LootPriority"("class", "spec");

-- AddForeignKey
ALTER TABLE "Raid" ADD CONSTRAINT "Raid_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "RaidWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootWin" ADD CONSTRAINT "LootWin_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LootWin" ADD CONSTRAINT "LootWin_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SoftReserve" ADD CONSTRAINT "SoftReserve_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SoftReserve" ADD CONSTRAINT "SoftReserve_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SoftReserve" ADD CONSTRAINT "SoftReserve_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "RaidWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
