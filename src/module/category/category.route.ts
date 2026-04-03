import { Router } from "express";
import * as categoryCtrl from "./category.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryIdParamSchema,
} from "./category.request";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { uploadCategoryThumbnail } from "@/middleware/upload.middleware";

const router = Router();

// GET danh sách & POST tạo danh mục
router
  .route("/")
  .get(categoryCtrl.getCategories)
  .post(
    requireAuth,
    requireRole("ADMIN"),
    uploadCategoryThumbnail,
    validationMiddleware(CreateCategorySchema),
    categoryCtrl.createCategory,
  );

// PATCH cập nhật & DELETE xóa danh mục theo ID
router
  .route("/:id")
  .patch(
    requireAuth,
    requireRole("ADMIN"),
    uploadCategoryThumbnail,
    validationMiddleware(CategoryIdParamSchema, "params"),
    validationMiddleware(UpdateCategorySchema),
    categoryCtrl.updateCategory,
  )
  .delete(
    requireAuth,
    requireRole("ADMIN"),
    validationMiddleware(CategoryIdParamSchema, "params"),
    categoryCtrl.deleteCategory,
  );

export default router;
