/*
  Warnings:

  - You are about to drop the column `entrepotId` on the `Stock` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReapproStatus" AS ENUM ('DRAFT', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'COMMANDE';

-- DropForeignKey
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_entrepotId_fkey";

-- DropIndex
DROP INDEX "Stock_productId_key";

-- AlterTable
ALTER TABLE "Stock" DROP COLUMN "entrepotId",
ADD COLUMN     "qttsans_entrepot" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StockEntrepot" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "entrepotId" INTEGER NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockEntrepot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reapprovisionnement" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "ReapproStatus" NOT NULL DEFAULT 'DRAFT',
    "supplierId" INTEGER,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reapprovisionnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReapproItem" (
    "id" SERIAL NOT NULL,
    "reapproId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "weight_kg" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "ReapproItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockEntrepot_stockId_entrepotId_key" ON "StockEntrepot"("stockId", "entrepotId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Reapprovisionnement_reference_key" ON "Reapprovisionnement"("reference");

-- CreateIndex
CREATE INDEX "Reapprovisionnement_supplierId_idx" ON "Reapprovisionnement"("supplierId");

-- CreateIndex
CREATE INDEX "Reapprovisionnement_status_idx" ON "Reapprovisionnement"("status");

-- CreateIndex
CREATE INDEX "ReapproItem_reapproId_idx" ON "ReapproItem"("reapproId");

-- CreateIndex
CREATE INDEX "ReapproItem_productId_idx" ON "ReapproItem"("productId");

-- AddForeignKey
ALTER TABLE "StockEntrepot" ADD CONSTRAINT "StockEntrepot_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntrepot" ADD CONSTRAINT "StockEntrepot_entrepotId_fkey" FOREIGN KEY ("entrepotId") REFERENCES "Entrepot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reapprovisionnement" ADD CONSTRAINT "Reapprovisionnement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReapproItem" ADD CONSTRAINT "ReapproItem_reapproId_fkey" FOREIGN KEY ("reapproId") REFERENCES "Reapprovisionnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReapproItem" ADD CONSTRAINT "ReapproItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
