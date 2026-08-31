-- Lưu kích thước ảnh (width/height) để có thể audit/cảnh báo ảnh độ phân giải
-- thấp mà không phải gọi Cloudinary Admin API cho từng ảnh mỗi lần.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "thumbnail_width" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "thumbnail_height" INTEGER;
ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "product_images" ADD COLUMN IF NOT EXISTS "height" INTEGER;
