/*
  Warnings:

  - You are about to drop the column `cost_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `low_stock_threshold` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `meta_description` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `meta_keywords` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `meta_title` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `stock_quantity` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "cost_price",
DROP COLUMN "low_stock_threshold",
DROP COLUMN "meta_description",
DROP COLUMN "meta_keywords",
DROP COLUMN "meta_title",
DROP COLUMN "stock_quantity";

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");
