import { Router } from "express";
import * as orderCtrl from "./order.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { CheckoutSchema, UpdateOrderStatusSchema } from "./order.request";
import { checkoutRateLimiter } from "@/middleware/rateLimiter.middleware";

const router = Router();

// GET danh sách & POST đặt hàng
router
  .route("/")
  .get(orderCtrl.getAllOrders)
  .post(
    checkoutRateLimiter,
    validationMiddleware(CheckoutSchema),
    orderCtrl.checkout,
  );

// GET danh sách khách hàng
router.route("/customers/list").get(orderCtrl.getAllCustomers);

// GET lịch sử đơn hàng
router.route("/me").get(orderCtrl.getMyOrders);

// GET chi tiết & PATCH cập nhật trạng thái
router
  .route("/:id")
  .get(orderCtrl.getOrderDetail)
  .patch(
    validationMiddleware(UpdateOrderStatusSchema),
    orderCtrl.updateOrderStatus,
  );

export default router;
