import { Router } from "express";
import * as productCtrl from "@/controllers/product.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  CreateProductRequestDto,
  UpdateProductRequestDto,
} from "@/dto/request/product.request";

const router = Router();

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Lấy danh sách sản phẩm
 *     tags:
 *       - Products
 *     responses:
 *       200:
 *         description: Thành công
 *   post:
 *     summary: Tạo sản phẩm mới
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequestDto'
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router
  .route("/")
  .get(productCtrl.getProducts)
  .post(
    validationMiddleware(CreateProductRequestDto),
    productCtrl.createProduct
  );

/**
 * @swagger
 * /api/v1/products/slug/{slug}:
 *   get:
 *     summary: Chi tiết sản phẩm theo Slug
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.get("/slug/:slug", productCtrl.getProductBySlug);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Chi tiết sản phẩm theo ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *   patch:
 *     summary: Cập nhật sản phẩm
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProductRequestDto'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Xóa sản phẩm
 *     tags:
 *       - Products
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
 *         description: Xóa thành công
 */
router
  .route("/:id")
  .get(productCtrl.getProduct)
  .patch(
    validationMiddleware(UpdateProductRequestDto),
    productCtrl.updateProduct
  )
  .delete(productCtrl.deleteProduct);

export default router;
