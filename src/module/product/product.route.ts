import { Router } from "express";
import * as productCtrl from "./product.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductIdParamSchema,
} from "./product.request";

const router = Router();

// Route danh sách và tạo mới
router.route("/")
  .get(productCtrl.getProducts)
  .post(validationMiddleware(CreateProductSchema), productCtrl.createProduct);

// Route thao tác theo ID
router.route("/:id")
  .get(validationMiddleware(ProductIdParamSchema, "params"), productCtrl.getProduct)
  .patch(
    validationMiddleware(ProductIdParamSchema, "params"),
    validationMiddleware(UpdateProductSchema),
    productCtrl.updateProduct
  )
  .delete(validationMiddleware(ProductIdParamSchema, "params"), productCtrl.deleteProduct);

export default router;