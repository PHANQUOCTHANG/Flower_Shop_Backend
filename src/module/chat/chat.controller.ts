import { Request, Response } from "express";
import { chatService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import asyncHandler from "@/utils/asyncHandler";
import { getUserId } from "@/helpers/getUserId";
import { BaseQuery, normalizeQuery } from "@/utils/query";

// [POST] /api/v1/chats/me/messages
export const userSendMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await chatService.userSendMessage(userId, req.body);
    return res
      .status(201)
      .json(ApiResponse.success(data, "Gửi tin nhắn thành công"));
  },
);

// [POST] /api/v1/chats/:id/messages
export const adminSendMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = getUserId(req);
    const chatId = req.params.id as string;
    const data = await chatService.adminSendMessage(adminId, chatId, req.body);
    return res
      .status(201)
      .json(ApiResponse.success(data, "Admin phản hồi thành công"));
  },
);

// [GET] /api/v1/chats/admin/list
export const getAdminChatList = asyncHandler(
  async (req: Request, res: Response) => {
    const query: BaseQuery = normalizeQuery(req.query);
    const result = await chatService.getAdminChatList(query);
    return res.status(200).json(ApiResponse.paginate(result));
  },
);

// [GET] /api/v1/chats/:id/messages
export const getChatHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const chatId = req.params.id as string;
    const result = await chatService.getChatHistory(chatId, req.query);
    return res.status(200).json(ApiResponse.paginate(result));
  },
);

// [GET] /api/v1/chats/me
export const getMyChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const data = await chatService.getMyChat(userId);
  return res.status(200).json(ApiResponse.success(data));
});

// [PATCH] /api/v1/chats/:id/read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const chatId = req.params.id as string;
  await chatService.markAsRead(chatId);
  return res
    .status(200)
    .json(ApiResponse.success(null, "Đánh dấu đã đọc thành công"));
});

// [POST] /api/v1/chats/ai/messages
export const userSendMessageToAI = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const data = await chatService.userSendMessageToAI(userId, req.body);
    return res
      .status(201)
      .json(ApiResponse.success(data, "AI đã nhận tin nhắn"));
  },
);

// [GET] /api/v1/chats/ai/me
export const getMyAIChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const data = await chatService.getMyAIChat(userId);
  return res.status(200).json(ApiResponse.success(data));
});
