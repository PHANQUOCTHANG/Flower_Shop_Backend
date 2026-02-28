import { emailService } from "@/config/container";
import { IEmailData } from "@/interface/email.interface";
import asyncHandler from "@/utils/asyncHandler";
import { Request, Response } from "express";

// POST | /api/v1/email/send | Gửi email thông báo chung
export const sendEmail = asyncHandler(async (req: Request, res: Response) => {
  const emailData: IEmailData = {
    to: req.body.email,
    subject: req.body.subject || "Xác minh tài khoản",
    body: req.body.body || "Vui lòng xác minh tài khoản của bạn.",
    name: req.body.name,
    verificationLink: req.body.link,
  };

  // Gọi hàm sendGeneral đã refactor trong EmailService
  await emailService.sendGeneral(emailData);

  res.status(200).json({
    status: "success",
    message: "Email đã được gửi thành công",
  });
});
