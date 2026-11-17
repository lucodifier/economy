-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "consolidated" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Transaction_userId_consolidated_idx" ON "Transaction"("userId", "consolidated");
