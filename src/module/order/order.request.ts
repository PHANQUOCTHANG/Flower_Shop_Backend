import { z } from "zod";

// [Schema] Luồng khách hàng đặt hàng
export const CheckoutSchema = z.object({
  body: z.object({
    shippingAddress: z
      .string()
      .trim()
      .min(10, "Địa chỉ giao hàng tối thiểu 10 ký tự")
      .max(500, "Địa chỉ giao hàng tối đa 500 ký tự"),

    shippingPhone: z
      .string()
      .regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, "Số điện thoại không hợp lệ"),

    paymentMethod: z.enum(["COD", "BANKING", "VNPAY"], {
      message: "Phương thức thanh toán không hợp lệ",
    }),
  }),
});

// [Schema] Admin cập nhật trạng thái đơn hàng
export const UpdateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID đơn hàng không hợp lệ"),
  }),
  body: z.object({
    status: z.enum([
      "pending",
      "confirmed",
      "processing",
      "shipping",
      "delivered",
      "cancelled",
    ]),
    paymentStatus: z.enum(["unpaid", "paid", "refunded"]).optional(),
  }),
});

export type CheckoutDto = z.infer<typeof CheckoutSchema>["body"];