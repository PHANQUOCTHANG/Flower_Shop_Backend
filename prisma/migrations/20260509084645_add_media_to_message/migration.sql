-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "media_public_id" VARCHAR(255),
ADD COLUMN     "media_type" VARCHAR(20),
ADD COLUMN     "media_url" TEXT,
ALTER COLUMN "content" DROP NOT NULL;
