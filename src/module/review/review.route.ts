import { Router } from "express";
import * as reviewController from "./review.controller";
import { CreateReviewSchema } from "./review.request";
import { z } from "zod";
import validationMiddleware from "@/middleware/validate.middleware";
import { requireAuth } from "@/middleware/auth.middleware";
import { uploadReviewMedia } from "@/middleware/upload.middleware";
import { apiActionRateLimiter } from "@/middleware/rateLimiter.middleware";

const router = Router();

const UuidParamSchema = z.object({
  id: z.string().uuid("ID không hợp lệ"),
});

const ProductIdParamSchema = z.object({
  productId: z.string().uuid("ID sản phẩm không hợp lệ"),
});

// --- PUBLIC ROUTES ---

// Xem đánh giá theo slug sản phẩm (dùng trang chi tiết) — đặt TRƯỚC route :productId
router.get(
  "/product/slug/:slug",
  reviewController.getReviewsByProductSlug,
);

// Xem đánh giá theo productId
router.get(
  "/product/:productId",
  validationMiddleware(ProductIdParamSchema, "params"),
  reviewController.getProductReviews,
);

// --- PROTECTED ROUTES (Cần đăng nhập) ---

// Tạo đánh giá mới — multer upload trước, validate body sau (giống product)
router.post(
  "/",
  requireAuth,
  apiActionRateLimiter,
  uploadReviewMedia,                              // upload file lên Cloudinary
  validationMiddleware(CreateReviewSchema, "body"), // validate text fields sau upload
  reviewController.createReview,
);

// Xóa đánh giá (Chủ nhân hoặc Admin/Staff)
router.delete(
  "/:id",
  requireAuth,
  validationMiddleware(UuidParamSchema, "params"),
  reviewController.deleteReview,
);

export default router;
