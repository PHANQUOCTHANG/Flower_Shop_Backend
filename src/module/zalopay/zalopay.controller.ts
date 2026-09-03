import { Request, Response } from "express";
import { zalopayService, orderService } from "@/config/container";
import asyncHandler from "@/utils/asyncHandler";
import logger from "@/utils/logger";
import { getUserId } from "@/helpers/getUserId";

/**
 * [POST] /api/v1/zalopay/callback
 * ZaloPay gọi server-to-server để thông báo kết quả thanh toán
 * → Verify mac → xác nhận thanh toán → cập nhật DB, gửi email, thông báo admin
 *
 * LƯU Ý: Luôn phải trả về đúng format {return_code, return_message} — kể cả khi
 * lỗi nội bộ — nếu không ZaloPay sẽ hiểu callback thất bại và tiếp tục gọi lại.
 */
export const zalopayCallback = asyncHandler(async (req: Request, res: Response) => {
  const result = zalopayService.verifyCallback(req.body);

  if (!result.isValid) {
    logger.warn(`[ZaloPay Callback] Mac không hợp lệ hoặc payload sai định dạng`);
    return res.status(200).json({ return_code: -1, return_message: "mac not equal" });
  }

  try {
    await orderService.confirmOnlinePayment("zalopay", result.orderId, result.amount);
    logger.info(`[ZaloPay Callback] Xác nhận thanh toán thành công — orderId: ${result.orderId}, appTransId: ${result.appTransId}`);
    return res.status(200).json({ return_code: 1, return_message: "success" });
  } catch (error: any) {
    logger.error(`[ZaloPay Callback] Lỗi xử lý — orderId: ${result.orderId}: ${error.message}`);
    // return_code: 0 → ZaloPay hiểu là lỗi tạm thời và sẽ gọi lại callback sau
    return res.status(200).json({ return_code: 0, return_message: error.message });
  }
});

/**
 * [GET] /api/v1/zalopay/query/:orderId
 * FE gọi chủ động để hỏi trạng thái thanh toán — dùng làm phương án dự phòng
 * khi callback server-to-server chưa tới (đặc biệt quan trọng khi test bằng
 * app_id demo dùng chung, không thể tự cấu hình callback URL trỏ về server này).
 */
export const zalopayQueryStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const orderId = req.params.orderId as string;

  // findById đã kiểm tra quyền sở hữu — tự throw 404 nếu đơn không thuộc user này
  const order = await orderService.findById(orderId, userId);

  // Đơn không còn ở trạng thái chờ thanh toán → không cần hỏi ZaloPay nữa
  if (order.status !== "pending_payment") {
    return res.json({
      success: true,
      data: { status: order.status, paymentStatus: order.paymentStatus },
    });
  }

  const queryResult = await zalopayService.queryOrderStatus(orderId, new Date(order.createdAt));

  if (queryResult.isPaid) {
    const updated = await orderService.confirmOnlinePayment("zalopay", orderId, queryResult.amount);
    logger.info(`[ZaloPay Query] Xác nhận thanh toán qua polling — orderId: ${orderId}`);
    return res.json({
      success: true,
      data: { status: updated.status, paymentStatus: updated.paymentStatus },
    });
  }

  return res.json({
    success: true,
    data: { status: order.status, paymentStatus: order.paymentStatus },
  });
});
