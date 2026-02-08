/*
  Warnings:

  - You are about to drop the column `allergens` on the `MenuItem` table. All the data in the column will be lost.
  - You are about to drop the column `ingredients` on the `MenuItem` table. All the data in the column will be lost.
  - You are about to drop the column `isCombo` on the `MenuItem` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `MenuItemImage` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `MenuItemImage` table. All the data in the column will be lost.
  - You are about to drop the column `menuItemId` on the `MenuItemImage` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `MenuItemImage` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the `ComboItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuItemVariant` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `MenuItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemId` to the `MenuItemImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `MenuItemImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codeSnapshot` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameSnapshot` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderKind" AS ENUM ('ITEM', 'BUNDLE');

-- DropForeignKey
ALTER TABLE "ComboItem" DROP CONSTRAINT "ComboItem_childMenuId_fkey";

-- DropForeignKey
ALTER TABLE "ComboItem" DROP CONSTRAINT "ComboItem_parentMenuId_fkey";

-- DropForeignKey
ALTER TABLE "MenuItemImage" DROP CONSTRAINT "MenuItemImage_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "MenuItemVariant" DROP CONSTRAINT "MenuItemVariant_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "menuJson" JSONB,
ADD COLUMN     "pdfAddress" TEXT,
ADD COLUMN     "pdfHeaderTitle" TEXT NOT NULL DEFAULT 'New Party Order',
ADD COLUMN     "pdfReportTitle" TEXT NOT NULL DEFAULT 'MASTER ORDER SUMMARY',
ADD COLUMN     "pdfRestaurantLabel" TEXT NOT NULL DEFAULT 'Restaurant',
ADD COLUMN     "pdfSectionTitle" TEXT NOT NULL DEFAULT 'DETAILED ORDERS',
ADD COLUMN     "vipMessage" TEXT,
ADD COLUMN     "vipName" TEXT;

-- AlterTable
ALTER TABLE "MenuItem" DROP COLUMN "allergens",
DROP COLUMN "ingredients",
DROP COLUMN "isCombo",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "MenuItemImage" DROP COLUMN "createdAt",
DROP COLUMN "imageUrl",
DROP COLUMN "menuItemId",
DROP COLUMN "sortOrder",
ADD COLUMN     "itemId" TEXT NOT NULL,
ADD COLUMN     "sort" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "variantId",
ADD COLUMN     "bundleId" TEXT,
ADD COLUMN     "codeSnapshot" TEXT NOT NULL,
ADD COLUMN     "kind" "OrderKind" NOT NULL DEFAULT 'ITEM',
ADD COLUMN     "nameSnapshot" TEXT NOT NULL,
ADD COLUMN     "optionLabel" TEXT,
ADD COLUMN     "optionPrice" DOUBLE PRECISION,
ADD COLUMN     "priceSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "menuItemId" DROP NOT NULL;

-- DropTable
DROP TABLE "ComboItem";

-- DropTable
DROP TABLE "MenuItemVariant";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'FOOD',

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemOption" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metaQty" TEXT,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MenuItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleLine" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BundleLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_eventId_key_key" ON "Category"("eventId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_eventId_code_key" ON "Bundle"("eventId", "code");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemImage" ADD CONSTRAINT "MenuItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOption" ADD CONSTRAINT "MenuItemOption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleLine" ADD CONSTRAINT "BundleLine_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
