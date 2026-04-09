import AppError from "@/utils/appError";
import { IChatRepository } from "./chat.repository";
import { MessageResponseDto, ChatResponseDto } from "./chat.response";
import { SendMessageDto } from "./chat.request";
import { getIO } from "@/config/socket";
import { getCache, setCache, deleteCacheByPattern } from "@/utils/cache";

export interface IChatService {
  userSendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto>;
  adminSendMessage(
    adminId: string,
    chatId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto>;
  getAdminChatList(query: any): Promise<any>;
  getChatHistory(chatId: string, query: any): Promise<any>;
  getMyChat(userId: string): Promise<ChatResponseDto>;
}

export class ChatService implements IChatService {
  private readonly CACHE_KEY = "chats";

  constructor(private readonly chatRepo: IChatRepository) {}

  async userSendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const chat = await this.chatRepo.getOrCreateChat(userId);

    const message = await this.chatRepo.createMessage({
      chatId: chat.id,
      senderId: userId,
      senderRole: "user",
      content: dto.content,
    });

    const response = MessageResponseDto.from(message);

    // Emit vào room chat cụ thể (user + admin đã join room này)
    getIO().to(`chat:${chat.id}`).emit("chat:new_message", response);

    // Notify riêng cho admin inbox biết có tin mới (để highlight conversation)
    getIO()
      .to("chat:admin")
      .emit("chat:inbox_update", {
        chatId: chat.id,
        lastMessage: { content: dto.content, createdAt: response.createdAt },
        fromUserId: userId,
      });

    await deleteCacheByPattern(`${this.CACHE_KEY}:admin:*`);

    return response;
  }

  async adminSendMessage(
    adminId: string,
    chatId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const chat = await this.chatRepo.findById(chatId);
    if (!chat) throw new AppError("Cuộc hội thoại không tồn tại", 404);

    const message = await this.chatRepo.createMessage({
      chatId,
      senderId: adminId,
      senderRole: "admin",
      content: dto.content,
    });

    const response = MessageResponseDto.from(message);

    // Emit vào room chat — user đang mở chat sẽ nhận được ngay
    getIO().to(`chat:${chatId}`).emit("chat:new_message", response);

    // Notify thẳng vào room của user (trường hợp user chưa join room chat)
    getIO().to(`user:${chat.userId}`).emit("chat:notification", {
      chatId,
      message: dto.content,
    });

    await deleteCacheByPattern(`${this.CACHE_KEY}:admin:*`);

    return response;
  }

  async getAdminChatList(query: any) {
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
}
