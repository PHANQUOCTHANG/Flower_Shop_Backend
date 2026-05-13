import { Router } from "express";
import * as chatController from "./chat.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { SendMessageSchema, SendAIMessageSchema, ChatIdParamSchema } from "./chat.request";
import { requireRole } from "@/middleware/auth.middleware";
import { uploadChatMedia } from "@/middleware/upload.middleware";

const router = Router();

// --- ROUTES CHO USER ---

// Lấy thông tin phòng chat với admin
router.get("/me", chatController.getMyChat);

// Gửi tin nhắn cho admin (hỗ trợ kèm file)
router.post(
  "/me/messages",
  validationMiddleware(SendMessageSchema),
  chatController.userSendMessage,
);

// Chat với AI (đặt TRƯỚC /:id để không bị route conflict)
router.get("/ai/me", chatController.getMyAIChat);
router.post(
  "/ai/messages",
  validationMiddleware(SendAIMessageSchema), // Schema riêng cho AI: tối đa 500 ký tự
  chatController.userSendMessageToAI,
);

// Upload media cho chat (cả user và admin)
router.post("/upload", uploadChatMedia, chatController.uploadChatMedia);

// --- ROUTES CHO ADMIN ---

// Lấy danh sách inbox (không bao gồm AI chat — đã filter ở repository)
router.get(
  "/admin/list",
  requireRole("ADMIN"),
  chatController.getAdminChatList,
);

// Phản hồi tin nhắn (hỗ trợ kèm file)
router.post(
  "/:id/messages",
  requireRole("ADMIN"),
  validationMiddleware(ChatIdParamSchema, "params"),
  validationMiddleware(SendMessageSchema),
  chatController.adminSendMessage,
);

// Đánh dấu đã đọc
router.patch(
  "/:id/read",
  requireRole("ADMIN"),
  validationMiddleware(ChatIdParamSchema, "params"),
  chatController.markAsRead,
);

// Xem lịch sử tin nhắn (cả user lẫn admin, access control ở service/middleware)
router.get(
  "/:id/messages",
  validationMiddleware(ChatIdParamSchema, "params"),
  chatController.getChatHistory,
);

export default router;
