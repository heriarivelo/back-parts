/*
  Warnings:

  - A unique constraint covering the columns `[code_art]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Product_code_art_key" ON "Product"("code_art");
