import { z } from "zod";

// 1. Schema gửi email để nhận OTP
export const sendOtpSchema = z.object({
  email: z
    .string()
    .email("Email phải là định dạng hợp lệ")
    .toLowerCase() // Chuyển về chữ thường để đồng bộ tìm kiếm
    .trim()
    .refine((email) => email.length > 0, "Email là bắt buộc"),
});

// 2. Schema xác thực OTP
export const verifyOtpSchema = z.object({
  email: z
    .string()
    .email("Email phải là định dạng hợp lệ")
    .toLowerCase()
    .trim()
    .refine((email) => email.length > 0, "Email là bắt buộc"),

  otp: z
    .string()
    .length(6, "Mã OTP phải có đúng 6 chữ số")
    .regex(/^\d+$/, "Mã OTP chỉ được chứa các chữ số")
    .refine((otp) => otp.length > 0, "Mã OTP là bắt buộc"),
});

// Trích xuất Type để sử dụng trong Service/Controller
export type SendOtpRequestDto = z.infer<typeof sendOtpSchema>;
export type VerifyOtpRequestDto = z.infer<typeof verifyOtpSchema>;
