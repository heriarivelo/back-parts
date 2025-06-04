/*
  Warnings:

  - Added the required column `reference` to the `Import` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Import" ADD COLUMN     "reference" TEXT NOT NULL;
