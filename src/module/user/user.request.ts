import { z } from "zod";
import { UserRole, AuthProvider } from "@prisma/client";

/**
 * Base schema dùng chung
 */
const userBase = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ tên tối thiểu 2 ký tự")
    .max(150, "Họ tên tối đa 150 ký tự"),

  email: z
    .string()
    .trim()
    .nonempty("Email là bắt buộc")
    .email("Email không đúng định dạng")
    .max(150, "Email tối đa 150 ký tự"),

  phone: z
    .string()
    .regex(/^[0-9+]+$/, "Số điện thoại chỉ chứa số hoặc +")
    .min(10, "SĐT tối thiểu 10 ký tự")
    .max(20, "SĐT tối đa 20 ký tự")
    .nullable()
    .optional(),

  password: z
    .string()
    .min(6, "Mật khẩu tối thiểu 6 ký tự")
    .max(255, "Mật khẩu tối đa 255 ký tự")
    .optional(),

  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER), // Role mặc định

  provider: z.nativeEnum(AuthProvider).default(AuthProvider.LOCAL), // Provider mặc định

  providerId: z.string().max(255).nullable().optional(),

  avatar: z.string().url("Avatar phải là URL hợp lệ").nullable().optional(),

  isActive: z.boolean().default(true),

  emailVerified: z.boolean().default(false),
});

/**
 * Tạo user
 */
export const CreateUserSchema = userBase
  .omit({ isActive: true, emailVerified: true }) // Không cho set 2 field này khi tạo
  .superRefine((data, ctx) => {
    // Nếu đăng ký LOCAL thì bắt buộc password
    if (data.provider === AuthProvider.LOCAL && !data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mật khẩu bắt buộc khi đăng ký bằng email",
        path: ["password"],
      });
    }
  });

/**
 * Update user (Admin)
 */
export const UpdateUserSchema = userBase
  .pick({
    fullName: true,
    phone: true,
    role: true,
    isActive: true,
    emailVerified: true,
    avatar: true,
    password: true,
  })
  .partial(); // Cho phép update từng phần

/**
 * Validate param ID
 */
export const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID phải là số hợp lệ"),
});

export type CreateUserRequestDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserRequestDto = z.infer<typeof UpdateUserSchema>;
