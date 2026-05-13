import AppError from "@/utils/appError";
import { IChatRepository } from "./chat.repository";
import { MessageResponseDto, ChatResponseDto } from "./chat.response";
import { getIO } from "@/config/socket";
import { getCache, setCache, deleteCacheByPattern } from "@/utils/cache";
import { BaseQuery } from "@/utils/query";
import { AIService } from "@/module/chat/ai.service";
import { PrismaClient } from "@prisma/client";

export interface IChatService {
  userSendMessage(
    userId: string,
    dto: { content?: string; mediaUrl?: string; mediaPublicId?: string; mediaType?: string; mediaName?: string; mediaSize?: number },
  ): Promise<MessageResponseDto>;
  adminSendMessage(
    adminId: string,
    chatId: string,
    dto: { content?: string; mediaUrl?: string; mediaPublicId?: string; mediaType?: string; mediaName?: string; mediaSize?: number },
  ): Promise<MessageResponseDto>;
  getAdminChatList(query: BaseQuery): Promise<any>;
  getChatHistory(chatId: string, query: any): Promise<any>;
  getMyChat(userId: string): Promise<ChatResponseDto>;
  markAsRead(chatId: string): Promise<void>;
  userSendMessageToAI(
    userId: string,
    dto: { content?: string; mediaUrl?: string; mediaPublicId?: string; mediaType?: string; mediaName?: string; mediaSize?: number },
  ): Promise<MessageResponseDto>;
  getMyAIChat(userId: string): Promise<ChatResponseDto>;
}

export class ChatService implements IChatService {
  private readonly CACHE_KEY = "chats";

  // FIX #4: Nhận prisma qua constructor để dùng cùng instance với repository
  constructor(
    private readonly chatRepo: IChatRepository,
    private readonly prisma: PrismaClient,
  ) {}

  async userSendMessage(
    userId: string,
    dto: { content?: string; mediaUrl?: string; mediaPublicId?: string; mediaType?: string; mediaName?: string; mediaSize?: number },
  ): Promise<MessageResponseDto> {
    const chat = await this.chatRepo.getOrCreateChat(userId);

    const message = await this.chatRepo.createMessage({
      chatId: chat.id,
      senderId: userId,
      senderRole: "user",
      content: dto.content,
      mediaUrl: dto.mediaUrl,
      mediaPublicId: dto.mediaPublicId,
      mediaType: dto.mediaType,
      mediaName: dto.mediaName,
      mediaSize: dto.mediaSize,
    });

    const response = MessageResponseDto.from(message);

    getIO().to(`chat:${chat.id}`).emit("chat:new_message", response);
    getIO()
      .to("chat:admin")
      .emit("chat:inbox_update", {
        chatId: chat.id,
        lastMessage: { 
          content: dto.content || "[Đính kèm]", 
          createdAt: response.createdAt,
          mediaUrl: response.mediaUrl,
          mediaType: response.mediaType,
        },
        fromUserId: userId,
      });

    await deleteCacheByPattern(`${this.CACHE_KEY}:admin:*`);
    return response;
  }

  async adminSendMessage(
    adminId: string,
    chatId: string,
    dto: { content?: string; mediaUrl?: string; mediaPublicId?: string; mediaType?: string; mediaName?: string; mediaSize?: number },
  ): Promise<MessageResponseDto> {
    const chat = await this.chatRepo.findById(chatId);
    if (!chat) throw new AppError("Cuộc hội thoại không tồn tại", 404);

    const message = await this.chatRepo.createMessage({
      chatId,
      senderId: adminId,
      senderRole: "admin",
      content: dto.content,
      mediaUrl: dto.mediaUrl,
      mediaPublicId: dto.mediaPublicId,
      mediaType: dto.mediaType,
      mediaName: dto.mediaName,
      mediaSize: dto.mediaSize,
    });

    const response = MessageResponseDto.from(message);

    getIO().to(`chat:${chatId}`).emit("chat:new_message", response);
    getIO().to(`user:${chat.userId}`).emit("chat:notification", {
      chatId,
      message: dto.content || "[Đính kèm]",
    });

    getIO()
      .to("chat:admin")
      .emit("chat:inbox_update", {
        chatId,
        lastMessage: { 
          content: dto.content || "[Đính kèm]", 
          createdAt: response.createdAt,
          mediaUrl: response.mediaUrl,
          mediaType: response.mediaType,
        },
        fromUserId: adminId,
      });

    await deleteCacheByPattern(`${this.CACHE_KEY}:admin:*`);
    return response;
  }

