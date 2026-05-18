import { Request, Response } from "express";
import { cartService, orderService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import { normalizeQuery } from "@/utils/query";
import asyncHandler from "@/utils/asyncHandler";
import { getUserId } from "@/helpers/getUserId";
import { normalizeQueryOrder, OrderQuery } from "@/module/order/order.type";

import { orderQueue } from "@/config/queue";
import AppError from "@/utils/appError";

// [POST] /api/v1/orders - Đặt hàng
export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);

  // Kiểm tra cart sớm để không đưa job rỗng vào queue
  const cart = await cartService.getCart(userId);
  if (!cart || cart.items.length === 0) {
    throw new AppError("Giỏ hàng của bạn đang trống", 400);
  }

  // Đưa job vào queue, KHÔNG chờ kết quả
  const job = await orderQueue.add(
    "process-checkout",
    {
      userId,
      dto: req.body,
      cartId: cart.id,
    },
    {
      // Deduplicate: cùng user không được có 2 job pending cùng lúc
      jobId: `checkout:${userId}:${Date.now()}`,
    },
  );

  // Trả về ngay 202 — client dùng jobId để track qua WebSocket
  return res.status(202).json({
    success: true,
    message: "Đơn hàng đang được xử lý",
    data: {
      jobId: job.id,
      status: "queued",
    },
  });
});

// [GET] /api/v1/orders/me - Lịch sử đơn hàng
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const query: OrderQuery  = normalizeQueryOrder(req.query);
  const userId = getUserId(req);
  const result = await orderService.findByUserId(userId, query);

  return res.status(200).json(ApiResponse.paginate(result));
});

// [GET] /api/v1/orders/:id - Chi tiết đơn hàng
export const getOrderDetail = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const orderId = req.params.id as string;
    const data = await orderService.findById(orderId, userId);

    return res.status(200).json(ApiResponse.success(data));
  },
);

// [GET] /api/v1/orders - Danh sách đơn hàng (admin)
export const getAllOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const query : OrderQuery = normalizeQueryOrder(req.query);
    const result = await orderService.findAll(query);

    return res.status(200).json(ApiResponse.paginate(result));
  },
);

// [GET] /api/v1/orders/customers/list - Danh sách khách hàng (admin)
export const getAllCustomers = asyncHandler(
  async (req: Request, res: Response) => {
    const query = normalizeQuery(req.query);
    const result = await orderService.findAllCustomers(query);
    return res.status(200).json(ApiResponse.paginate(result));
  },
);

// [PATCH] /api/v1/orders/:id/status - Cập nhật trạng thái (admin)
export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await orderService.updateStatus(
      req.params.id as string,
      req.body.status,
    );

    return res
      .status(200)
      .json(ApiResponse.success(data, "Cập nhật trạng thái thành công"));
  },
);

// [PATCH] /api/v1/orders/:id/cancel - Khách hàng hủy đơn hàng
export const cancelOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const orderId = req.params.id as string;
    
    const data = await orderService.cancelOrder(orderId, userId);

    return res
      .status(200)
      .json(ApiResponse.success(data, "Hủy đơn hàng thành công"));
  },
);

// [GET] /api/v1/orders/dashboard - Thống kê dashboard (admin)
export const getDashboard = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await orderService.getDashboardStats();
    return res.status(200).json(ApiResponse.success(data));
  },
);
