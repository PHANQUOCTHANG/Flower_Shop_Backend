/*
  Warnings:

  - You are about to drop the column `district` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `ward` on the `addresses` table. All the data in the column will be lost.
  - Added the required column `district_code` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `district_name` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province_code` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province_name` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ward_code` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ward_name` to the `addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "district",
DROP COLUMN "province",
DROP COLUMN "ward",
ADD COLUMN     "district_code" VARCHAR(10) NOT NULL,
ADD COLUMN     "district_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "province_code" VARCHAR(10) NOT NULL,
ADD COLUMN     "province_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "ward_code" VARCHAR(10) NOT NULL,
ADD COLUMN     "ward_name" VARCHAR(100) NOT NULL;
