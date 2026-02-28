import { cartService } from "@/config/container";
import asyncHandler from "@/utils/asyncHandler";
import AppError from "@/utils/appError";
import { Request, Response } from "express";

// Lấy giỏ hàng của người dùng
export const getCart = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.sub; // Lấy từ JWT token
  if (!userId) throw new AppError("Vui lòng đăng nhập", 401);

  const cart = await cartService.findByUserId(userId);
  res.status(200).json({
    status: "success",
    data: cart,
  });
});

// Thêm sản phẩm vào giỏ hàng
export const addToCart = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.sub; // Lấy từ JWT token
  if (!userId) throw new AppError("Vui lòng đăng nhập", 401);

  const cart = await cartService.add(userId, req.body);
  res.status(200).json({
    status: "success",
    data: cart,
  });
});

// Cập nhật số lượng sản phẩm trong giỏ hàng
export const updateCart = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.sub; // Lấy từ JWT token
  if (!userId) throw new AppError("Vui lòng đăng nhập", 401);

  const cart = await cartService.update(userId, req.body);
  res.status(200).json({
    status: "success",
    data: cart,
  });
});

// Xóa sản phẩm khỏi giỏ hàng
export const removeFromCart = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.sub; // Lấy từ JWT token
  if (!userId) throw new AppError("Vui lòng đăng nhập", 401);

  const { productId, color, size } = req.body;
  const cart = await cartService.remove(userId, productId, color, size);
  res.status(200).json({
    status: "success",
    data: cart,
  });
});
