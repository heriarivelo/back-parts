-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'B2B', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('RETAIL', 'B2B', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IMPORT', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'LOSS');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('INCREASE', 'DECREASE', 'INITIAL');

-- AlterTable
ALTER TABLE "CommandeVente" ADD COLUMN     "type" "OrderType" NOT NULL DEFAULT 'RETAIL';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "siret" TEXT,
ADD COLUMN     "type" "CustomerType" NOT NULL DEFAULT 'RETAIL';

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "oldPrice" DECIMAL(65,30) NOT NULL,
    "newPrice" DECIMAL(65,30) NOT NULL,
    "changeReason" TEXT,
    "changeType" "ChangeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_idx" ON "PriceHistory"("productId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
