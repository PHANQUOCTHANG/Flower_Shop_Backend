import { Router } from "express";
import * as productCtrl from "./product.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { uploadProductImages } from "@/middleware/upload.middleware";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductIdParamSchema,
} from "./product.request";

const router = Router();

// GET danh sách & POST tạo sản phẩm
router
  .route("/")
  .get(productCtrl.getProducts)
  .post(
    requireAuth,
    requireRole("ADMIN"),
    uploadProductImages,
    validationMiddleware(CreateProductSchema),
    productCtrl.createProduct,
  );

// GET sản phẩm theo slug
router.route("/slug/:slug").get(productCtrl.getProductBySlug);

// GET sản phẩm nhóm theo danh mục
router.route("/grouped-by-category").get(productCtrl.getProductsGroupedByCategory);

// GET danh sách sản phẩm trong thùng rác (đặt trước "/:id" để tránh xung đột route)
router
  .route("/trash")
  .get(requireAuth, requireRole("ADMIN"), productCtrl.getTrashProducts);

// DELETE xóa vĩnh viễn sản phẩm khỏi thùng rác
router.route("/:id/permanent").delete(
  requireAuth,
  requireRole("ADMIN"),
  validationMiddleware(ProductIdParamSchema, "params"),
  productCtrl.hardDeleteProduct,
);

// PATCH khôi phục sản phẩm từ thùng rác
router.route("/:id/restore").patch(
  requireAuth,
  requireRole("ADMIN"),
  validationMiddleware(ProductIdParamSchema, "params"),
  productCtrl.restoreProduct,
);

// GET, PATCH, DELETE sản phẩm theo ID
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
    uploadProductImages,
    validationMiddleware(UpdateProductSchema),
    productCtrl.updateProduct,
  )
  .delete(
    requireAuth,
    requireRole("ADMIN"),
    validationMiddleware(ProductIdParamSchema, "params"),
    productCtrl.deleteProduct,
  );

export default router;
