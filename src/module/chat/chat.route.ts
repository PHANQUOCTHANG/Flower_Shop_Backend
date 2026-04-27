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

// Xem lịch sử tin nhắn (Admin xem tất cả, User chỉ xem chat của mình — được kiểm soat ở service)
router.get(
  "/:id/messages",
  validationMiddleware(ChatIdParamSchema, "params"),
  chatController.getChatHistory,
);

// Đánh dấu đã đọc (Chỉ Admin)
router.patch(
  "/:id/read",
  requireRole("ADMIN"),
  validationMiddleware(ChatIdParamSchema, "params"),
  chatController.markAsRead,
);

export default router;
