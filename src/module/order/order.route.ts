import { Router } from "express";
import * as orderCtrl from "./order.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { CheckoutSchema, UpdateOrderStatusSchema } from "./order.request";
import { checkoutRateLimiter } from "@/middleware/rateLimiter.middleware";
import { requireRole } from "@/middleware/auth.middleware";

const router = Router();

// [POST] Đặt hàng (CUSTOMER)
router.post(
  "/",
  checkoutRateLimiter,
  validationMiddleware(CheckoutSchema),
  orderCtrl.checkout,
);

// [GET] Danh sách đơn hàng (chỉ ADMIN)
router.get("/", requireRole("ADMIN"), orderCtrl.getAllOrders);

// [GET] Thống kê dashboard (chỉ ADMIN)
router.get("/dashboard", requireRole("ADMIN"), orderCtrl.getDashboard);

// [GET] Danh sách khách hàng (chỉ ADMIN)
router.get("/customers/list", requireRole("ADMIN"), orderCtrl.getAllCustomers);

// [GET] Lịch sử đơn hàng của người dùng đang đăng nhập
router.get("/me", orderCtrl.getMyOrders);

// [GET] Chi tiết đơn hàng
router.get("/:id", orderCtrl.getOrderDetail);

// [PATCH] Cập nhật trạng thái đơn hàng (chỉ ADMIN)
router.patch(
  "/:id",
  requireRole("ADMIN"),
  validationMiddleware(UpdateOrderStatusSchema),
  orderCtrl.updateOrderStatus,
);

// [PATCH] Khách hàng hủy đơn hàng
router.patch("/:id/cancel", orderCtrl.cancelOrder);

export default router;
