import { z } from "zod";

// [Schema] Validate UUID cho ID trên URL (Params)
export const ChatIdParamSchema = z.object({
  id: z.string().uuid("ID cuộc hội thoại không hợp lệ"),
});

// Schema gửi tin nhắn (Dùng chung cho cả User và Admin)
export const SendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Nội dung không được để trống")
    .max(2000, "Tin nhắn tối đa 2000 ký tự"),
});

// Schema cập nhật hội thoại (Chỉ dành cho Admin)
export const UpdateChatSchema = z.object({
  status: z.enum(["open", "closed", "archived"]).optional(),
  adminId: z.string().uuid().optional(),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>;
export type UpdateChatDto = z.infer<typeof UpdateChatSchema>;
