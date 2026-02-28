import { Router } from "express";
import * as categoryCtrl from "@/controllers/category.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  CreateCategoryRequestDto,
  UpdateCategoryRequestDto,
} from "@/dto/request/category.request";

const router = Router();

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Lấy danh sách danh mục
 *     tags:
 *       - Categories
 *     responses:
 *       200:
 *         description: Thành công
 *   post:
 *     summary: Tạo danh mục mới
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequestDto'
 *     responses:
 *       201:
 *         description: Đã tạo thành công
 */
router
  .route("/")
  .get(categoryCtrl.getCategories)
  .post(
    validationMiddleware(CreateCategoryRequestDto),
    categoryCtrl.createCategory
  );

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Chi tiết danh mục
 *     tags:
 *       - Categories
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
 *     summary: Cập nhật danh mục
 *     tags:
 *       - Categories
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
 *             $ref: '#/components/schemas/UpdateCategoryRequestDto'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Xóa danh mục
 *     tags:
 *       - Categories
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
  .get(categoryCtrl.getCategory)
  .patch(
    validationMiddleware(UpdateCategoryRequestDto),
    categoryCtrl.updateCategory
  )
  .delete(categoryCtrl.deleteCategory);

export default router;
