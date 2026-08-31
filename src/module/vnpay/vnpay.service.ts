import crypto from "crypto";

/**
 * Format Date → "yyyyMMddHHmmss" (yêu cầu của VNPay)
 */
function formatVnpayDate(date: Date): string {
  // Lấy timestamp UTC gốc và cộng cứng 7 tiếng (7 * 60 * 60 * 1000 milliseconds)
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    vnDate.getUTCFullYear().toString() +
    pad(vnDate.getUTCMonth() + 1) +
    pad(vnDate.getUTCDate()) +
    pad(vnDate.getUTCHours()) +
    pad(vnDate.getUTCMinutes()) +
    pad(vnDate.getUTCSeconds())
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VnpayPaymentParams {
  orderId: string;
  amount: number; // VNĐ (chưa nhân 100)
  orderInfo: string;
  ipAddress: string;
}

export interface VnpayVerifyResult {
  isValid: boolean;
  orderId: string;
  responseCode: string;
  transactionNo: string;
  amount: number;
}

export interface IVnpayService {
  createPaymentUrl(params: VnpayPaymentParams): string;
  verifyReturnUrl(query: Record<string, string>): VnpayVerifyResult;
  verifyIpn(query: Record<string, string>): VnpayVerifyResult;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class VnpayService implements IVnpayService {
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly vnpUrl: string;
  private readonly returnUrl: string;

  constructor() {
    this.tmnCode = process.env.VNP_TMN_CODE || "";
    this.hashSecret = process.env.VNP_HASH_SECRET || "";
    this.vnpUrl = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    this.returnUrl = process.env.VNP_RETURN_URL || "http://localhost:5000/api/v1/vnpay/return";

    if (!this.tmnCode || !this.hashSecret) {
      console.warn("[VnpayService] VNP_TMN_CODE hoặc VNP_HASH_SECRET chưa được cấu hình!");
    }
  }

  /**
   * Tạo URL thanh toán VNPay
   * Theo tài liệu VNPay v2.1.0: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
   */
  createPaymentUrl(params: VnpayPaymentParams): string {
    const { orderId, amount, orderInfo, ipAddress } = params;

    const now = new Date();
    const createDate = formatVnpayDate(now);
    const expireDate = formatVnpayDate(new Date(now.getTime() + 15 * 60 * 1000)); // +15 phút

    const vnpParams: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: "other",
      vnp_Amount: String(Math.round(amount * 100)), // VNPay yêu cầu nhân 100
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: ipAddress,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    // Sắp xếp params theo alphabet → tạo query string → ký HMAC-SHA512
    const sortedParams = this.sortObject(vnpParams);
    const signData = new URLSearchParams(sortedParams).toString();
    const hmac = crypto.createHmac("sha512", this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    // Thêm chữ ký vào URL
    sortedParams["vnp_SecureHash"] = signed;

    const paymentUrl = `${this.vnpUrl}?${new URLSearchParams(sortedParams).toString()}`;
    return paymentUrl;
  }

  /**
   * Xác minh Return URL (redirect từ VNPay về backend)
   */
  verifyReturnUrl(query: Record<string, string>): VnpayVerifyResult {
    return this.verifyChecksum(query);
  }

  /**
   * Xác minh IPN callback (server-to-server từ VNPay)
   */
  verifyIpn(query: Record<string, string>): VnpayVerifyResult {
    return this.verifyChecksum(query);
  }

  /**
   * Logic chung xác minh checksum VNPay
   */
  private verifyChecksum(query: Record<string, string>): VnpayVerifyResult {
    const secureHash = query["vnp_SecureHash"];

    // Xóa các trường hash khỏi object để tính lại checksum
    const verifyParams = { ...query };
    delete verifyParams["vnp_SecureHash"];
    delete verifyParams["vnp_SecureHashType"];

    const sortedParams = this.sortObject(verifyParams);
    const signData = new URLSearchParams(sortedParams).toString();
    const hmac = crypto.createHmac("sha512", this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    const isValid = this.safeCompare(secureHash, signed);

    return {
      isValid,
      orderId: query["vnp_TxnRef"] || "",
      responseCode: query["vnp_ResponseCode"] || "",
      transactionNo: query["vnp_TransactionNo"] || "",
      amount: Number(query["vnp_Amount"] || 0) / 100, // Chia lại 100
    };
  }

  /**
   * So sánh 2 chuỗi hash theo constant-time để tránh timing attack
   * (crypto.timingSafeEqual yêu cầu 2 buffer cùng độ dài, nên phải guard trước)
   */
  private safeCompare(a?: string, b?: string): boolean {
    if (!a || !b) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Sắp xếp object theo key alphabet (yêu cầu của VNPay)
   */
  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = obj[key];
    }
    return sorted;
  }
}
