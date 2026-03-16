import { z } from "zod";

// [Schema] Gửi tin nhắn mới
export const SendMessageSchema = z.object({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, "Nội dung tin nhắn không được để trống")
      .max(2000, "Tin nhắn không được quá 2000 ký tự"),
  }),
});

// [Schema] Admin cập nhật trạng thái hoặc gán admin quản lý
export const UpdateChatSchema = z.object({
  body: z.object({
    status: z.enum(["open", "closed", "archived"]).optional(),
    adminId: z.string().optional(),
  }),
});

// [Schema] Validate UUID cho params
export const ChatIdParamSchema = z.object({
  id: z.string().uuid("ID cuộc hội thoại không hợp lệ"),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>["body"];
export type UpdateChatDto = z.infer<typeof UpdateChatSchema>["body"];