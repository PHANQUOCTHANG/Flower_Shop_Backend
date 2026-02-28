import { Router } from "express";
import * as cartCtrl from "@/controllers/cart.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  AddToCartRequestDto,
  UpdateCartItemDto,
} from "@/dto/request/cart.request";

const router = Router();

// Lấy giỏ hàng của người dùng (yêu cầu JWT token)
router.get("/", cartCtrl.getCart);

// Thêm sản phẩm vào giỏ hàng
router.post(
  "/add",
  validationMiddleware(AddToCartRequestDto),
  cartCtrl.addToCart,
);

// Cập nhật số lượng sản phẩm trong giỏ hàng
router.patch(
  "/update",
  validationMiddleware(UpdateCartItemDto),
  cartCtrl.updateCart,
);

// Xóa sản phẩm khỏi giỏ hàng
router.delete("/remove", cartCtrl.removeFromCart);

export default router;
