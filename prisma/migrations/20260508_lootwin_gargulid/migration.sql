ALTER TABLE "LootWin" ADD COLUMN "gargulId" TEXT;
CREATE INDEX "LootWin_gargulId_idx" ON "LootWin"("gargulId");
