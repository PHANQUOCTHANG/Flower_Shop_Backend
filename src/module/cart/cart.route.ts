import { Router } from "express";
import * as cartController from "./cart.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { addToCartSchema, updateQuantitySchema } from "./cart.request";

const router = Router();

// GET giỏ hàng
router.get("/", cartController.getMyCart);

// POST thêm sản phẩm vào giỏ
router.post(
  "/add",
  validationMiddleware(addToCartSchema),
  cartController.addToCart,
);

// PATCH cập nhật số lượng sản phẩm
router.patch(
  "/update",
  validationMiddleware(updateQuantitySchema),
  cartController.updateCartQuantity,
);

// DELETE xóa sản phẩm (/:productId)
router.delete("/items/:productId", cartController.removeItemFromCart);

// DELETE làm trống giỏ hàng
router.delete("/clear", cartController.clearMyCart);

export default router;
