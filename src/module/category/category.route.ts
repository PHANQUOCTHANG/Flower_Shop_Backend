import { Router } from "express";
import * as categoryCtrl from "./category.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryIdParamSchema,
} from "./category.request";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

router
  .route("/")
  .get(categoryCtrl.getCategories)
  .post(
    requireAuth,
    requireRole("ADMIN"),
    validationMiddleware(CreateCategorySchema),
    categoryCtrl.createCategory,
  );

router
  .route("/:id")
  .patch(
    requireAuth,
    requireRole("ADMIN"),
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
