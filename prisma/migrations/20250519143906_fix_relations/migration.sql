-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MANAGER');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('EN_ATTENTE', 'TRAITEMENT', 'COMPLETED', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('DISPONIBLE', 'RUPTURE', 'COMMANDE', 'PREORDER', 'RESERVE', 'RETOUR', 'DEFECTUEUX');

-- CreateEnum
CREATE TYPE "CommandeStatus" AS ENUM ('EN_ATTENTE', 'TRAITEMENT', 'LIVREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "FactureStatus" AS ENUM ('NON_PAYEE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "RemiseType" AS ENUM ('POURCENTAGE', 'MONTANT_FIXE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'VIREMENT', 'CHEQUE', 'CARTE', 'MOBILE_MONEY');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "reference_code" TEXT NOT NULL,
    "code_art" TEXT,
    "oem" TEXT,
    "marque" TEXT,
    "libelle" TEXT,
    "category" TEXT,
    "compatibleWith" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Import" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "taux_de_change" DECIMAL(65,30) NOT NULL,
    "fret_avec_dd" DECIMAL(65,30) NOT NULL,
    "fret_sans_dd" DECIMAL(65,30) NOT NULL,
    "douane" DECIMAL(65,30) NOT NULL,
    "tva" DECIMAL(65,30) NOT NULL,
    "marge" DECIMAL(65,30) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'COMPLETED',

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedPart" (
    "id" SERIAL NOT NULL,
    "importId" INTEGER NOT NULL,
    "productId" INTEGER,
    "code_art" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "oem" TEXT NOT NULL,
    "auto_final" TEXT NOT NULL,
    "lib1" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "qtt_arrive" INTEGER NOT NULL,
    "poids" DOUBLE PRECISION NOT NULL,
    "purchase_price" DECIMAL(65,30) NOT NULL,
    "sale_price" DECIMAL(65,30) NOT NULL,
    "margin" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "entrepot" TEXT,
    "quantite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantite_vendu" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantite_reserve" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prix_final" DECIMAL(65,30),
    "status" "StockStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "adresse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeVente" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" INTEGER,
    "managerId" INTEGER NOT NULL,
    "libelle" TEXT,
    "status" "CommandeStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "total_amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandeVente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PiecesCommande" (
    "id" SERIAL NOT NULL,
    "commande_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "prix_article" DOUBLE PRECISION NOT NULL,
    "remise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PiecesCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" SERIAL NOT NULL,
    "commande_id" INTEGER NOT NULL,
    "reference_fact" TEXT NOT NULL,
    "prix_total" DOUBLE PRECISION NOT NULL,
    "montant_paye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reste_a_payer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FactureStatus" NOT NULL DEFAULT 'NON_PAYEE',
    "user_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remise" (
    "id" SERIAL NOT NULL,
    "facture_id" INTEGER NOT NULL,
    "description" TEXT,
    "taux" DOUBLE PRECISION,
    "montant" DOUBLE PRECISION,
    "type" "RemiseType" NOT NULL DEFAULT 'POURCENTAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Remise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" SERIAL NOT NULL,
    "factureId" INTEGER NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "managerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Product_reference_code_key" ON "Product"("reference_code");

-- CreateIndex
CREATE INDEX "Product_oem_idx" ON "Product"("oem");

-- CreateIndex
CREATE INDEX "Product_marque_idx" ON "Product"("marque");

-- CreateIndex
CREATE INDEX "Product_reference_code_idx" ON "Product"("reference_code");

-- CreateIndex
CREATE INDEX "ImportedPart_code_art_idx" ON "ImportedPart"("code_art");

-- CreateIndex
CREATE INDEX "ImportedPart_oem_idx" ON "ImportedPart"("oem");

-- CreateIndex
CREATE INDEX "ImportedPart_productId_idx" ON "ImportedPart"("productId");

-- CreateIndex
CREATE INDEX "Stock_productId_idx" ON "Stock"("productId");

-- CreateIndex
CREATE INDEX "Stock_status_idx" ON "Stock"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CommandeVente_reference_key" ON "CommandeVente"("reference");

-- CreateIndex
CREATE INDEX "CommandeVente_reference_idx" ON "CommandeVente"("reference");

-- CreateIndex
CREATE INDEX "CommandeVente_managerId_idx" ON "CommandeVente"("managerId");

-- CreateIndex
CREATE INDEX "CommandeVente_customerId_idx" ON "CommandeVente"("customerId");

-- CreateIndex
CREATE INDEX "CommandeVente_status_idx" ON "CommandeVente"("status");

-- CreateIndex
CREATE INDEX "PiecesCommande_commande_id_idx" ON "PiecesCommande"("commande_id");

-- CreateIndex
CREATE INDEX "PiecesCommande_product_id_idx" ON "PiecesCommande"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_reference_fact_key" ON "Facture"("reference_fact");

-- CreateIndex
CREATE INDEX "Facture_commande_id_idx" ON "Facture"("commande_id");

-- CreateIndex
CREATE INDEX "Facture_reference_fact_idx" ON "Facture"("reference_fact");

-- CreateIndex
CREATE INDEX "Facture_status_idx" ON "Facture"("status");

-- AddForeignKey
ALTER TABLE "ImportedPart" ADD CONSTRAINT "ImportedPart_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedPart" ADD CONSTRAINT "ImportedPart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeVente" ADD CONSTRAINT "CommandeVente_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeVente" ADD CONSTRAINT "CommandeVente_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiecesCommande" ADD CONSTRAINT "PiecesCommande_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "CommandeVente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiecesCommande" ADD CONSTRAINT "PiecesCommande_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "CommandeVente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remise" ADD CONSTRAINT "Remise_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
