import { z } from "zod";

// Add to cart validation
export const addToCartSchema = z.object({
  productId: z
    .string({ message: "ID sản phẩm là bắt buộc" })
    .min(1, "ID sản phẩm không hợp lệ"),

  quantity: z
    .number({ message: "Số lượng là bắt buộc" })
    .int()
    .min(1, "Số lượng tối thiểu là 1"),
});

// Update quantity validation
export const updateQuantitySchema = z.object({
  productId: z.string({ message: "ID sản phẩm là bắt buộc" }),

  quantity: z
    .number({ message: "Số lượng là bắt buộc" })
    .int()
    .min(0, "Số lượng không được âm"), // 0 = remove from cart
});

// Type definitions
export type AddToCartRequest = z.infer<typeof addToCartSchema>;
export type UpdateQuantityRequest = z.infer<typeof updateQuantitySchema>;
