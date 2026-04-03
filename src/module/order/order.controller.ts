import { Request, Response } from "express";
import { orderService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import { normalizeQuery } from "@/utils/query";
import asyncHandler from "@/utils/asyncHandler";
import { getUserId } from "@/helpers/getUserId";
import { normalizeQueryOrder } from "@/module/order/order.type";

// [POST] /api/v1/orders - Đặt hàng
export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const data = await orderService.checkout(userId, req.body);

  return res.status(201).json(ApiResponse.success(data, "Đặt hàng thành công"));
});

// [GET] /api/v1/orders/me - Lịch sử đơn hàng
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = normalizeQueryOrder(req.query);
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
    const query = normalizeQueryOrder(req.query);
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
