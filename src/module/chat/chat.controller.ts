import { Request, Response } from "express";
import { chatService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import asyncHandler from "@/utils/asyncHandler";
import { getUserId } from "@/helpers/getUserId";
import { BaseQuery, normalizeQuery } from "@/utils/query";

// [POST] /api/v1/chats/me/messages
// Khách hàng gửi tin nhắn vào cuộc hội thoại của chính mình
export const userSendMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req); // Lấy từ Middleware Auth (JWT)
  const data = await chatService.userSendMessage(userId, req.body);

  return res
    .status(201)
    .json(ApiResponse.success(data, "Gửi tin nhắn thành công"));
});

// [POST] /api/v1/chats/:id/messages
// Admin gửi tin nhắn phản hồi cho khách hàng
export const adminSendMessage = asyncHandler(async (req: Request, res: Response) => {
  const adminId = getUserId(req);
  const chatId = req.params.id as string;
  const data = await chatService.adminSendMessage(adminId, chatId, req.body);

  return res
    .status(201)
    .json(ApiResponse.success(data, "Admin phản hồi thành công"));
});

// [GET] /api/v1/chats/admin/list
// Admin lấy danh sách tất cả các cuộc hội thoại (Inbox list)
export const getAdminChatList = asyncHandler(async (req: Request, res: Response) => {
  const query : BaseQuery = normalizeQuery(req.query);
  const result = await chatService.getAdminChatList(query);

  return res
    .status(200)
    .json(ApiResponse.paginate(result));
});

// [GET] /api/v1/chats/:id/messages
// Lấy lịch sử tin nhắn của một cuộc hội thoại
export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const chatId = req.params.id as string;
  const query = req.query;
  const result = await chatService.getChatHistory(chatId, query);

  return res
    .status(200)
    .json(ApiResponse.paginate(result));
});

// [GET] /api/v1/chats/me
// User lấy thông tin phòng chat của mình (để lấy ID phòng tham gia Socket)
export const getMyChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const data = await chatService.getMyChat(userId);

  return res
    .status(200)
    .json(ApiResponse.success(data));
});

// [PATCH] /api/v1/chats/:id/read
// Admin đánh dấu cuộc hội thoại đã đọc
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const chatId = req.params.id as string;
  await chatService.markAsRead(chatId);

  return res
    .status(200)
    .json(ApiResponse.success(null, "Đánh dấu đã đọc thành công"));
});