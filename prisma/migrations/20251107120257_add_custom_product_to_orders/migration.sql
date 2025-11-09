-- CreateEnum
CREATE TYPE "CommandeType" AS ENUM ('STANDARD', 'PARTICULIERE');

-- DropForeignKey
ALTER TABLE "PiecesCommande" DROP CONSTRAINT "PiecesCommande_product_id_fkey";

-- AlterTable
ALTER TABLE "CommandeVente" ADD COLUMN     "commandetype" "CommandeType" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "PiecesCommande" ADD COLUMN     "customProductId" INTEGER,
ALTER COLUMN "product_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CustomProduct" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "marque" TEXT,
    "oem" TEXT,
    "autoFinal" TEXT,
    "prixUnitaire" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomProduct_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PiecesCommande" ADD CONSTRAINT "PiecesCommande_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiecesCommande" ADD CONSTRAINT "PiecesCommande_customProductId_fkey" FOREIGN KEY ("customProductId") REFERENCES "CustomProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
