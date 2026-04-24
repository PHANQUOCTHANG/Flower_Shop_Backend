import { z } from "zod";

// Schema tạo đánh giá — dùng z.coerce vì form-data gửi text fields dưới dạng string
export const CreateReviewSchema = z.object({
  productId: z.string().uuid("ID sản phẩm không hợp lệ"),
  orderId: z.string().uuid("ID đơn hàng không hợp lệ").optional(),
  // coerce: multipart/form-data gửi rating là string → ép kiểu sang number
  rating: z.coerce
    .number()
    .int()
    .min(1, "Đánh giá thấp nhất là 1 sao")
    .max(5, "Đánh giá cao nhất là 5 sao"),
  content: z.string().trim().max(1000, "Nội dung đánh giá không quá 1000 ký tự").optional(),
});

// Schema cập nhật trạng thái hiển thị (dành cho Admin)
export const UpdateReviewStatusSchema = z.object({
  isVisible: z.boolean(),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewStatusDto = z.infer<typeof UpdateReviewStatusSchema>;