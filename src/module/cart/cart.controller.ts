import { Request, Response } from "express";
import { cartService } from "@/config/container"; // Giả định bạn đã đăng ký vào container
import { ApiResponse } from "@/utils/apiResponse";
import asyncHandler from "@/utils/asyncHandler";
import { CartResponseDto } from "./cart.response";

declare global {
  namespace Express {
    interface Request {
      user: { id: string };
    }
  }
}

// [GET] /api/v1/carts - Lấy chi tiết giỏ hàng của người dùng hiện tại
export const getMyCart = asyncHandler(async (req: Request, res: Response) => {
  // req.user.id lấy từ AuthMiddleware
  const userId = req.user.id; 
  const data = await cartService.getCart(userId);
  
  // Trả về dữ liệu đã qua xử lý DTO (tính tổng tiền, format BigInt)
  return res
    .status(200)
    .json(ApiResponse.success(new CartResponseDto(data), "Lấy giỏ hàng thành công"));
});

// [POST] /api/v1/carts/add - Thêm sản phẩm vào giỏ
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  await cartService.addToCart(userId, productId, Number(quantity));

  return res
    .status(200)
    .json(ApiResponse.success(null, "Đã thêm sản phẩm vào giỏ hàng"));
});

// [PATCH] /api/v1/carts/update - Cập nhật số lượng sản phẩm trong giỏ
export const updateCartQuantity = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  await cartService.updateQuantity(userId, productId, Number(quantity));

  return res
    .status(200)
    .json(ApiResponse.success(null, "Cập nhật số lượng thành công"));
});

// [DELETE] /api/v1/carts/items/:productId - Xóa một sản phẩm khỏi giỏ
export const removeItemFromCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { productId } = req.params;

  await cartService.removeItem(userId, productId as string);

  return res
    .status(200)
    .json(ApiResponse.success(null, "Đã xóa sản phẩm khỏi giỏ hàng"));
});

// [DELETE] /api/v1/carts/clear - Làm trống giỏ hàng
export const clearMyCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;
  
  await cartService.clearCart(userId);

  return res
    .status(200)
    .json(ApiResponse.success(null, "Đã làm trống giỏ hàng"));
});