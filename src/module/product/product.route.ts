import { Router } from "express";
import * as productCtrl from "./product.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { uploadProductImages } from "@/middleware/upload.middleware";
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductIdParamSchema,
} from "./product.request";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

router.route("/").get(productCtrl.getProducts).post(
  requireAuth,
  // requireRole("ADMIN"),
  uploadProductImages, // 🔥 parse form-data trước
  validationMiddleware(CreateProductSchema), // 🔥 validate sau
  productCtrl.createProduct,
);
router
  .route("/:id")
  .get(
    validationMiddleware(ProductIdParamSchema, "params"),
    productCtrl.getProduct,
  )
  .patch(
    requireAuth,
    requireRole("ADMIN"),
    validationMiddleware(ProductIdParamSchema, "params"),
    uploadProductImages, // Ảnh mới (optional)
    validationMiddleware(UpdateProductSchema),
    productCtrl.updateProduct,
  )
  .delete(
    requireAuth,
    requireRole("ADMIN"),
    validationMiddleware(ProductIdParamSchema, "params"),
    productCtrl.deleteProduct,
  );

router.route("/slug/:slug").get(productCtrl.getProductBySlug);

export default router;
