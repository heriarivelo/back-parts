/*
  Warnings:

  - You are about to drop the column `entrepot` on the `Stock` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Stock" DROP COLUMN "entrepot",
ADD COLUMN     "entrepotId" INTEGER;

-- CreateTable
CREATE TABLE "Entrepot" (
    "id" SERIAL NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "adresse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrepot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entrepot_libelle_key" ON "Entrepot"("libelle");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_entrepotId_fkey" FOREIGN KEY ("entrepotId") REFERENCES "Entrepot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