  async getAdminChatList(query: BaseQuery) {
    const cacheKey = `${this.CACHE_KEY}:admin:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.chatRepo.findAll(query);
    const response = {
      ...result,
      data: ChatResponseDto.fromList(result.data),
    };

    await setCache(cacheKey, response, 60);
    return response;
  }

  async getChatHistory(chatId: string, query: any) {
    const result = await this.chatRepo.getMessages(chatId, query);
    return {
      ...result,
      data: MessageResponseDto.fromList(result.data),
    };
  }

  async getMyChat(userId: string): Promise<ChatResponseDto> {
    const chat = await this.chatRepo.getOrCreateChat(userId);
    return ChatResponseDto.from(chat);
  }

  async markAsRead(chatId: string): Promise<void> {
    await this.chatRepo.markMessagesAsRead(chatId);
    await deleteCacheByPattern(`${this.CACHE_KEY}:admin:*`);
  }

  async userSendMessageToAI(
    userId: string,
    dto: { content?: string; mediaUrl?: string; mediaPublicId?: string; mediaType?: string; mediaName?: string; mediaSize?: number },
  ): Promise<MessageResponseDto> {
    const chat = await this.chatRepo.getOrCreateChat(userId, AIService.AI_ID);

    // 1. Kiểm tra rate limit trước khi gọi AI
    const limited = await AIService.isRateLimited(userId);
    if (limited) {
      const userMsg = await this.chatRepo.createMessage({
        chatId: chat.id,
        senderId: userId,
        senderRole: "user",
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        mediaPublicId: dto.mediaPublicId,
        mediaType: dto.mediaType,
        mediaName: dto.mediaName,
        mediaSize: dto.mediaSize,
      });
      const userResponse = MessageResponseDto.from(userMsg);
      getIO().to(`chat:${chat.id}`).emit("chat:new_message", userResponse);

      const rateLimitMsg = await this.chatRepo.createMessage({
        chatId: chat.id,
        senderId: AIService.AI_ID,
        senderRole: "ai",
        content: "Bạn đang nhắn quá nhanh! Vui lòng chờ một chút rồi thử lại nhé 🌸",
      });
      getIO()
        .to(`chat:${chat.id}`)
        .emit("chat:new_message", MessageResponseDto.from(rateLimitMsg));

      return userResponse;
    }

    // 2. Lưu tin nhắn user (bao gồm media nếu có)
    const userMsg = await this.chatRepo.createMessage({
      chatId: chat.id,
      senderId: userId,
      senderRole: "user",
      content: dto.content,
      mediaUrl: dto.mediaUrl,
      mediaPublicId: dto.mediaPublicId,
      mediaType: dto.mediaType,
      mediaName: dto.mediaName,
      mediaSize: dto.mediaSize,
    });

    const userResponse = MessageResponseDto.from(userMsg);
    getIO().to(`chat:${chat.id}`).emit("chat:new_message", userResponse);

    // 3. Xây dựng nội dung gửi cho AI
    // Nếu có media, mô tả file để AI có thể phản hồi phù hợp
    let aiPrompt = dto.content || "";
    if (dto.mediaUrl) {
      const mediaDesc = dto.mediaType === "image"
        ? `[Người dùng gửi ảnh: ${dto.mediaName || "hình ảnh"}]`
        : dto.mediaType === "video"
        ? `[Người dùng gửi video: ${dto.mediaName || "video"}]`
        : `[Người dùng gửi file: ${dto.mediaName || "tài liệu"}]`;
      aiPrompt = aiPrompt ? `${aiPrompt}\n${mediaDesc}` : mediaDesc;
    }

    // 4. Gọi AI bất đồng bộ (non-blocking)
    AIService.getAIResponse(this.prisma, chat.id, aiPrompt, dto.mediaUrl, dto.mediaType)
      .then(async (aiContent) => {
        const aiMsg = await this.chatRepo.createMessage({
          chatId: chat.id,
          senderId: AIService.AI_ID,
          senderRole: "ai",
          content: aiContent,
        });
        getIO()
          .to(`chat:${chat.id}`)
          .emit("chat:new_message", MessageResponseDto.from(aiMsg));
      })
      .catch((error) => {
        console.error("[ChatService] AI pipeline failed for chatId:", chat.id, error);
        getIO().to(`chat:${chat.id}`).emit("chat:ai_error", {
          chatId: chat.id,
          message: "Rosie gặp sự cố, vui lòng thử lại!",
        });
      });

    return userResponse;
  }

  async getMyAIChat(userId: string): Promise<ChatResponseDto> {
    const chat = await this.chatRepo.getOrCreateChat(userId, AIService.AI_ID);
    return ChatResponseDto.from(chat);
  }
}
