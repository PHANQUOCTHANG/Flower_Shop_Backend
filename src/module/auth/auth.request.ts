import { z } from "zod";

// [UserRole] Enum từ Prisma: CUSTOMER | ADMIN | STAFF
const UserRoleEnum = z.enum(["CUSTOMER", "ADMIN", "STAFF"]);


// Request Đăng ký tài khoản
export const registerSchema = z.object({
  // Tên đầy đủ (full_name) - tối đa 150 ký tự theo DB
  fullName: z
    .string()
    .min(2, "Họ tên quá ngắn")
    .max(150, "Họ tên không được vượt quá 150 ký tự")
    .trim(),

  // Email duy nhất - chuẩn hóa về chữ thường
  email: z
    .string()
    .email("Định dạng email không hợp lệ")
    .max(150)
    .toLowerCase()
    .trim(),

  // Mật khẩu - tối thiểu 8 ký tự để đảm bảo bảo mật
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").max(255),

  // Số điện thoại - chỉ chứa số, tối đa 20 ký tự
  phone: z
    .string()
    .regex(/^[0-9]+$/, "Số điện thoại chỉ được chứa chữ số")
    .min(10, "Số điện thoại không hợp lệ")
    .max(20)
    .optional(),
});

// Request Đăng nhập
export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ").toLowerCase().trim(),

  password: z.string().min(1, "Mật khẩu không được để trống"),
  // Quyền người dùng - mặc định là CUSTOMER
  role: UserRoleEnum.default("CUSTOMER").optional(),
  // Ghi nhớ đăng nhập: true = refreshToken 14 ngày, false = 24 giờ
  rememberMe: z.boolean().default(false).optional(),
});

// Request làm mới Access Token
export const refreshTokenSchema = z.object({
  // Token từ bảng refresh_tokens
  refreshToken: z.string().min(1, "Token không hợp lệ"),
});

// Request Đặt lại mật khẩu bằng OTP
export const resetPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ").toLowerCase().trim(),

  // Mã OTP 6 số từ bảng otps
  otp: z
    .string()
    .length(6, "Mã OTP phải có đúng 6 chữ số")
    .regex(/^\d+$/, "Mã OTP chỉ bao gồm số"),

  // Mật khẩu mới cho người dùng
  newPassword: z.string().min(8, "Mật khẩu mới phải từ 8 ký tự").max(255),
});

// Request Thay đổi mật khẩu (khi người dùng đã đăng nhập)
export const changePasswordSchema = z
  .object({
    // Mật khẩu hiện tại - để xác minh người dùng
    currentPassword: z.string().min(1, "Mật khẩu hiện tại không được để trống"),

    // Mật khẩu mới - tối thiểu 8 ký tự
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
      .max(255),

    // Xác nhận mật khẩu mới
    confirmPassword: z.string().min(8, "Xác nhận mật khẩu không được để trống"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu mới và xác nhận mật khẩu không trùng khớp",
    path: ["confirmPassword"],
  });

// Xuất các Type để sử dụng ở tầng Controller/Service
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
