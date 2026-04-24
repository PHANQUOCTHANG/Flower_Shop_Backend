/*
  Warnings:

  - A unique constraint covering the columns `[order_id,product_id]` on the table `order_items` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "is_review" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_product_id_key" ON "order_items"("order_id", "product_id");
