import { orderService } from "@/config/container";
import asyncHandler from "@/utils/asyncHandler";
import { Request, Response } from "express";

// POST | /api/v1/orders | Tạo đơn hàng mới từ giỏ hàng
export const createOrder = asyncHandler(async (req: any, res: Response) => {
  // Truyền userId từ middleware xác thực và dữ liệu body (phương thức thanh toán...)
  const data = await orderService.create(req.user.id, req.body);
  
  res.status(201).json({ 
    status: "success", 
    data 
  });
});

// GET | /api/v1/orders/my-orders | Lấy danh sách đơn hàng của người dùng hiện tại
export const getMyOrders = asyncHandler(async (req: any, res: Response) => {
  // Gọi hàm findAll trong service đã được refactor ngắn gọn
  const data = await orderService.findAll(req.user.id, req.query as any);
  
  res.status(200).json({ 
    status: "success", 
    data 
  });
});

// GET | /api/v1/orders/:id | Xem chi tiết một đơn hàng cụ thể
export const getOrder = asyncHandler(async (req: any, res: Response) => {
  // Truyền cả orderId và userId để đảm bảo tính bảo mật (chủ sở hữu mới được xem)
  const data = await orderService.findById(req.params.id, req.user.id);
  
  res.status(200).json({ 
    status: "success", 
    data 
  });
});