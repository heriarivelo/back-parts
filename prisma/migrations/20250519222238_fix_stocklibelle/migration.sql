/*
  Warnings:

  - Added the required column `lib1` to the `Stock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "lib1" TEXT NOT NULL;
