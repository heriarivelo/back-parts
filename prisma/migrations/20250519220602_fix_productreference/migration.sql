/*
  Warnings:

  - You are about to drop the column `compatibleWith` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "compatibleWith",
ADD COLUMN     "auto_final" TEXT;
