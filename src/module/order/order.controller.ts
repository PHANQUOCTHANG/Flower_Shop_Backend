import { Request, Response } from "express";
import { orderService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import { normalizeQuery } from "@/utils/query";
import asyncHandler from "@/utils/asyncHandler";

// [POST] /api/v1/orders/checkout - Khách hàng đặt hàng
export const checkout = asyncHandler(async (req: Request, res: Response) => {
  // req.user.id lấy từ AuthMiddleware
  const data = await orderService.checkout(req.user.id, req.body);
  
  return res
    .status(201)
    .json(ApiResponse.success(data, "Đặt hàng thành công"));
});

// [GET] /api/v1/orders/me - Khách hàng xem lịch sử đơn hàng của mình
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = normalizeQuery(req.query);
  const result = await orderService.findByUserId(req.user.id, query);
  
  return res.status(200).json(ApiResponse.paginate(result));
});

// [GET] /api/v1/orders/:id - Chi tiết đơn hàng (Dùng cho cả khách và admin)
export const getOrderDetail = asyncHandler(async (req: Request, res: Response) => {
  const data = await orderService.findById(req.params.id as string, req.user.id);
  
  return res.status(200).json(ApiResponse.success(data));
});

// [GET] /api/v1/orders - Admin lấy danh sách toàn bộ đơn hàng hệ thống
export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = normalizeQuery(req.query);
  const result = await orderService.findAll(query);
  
  return res.status(200).json(ApiResponse.paginate(result));
});

// [PATCH] /api/v1/orders/:id/status - Admin cập nhật trạng thái đơn hàng
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = await orderService.updateStatus(
    req.params.id as string, 
    req.body.status
  );
  
  return res
    .status(200)
    .json(ApiResponse.success(data, "Cập nhật trạng thái thành công"));
});