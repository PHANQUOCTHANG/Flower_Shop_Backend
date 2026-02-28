import { Router } from "express";
import * as categoryCtrl from "./category.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { CreateCategorySchema, UpdateCategorySchema, CategoryIdParamSchema } from "./category.request";

const router = Router();

router.route("/")
  .get(categoryCtrl.getCategories)
  .post(validationMiddleware(CreateCategorySchema), categoryCtrl.createCategory);

router.route("/:id")
  .patch(
    validationMiddleware(CategoryIdParamSchema, "params"),
    validationMiddleware(UpdateCategorySchema),
    categoryCtrl.updateCategory
  )
  .delete(validationMiddleware(CategoryIdParamSchema, "params"), categoryCtrl.deleteCategory);

export default router;