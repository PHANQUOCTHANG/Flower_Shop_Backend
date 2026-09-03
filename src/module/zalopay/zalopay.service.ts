import crypto from "crypto";
import AppError from "@/utils/appError";

/**
 * Format ngày → "yyMMdd" theo giờ VN (yêu cầu của ZaloPay cho app_trans_id)
 */
function formatZalopayTransDate(date: Date): string {
  const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    vnDate.getUTCFullYear().toString().slice(2) +
    pad(vnDate.getUTCMonth() + 1) +
    pad(vnDate.getUTCDate())
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ZalopayPaymentParams {
  orderId: string;
  amount: number; // VNĐ nguyên (ZaloPay KHÔNG nhân 100 như VNPay)
  orderInfo: string;
}

export interface ZalopayCreateOrderResult {
  orderUrl: string;
  appTransId: string;
}

export interface ZalopayCallbackResult {
  isValid: boolean;
  orderId: string;
  appTransId: string;
  amount: number;
}

export interface ZalopayQueryResult {
  isPaid: boolean;
  isProcessing: boolean;
  amount: number;
}

export interface IZalopayService {
  createOrder(params: ZalopayPaymentParams): Promise<ZalopayCreateOrderResult>;
  verifyCallback(body: { data?: string; mac?: string }): ZalopayCallbackResult;
  queryOrderStatus(orderId: string, createdAt: Date): Promise<ZalopayQueryResult>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ZalopayService implements IZalopayService {
  private readonly appId: string;
  private readonly key1: string;
  private readonly key2: string;
  private readonly endpoint: string;
  private readonly queryEndpoint: string;
  private readonly redirectUrl: string;
  // app_user cố định — ZaloPay yêu cầu field này nhưng dự án không cần định danh
  // khách hàng thật với ZaloPay (đã có userId ở tầng Order riêng)
  private readonly appUser = "flowerweb";

  constructor() {
    this.appId = process.env.ZLP_APP_ID || "";
    this.key1 = process.env.ZLP_KEY1 || "";
    this.key2 = process.env.ZLP_KEY2 || "";
    this.endpoint = process.env.ZLP_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create";
    this.queryEndpoint = process.env.ZLP_QUERY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/query";
    this.redirectUrl = process.env.ZLP_REDIRECT_URL || "http://localhost:3000/order-completed";

    if (!this.appId || !this.key1 || !this.key2) {
      console.warn("[ZalopayService] ZLP_APP_ID/ZLP_KEY1/ZLP_KEY2 chưa được cấu hình!");
    }
  }

  /**
   * Tạo đơn hàng ZaloPay, trả về URL thanh toán (order_url)
   * Theo tài liệu ZaloPay sandbox v2: https://docs.zalopay.vn/v2/general/overview.html
   */
  async createOrder(params: ZalopayPaymentParams): Promise<ZalopayCreateOrderResult> {
    const { orderId, amount, orderInfo } = params;

    const now = new Date();
    const appTransId = this.buildAppTransId(orderId, now);
    const appTime = now.getTime();
    const roundedAmount = Math.round(amount);
    const item = JSON.stringify([]);
    // embed_data mang theo orderId thật để đọc lại chính xác ở callback,
    // không cần "giải mã ngược" app_trans_id (tránh sai lệch định dạng UUID).
    // redirecturl gắn kèm orderId — vì đây chỉ là điều hướng trình duyệt sau khi
    // thanh toán (không được ZaloPay ký/verify), nên KHÔNG dùng để xác nhận thanh
    // toán, chỉ giúp trang order-completed biết cần hiển thị đơn nào.
    const redirectUrlWithOrderId = `${this.redirectUrl}${this.redirectUrl.includes("?") ? "&" : "?"}id=${orderId}`;
    const embedData = JSON.stringify({ orderId, redirecturl: redirectUrlWithOrderId });

    const signData = [
      this.appId,
      appTransId,
      this.appUser,
      roundedAmount,
      appTime,
      embedData,
      item,
    ].join("|");
    const mac = crypto.createHmac("sha256", this.key1).update(signData).digest("hex");

    const body = new URLSearchParams({
      app_id: this.appId,
      app_trans_id: appTransId,
      app_user: this.appUser,
      app_time: String(appTime),
      amount: String(roundedAmount),
      item,
      embed_data: embedData,
      description: orderInfo,
      bank_code: "",
      mac,
    });

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const result = (await response.json()) as {
      return_code: number;
      return_message: string;
      order_url?: string;
    };

    if (result.return_code !== 1 || !result.order_url) {
      throw new AppError(`Tạo đơn ZaloPay thất bại: ${result.return_message}`, 502);
    }

    return { orderUrl: result.order_url, appTransId };
  }

  /**
   * Xác minh callback server-to-server từ ZaloPay
   */
  verifyCallback(body: { data?: string; mac?: string }): ZalopayCallbackResult {
    const { data, mac } = body;
    const invalid: ZalopayCallbackResult = { isValid: false, orderId: "", appTransId: "", amount: 0 };

    if (!data || !mac) return invalid;

    const expectedMac = crypto.createHmac("sha256", this.key2).update(data).digest("hex");
    if (!this.safeCompare(mac, expectedMac)) return invalid;

    try {
      const parsed = JSON.parse(data) as {
        app_trans_id: string;
        amount: number;
        embed_data?: string;
      };
      const embed = JSON.parse(parsed.embed_data || "{}") as { orderId?: string };

      return {
        isValid: true,
        orderId: embed.orderId || "",
        appTransId: parsed.app_trans_id,
        amount: Number(parsed.amount || 0),
      };
    } catch {
      return invalid;
    }
  }

  /**
   * Chủ động hỏi ZaloPay trạng thái giao dịch (dùng làm phương án dự phòng khi
   * callback chưa tới, hoặc khi test với app demo dùng chung không tự cấu hình
   * được callback URL trỏ về server của mình).
   * app_trans_id được tính lại từ orderId + createdAt của đơn hàng — không cần
   * lưu thêm cột nào trong DB.
   */
  async queryOrderStatus(orderId: string, createdAt: Date): Promise<ZalopayQueryResult> {
    const appTransId = this.buildAppTransId(orderId, createdAt);
    const signData = `${this.appId}|${appTransId}|${this.key1}`;
    const mac = crypto.createHmac("sha256", this.key1).update(signData).digest("hex");

    const body = new URLSearchParams({
      app_id: this.appId,
      app_trans_id: appTransId,
      mac,
    });

    const response = await fetch(this.queryEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const result = (await response.json()) as {
      return_code: number;
      amount?: number;
    };

    // return_code: 1 = giao dịch thành công, 2 = thất bại, 3 = chưa xác định/đang xử lý
    return {
      isPaid: result.return_code === 1,
      isProcessing: result.return_code === 3,
      amount: Number(result.amount || 0),
    };
  }

  /**
   * app_trans_id phải duy nhất theo ngày với ZaloPay — orderId (UUID) đã là duy nhất
   * nên ghép trực tiếp (bỏ dấu "-" cho gọn), không cần thêm timestamp.
   */
  private buildAppTransId(orderId: string, date: Date): string {
    return `${formatZalopayTransDate(date)}_${orderId.replace(/-/g, "")}`;
  }

  /**
   * So sánh 2 chuỗi hash theo constant-time để tránh timing attack
   */
  private safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
