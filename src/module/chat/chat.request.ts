import { z } from "zod";

// [Schema] Validate UUID cho ID trên URL (Params)
export const ChatIdParamSchema = z.object({
  id: z.string().uuid("ID cuộc hội thoại không hợp lệ"),
});

// Schema gửi tin nhắn (dùng chung cho User và Admin chat thật)
// content tuỳ chọn khi có media
export const SendMessageSchema = z.object({
  content: z.string().trim().max(2000, "Tin nhắn tối đa 2000 ký tự").optional(),
  mediaUrl: z.string().url().optional(),
  mediaPublicId: z.string().optional(),
  mediaType: z.enum(["image", "video", "file"]).optional(),
  mediaName: z.string().optional(),
  mediaSize: z.number().optional(),
}).refine(
  (data) => !!data.content || !!data.mediaUrl,
  { message: "Tin nhắn phải có nội dung hoặc ínch media" }
);

// Schema gửi tin nhắn cho AI — content tối đa 500 ký tự để tiết kiệm token, media tùy chọn
export const SendAIMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .max(500, "Tin nhắn cho AI tối đa 500 ký tự")
    .optional(),
  mediaUrl: z.string().url().optional(),
  mediaPublicId: z.string().optional(),
  mediaType: z.enum(["image", "video", "file"]).optional(),
  mediaName: z.string().optional(),
  mediaSize: z.number().optional(),
}).refine(
  (data) => !!data.content || !!data.mediaUrl,
  { message: "Tin nhắn phải có nội dung hoặc đính kèm media" }
);

// Schema cập nhật hội thoại (Chỉ dành cho Admin)
export const UpdateChatSchema = z.object({
  status: z.enum(["open", "closed", "archived"]).optional(),
  adminId: z.string().uuid().optional(),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>;
export type SendAIMessageDto = z.infer<typeof SendAIMessageSchema>;
export type UpdateChatDto = z.infer<typeof UpdateChatSchema>;
