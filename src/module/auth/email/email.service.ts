import nodemailer, { Transporter } from "nodemailer";
import AppError from "@/utils/appError";
import { IEmailData } from "@/module/auth/email/email.type";

export interface IEmailService {
  send(to: string, subject: string, html: string): Promise<void>;
  sendGeneral(data: IEmailData): Promise<void>;
  sendOtp(to: string, otp: string): Promise<void>;
  sendWelcome(to: string, name: string): Promise<void>;
  sendOrderConfirmation(to: string, orderData: any): Promise<void>;
}

export class EmailService implements IEmailService {
  private transporter: Transporter;
  private readonly senderEmail = process.env.EMAIL_USER;
  private readonly senderName =
    process.env.EMAIL_SENDER_NAME || "Clothes Store";

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: this.senderEmail,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Gửi email chung (General)
  async sendGeneral(data: IEmailData): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
        <h2>Xin chào ${data.name || "bạn"}!</h2>
        <p>${data.body}</p>
        ${
          data.verificationLink
            ? `<a href="${data.verificationLink}" style="background-color: #2c3e50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Xác minh</a>`
            : ""
        }
      </div>
    `;
    await this.send(data.to, data.subject, html);
  }

  // Gửi mã OTP
  async sendOtp(to: string, otp: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
        <h2>Mã xác nhận của bạn</h2>
        <p>Vui lòng sử dụng mã dưới đây để tiếp tục:</p>
        <h1 style="color: #2c3e50; letter-spacing: 5px;">${otp}</h1>
        <p>Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với người khác.</p>
      </div>
    `;
    await this.send(to, "Mã OTP Xác Thực", html);
  }

  // Gửi email chào mừng thành viên mới
  async sendWelcome(to: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
        <h1>Chào mừng ${name} đến với cửa hàng!</h1>
        <p>Cảm ơn bạn đã tạo tài khoản. Hãy bắt đầu mua sắm ngay hôm nay!</p>
      </div>
    `;
    await this.send(to, "Chào mừng thành viên mới", html);
  }

  // Gửi email xác nhận đơn hàng
  async sendOrderConfirmation(to: string, orderData: any): Promise<void> {
    const {
      orderId,
      customerName,
      totalPrice,
      shippingAddress,
      shippingPhone,
      items,
      createdAt,
    } = orderData;

    // Format ngày tạo đơn hàng
    const orderDate = new Date(createdAt).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Tạo danh sách sản phẩm
    const itemsHtml = items
      .map(
        (item: any) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; text-align: left;">${item.product?.name || "Sản phẩm"}</td>
        <td style="padding: 10px; text-align: center;">x${item.quantity}</td>
        <td style="padding: 10px; text-align: right;">${parseInt(String(item.price)).toLocaleString("vi-VN")}đ</td>
        <td style="padding: 10px; text-align: right; font-weight: bold;">${parseInt(String(item.subtotal)).toLocaleString("vi-VN")}đ</td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="background-color: #13ec5b; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Cảm ơn bạn đã đặt hàng!</h1>
        </div>

        <!-- Main content -->
        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #eee;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Xin chào <strong>${customerName}</strong>,
          </p>
          <p style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 20px;">
            Chúng tôi xin cảm ơn bạn đã tin tưởng và lựa chọn mua hàng từ cửa hàng chúng tôi. 
            Đơn hàng của bạn đã được tiếp nhận và sẽ được xử lý trong thời gian sớm nhất.
          </p>

          <!-- Order Details -->
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #eee;">
            <h2 style="color: #13ec5b; font-size: 18px; margin-top: 0; border-bottom: 2px solid #13ec5b; padding-bottom: 10px;">📋 Thông tin đơn hàng</h2>
            
            <div style="margin-top: 15px;">
              <p style="margin: 8px 0; color: #333;">
                <strong>Mã đơn hàng:</strong> <span style="color: #13ec5b; font-weight: bold; font-family: monospace;">${orderId}</span>
              </p>
              <p style="margin: 8px 0; color: #333;">
                <strong>Ngày đặt hàng:</strong> ${orderDate}
              </p>
              <p style="margin: 8px 0; color: #333;">
                <strong>Điện thoại:</strong> ${shippingPhone}
              </p>
              <p style="margin: 8px 0; color: #333;">
                <strong>Địa chỉ giao hàng:</strong> ${shippingAddress}
              </p>
            </div>
          </div>

          <!-- Items Table -->
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #eee;">
            <h2 style="color: #13ec5b; font-size: 18px; margin-top: 0; border-bottom: 2px solid #13ec5b; padding-bottom: 10px;">🛍️ Chi tiết sản phẩm</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr style="background-color: #f0f0f0; border-bottom: 2px solid #13ec5b;">
                  <th style="padding: 10px; text-align: left; font-weight: bold;">Sản phẩm</th>
                  <th style="padding: 10px; text-align: center; font-weight: bold;">Số lượng</th>
                  <th style="padding: 10px; text-align: right; font-weight: bold;">Giá</th>
                  <th style="padding: 10px; text-align: right; font-weight: bold;">Tổng</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Total -->
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #13ec5b;">
              <div style="display: flex; justify-content: flex-end; align-items: center; gap: 20px;">
                <span style="font-size: 18px; font-weight: bold; color: #333;">Tổng cộng:</span>
                <span style="font-size: 24px; font-weight: bold; color: #13ec5b;">${parseInt(String(totalPrice)).toLocaleString("vi-VN")}đ</span>
              </div>
            </div>
          </div>

          <!-- Tracking Info -->
          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #13ec5b; margin-bottom: 20px;">
            <h3 style="color: #2e7d32; margin-top: 0;">📍 Theo dõi đơn hàng</h3>
            <p style="color: #555; margin: 10px 0; line-height: 1.6;">
              Bạn có thể theo dõi trạng thái đơn hàng của mình bất cứ lúc nào trên website của chúng tôi. 
              Hãy sử dụng mã đơn hàng <strong style="color: #13ec5b;">${orderId}</strong> để tra cứu.
            </p>
            <a href="${process.env.FRONTEND_URL}/orders/${orderId}" style="display: inline-block; background-color: #13ec5b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px;">Xem chi tiết đơn hàng</a>
          </div>

          <!-- Support -->
          <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #eee; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 13px;">
              Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua hệ thống hỗ trợ trên website.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; border: 1px solid #eee; border-top: none;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            © 2026 Flower Store. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await this.send(to, `✨ Xác nhận đơn hàng #${orderId}`, html);
  }

  // Phương thức gửi lõi (Core send method)
  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.senderName}" <${this.senderEmail}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error("Email Service Error:", error);
      throw new AppError("Lỗi hệ thống khi gửi email.", 500);
    }
  }
}
