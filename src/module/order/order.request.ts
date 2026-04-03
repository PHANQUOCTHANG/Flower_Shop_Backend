import { z } from "zod";

// Validation cho item
const OrderItemSchema = z.object({
  productId: z.string().uuid("ID sản phẩm không hợp lệ"),
  quantity: z
    .number()
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1"),
});

// Validation checkout
export const CheckoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên tối thiểu 1 ký tự")
    .max(255, "Tên tối đa 255 ký tự"),

  shippingAddress: z
    .string()
    .trim()
    .min(1, "Địa chỉ giao hàng tối thiểu 1 ký tự")
    .max(500, "Địa chỉ giao hàng tối đa 500 ký tự"),

  shippingPhone: z
    .string()
    .regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, "Số điện thoại không hợp lệ"),

  paymentMethod: z
    .string()
    .trim()
    .min(1, "Phương thức thanh toán không được để trống"),

  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").optional(),

  items: z.array(OrderItemSchema).min(1, "Đơn hàng phải có ít nhất 1 sản phẩm"),
});

// Validation cập nhật trạng thái
export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "processing",
    "shipping",
    "completed",
    "cancelled",
  ]),

  paymentStatus: z.enum(["unpaid", "paid", "refunded"]).optional(),
});

// Type DTO
export type CheckoutDto = z.infer<typeof CheckoutSchema>;
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;
