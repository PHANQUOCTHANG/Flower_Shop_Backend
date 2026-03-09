import { Router } from "express";
import * as orderCtrl from "./order.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { 
  CheckoutSchema, 
  UpdateOrderStatusSchema, 
} from "./order.request";

const router = Router();

// Path: /api/v1/orders
router.route("/")
  .get(orderCtrl.getAllOrders) // Admin lấy toàn bộ
  .post(validationMiddleware(CheckoutSchema), orderCtrl.checkout); // Khách đặt hàng

// Path: /api/v1/orders/me (Lịch sử đơn hàng của chính khách hàng)
router.route("/me")
  .get(orderCtrl.getMyOrders);

// Path: /api/v1/orders/:id
router.route("/:id")
  .get(
    orderCtrl.getOrderDetail
  )
  .patch(
    validationMiddleware(UpdateOrderStatusSchema),
    orderCtrl.updateOrderStatus
  );

export default router;