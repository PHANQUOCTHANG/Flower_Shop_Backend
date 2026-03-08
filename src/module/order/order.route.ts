import { Router } from "express";
import * as orderCtrl from "@/module/order/order.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { CreateOrderRequestDto } from "@/module/order/order.request";

const router = Router();

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Tạo đơn hàng mới
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequestDto'
 *     responses:
 *       201:
 *         description: Đơn hàng đã được tạo thành công
 */
// URL: /api/v1/orders
router.post(
  "/",
  validationMiddleware(CreateOrderRequestDto),
  orderCtrl.createOrder,
);

/**
 * @swagger
 * /api/v1/orders/my-orders:
 *   get:
 *     summary: Lấy danh sách lịch sử đơn hàng của tôi
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng thành công
 */
// URL: /api/v1/orders/my-orders
router.get("/my-orders", orderCtrl.getMyOrders);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Chi tiết đơn hàng theo ID
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết đơn hàng
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
// URL: /api/v1/orders/:id
router.get("/:id", orderCtrl.getOrder);

export default router;
