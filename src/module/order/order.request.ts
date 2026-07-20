import { z } from "zod";

// Validation cho item
const OrderItemSchema = z.object({
  productId: z.string().min(1, "ID sản phẩm không được để trống"),
  quantity: z
    .number()
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1"),
  price: z.number().positive("Giá phải lớn hơn 0").optional(),
  subtotal: z.number().positive("Subtotal phải lớn hơn 0").optional(),
});

// Validation checkout
export const CheckoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên không được để trống")
    .max(255, "Tên tối đa 255 ký tự"),

  shippingAddress: z
    .string()
    .trim()
    .min(1, "Địa chỉ giao hàng không được để trống")
    .max(500, "Địa chỉ giao hàng tối đa 500 ký tự"),

  shippingPhone: z
    .string()
    .trim()
    .regex(
      /^(0|\+84)[35789][0-9]{8}$/,
      "Số điện thoại không hợp lệ (Ví dụ: 0912345678)",
    ),

  paymentMethod: z.enum(["bank", "cod", "vnpay"]).default("bank"),

  paymentStatus: z.enum(["unpaid", "paid"]).optional().default("unpaid"),

  totalPrice: z.number().positive("Tổng tiền phải lớn hơn 0").optional(),

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
