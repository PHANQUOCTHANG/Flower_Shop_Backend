import { Router } from "express";
import * as chatController from "./chat.controller";
import validationMiddleware from "@/middleware/validate.middleware";
import { SendMessageSchema, ChatIdParamSchema } from "./chat.request";
import { requireRole } from "@/middleware/auth.middleware";

const router = Router();

// Lấy thông tin phòng chat cá nhân
router.get("/me", chatController.getMyChat);

// Gửi tin nhắn (User)
router.post(
  "/me/messages",
  validationMiddleware(SendMessageSchema),
  chatController.userSendMessage,
);

// --- ROUTES CHO ADMIN ---

// Lấy danh sách inbox (Chỉ Admin)
router.get(
  "/admin/list",
  requireRole("ADMIN"),
  chatController.getAdminChatList,
);

// Phản hồi tin nhắn (Chỉ Admin)
router.post(
  "/:id/messages",
  requireRole("ADMIN"),
  validationMiddleware(ChatIdParamSchema, "params"),
  validationMiddleware(SendMessageSchema),
  chatController.adminSendMessage,
);

// Xem lịch sử tin nhắn (Dùng chung hoặc phân quyền tùy logic)
router.get(
  "/:id/messages",
  validationMiddleware(ChatIdParamSchema, "params"),
  chatController.getChatHistory,
);

export default router;
