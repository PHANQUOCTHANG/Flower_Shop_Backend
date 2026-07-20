import { Request, Response } from "express";
import { vnpayService, orderService } from "@/config/container";
import asyncHandler from "@/utils/asyncHandler";
import logger from "@/utils/logger";

/**
 * [GET] /api/v1/vnpay/return
 * VNPay redirect user về đây sau khi thanh toán xong
 * → Verify checksum → xác nhận thanh toán → redirect user về frontend /order-completed
 */
export const vnpayReturn = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as Record<string, string>;
  const result = vnpayService.verifyReturnUrl(query);

  // Lấy CLIENT_URL từ env (lấy URL đầu tiên trong danh sách)
  const clientUrls = (process.env.CLIENT_URL || "http://localhost:3000").split(",");
  const clientUrl = clientUrls[0].trim();

  if (result.isValid && result.responseCode === "00") {
    // Thanh toán thành công → xác nhận đơn hàng (đề phòng IPN chưa tới)
    try {
      await orderService.confirmVnpayPayment(result.orderId);
      logger.info(`[VNPay Return] Thanh toán thành công — orderId: ${result.orderId}`);
    } catch (error: any) {
      // Nếu đã confirm rồi (IPN đến trước) thì bỏ qua
      logger.info(`[VNPay Return] Order đã được xử lý trước đó — orderId: ${result.orderId}`);
    }
    return res.redirect(`${clientUrl}/order-completed?id=${result.orderId}&vnpay=success`);
  } else {
    // Thanh toán thất bại hoặc bị hủy
    logger.warn(`[VNPay Return] Thanh toán thất bại — orderId: ${result.orderId}, responseCode: ${result.responseCode}`);
    return res.redirect(`${clientUrl}/order-completed?id=${result.orderId}&vnpay=failed&code=${result.responseCode}`);
  }
});

/**
 * [GET] /api/v1/vnpay/ipn
 * VNPay gọi server-to-server để thông báo kết quả thanh toán
 * → Verify checksum → xác nhận thanh toán → cập nhật DB, gửi email, thông báo admin
 */
export const vnpayIpn = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as Record<string, string>;
  const result = vnpayService.verifyIpn(query);

  if (!result.isValid) {
    logger.warn(`[VNPay IPN] Checksum không hợp lệ — orderId: ${result.orderId}`);
    return res.status(200).json({ RspCode: "97", Message: "Checksum failed" });
  }

  if (result.responseCode === "00") {
    // Thanh toán thành công → xác nhận đơn hàng hoàn tất
    try {
      await orderService.confirmVnpayPayment(result.orderId);
      logger.info(`[VNPay IPN] Xác nhận thanh toán thành công — orderId: ${result.orderId}, transactionNo: ${result.transactionNo}`);
      return res.status(200).json({ RspCode: "00", Message: "Success" });
    } catch (error: any) {
      logger.error(`[VNPay IPN] Lỗi xử lý — orderId: ${result.orderId}: ${error.message}`);
      return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
    }
  } else {
    // Thanh toán thất bại — không cập nhật gì
    logger.warn(`[VNPay IPN] Giao dịch thất bại — orderId: ${result.orderId}, responseCode: ${result.responseCode}`);
    return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
  }
});

