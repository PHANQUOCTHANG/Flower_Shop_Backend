import { Router } from "express";
import * as reviewCtrl from "@/controllers/review.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { CreateReviewRequestDto } from "@/dto/request/review.request";

const router = Router();

/**
 * @swagger
 * /api/v1/reviews:
 *   post:
 *     summary: Tạo đánh giá sản phẩm
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReviewRequestDto'
 *     responses:
 *       201:
 *         description: Đánh giá đã được tạo
 */
// URL: /api/v1/reviews
router.post(
  "/",
  validationMiddleware(CreateReviewRequestDto),
  reviewCtrl.createReview
);

/**
 * @swagger
 * /api/v1/reviews/product/{productId}:
 *   get:
 *     summary: Lấy đánh giá của một sản phẩm
 *     tags:
 *       - Reviews
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
// URL: /api/v1/reviews/product/:productId
router.get("/product/:productId", reviewCtrl.getReviewsByProduct);

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   delete:
 *     summary: Xóa đánh giá
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Đã xóa thành công
 */
// URL: /api/v1/reviews/:id
router.delete("/:id", reviewCtrl.deleteReview);

export default router;
