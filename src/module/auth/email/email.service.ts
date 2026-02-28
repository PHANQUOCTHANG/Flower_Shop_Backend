import nodemailer, { Transporter } from "nodemailer";
import AppError from "@/utils/appError";
import { IEmailData } from "@/interface/email.interface";

export interface IEmailService {
  send(to: string, subject: string, html: string): Promise<void>;
  sendGeneral(data: IEmailData): Promise<void>;
  sendOtp(to: string, otp: string): Promise<void>;
  sendWelcome(to: string, name: string): Promise<void>;
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
