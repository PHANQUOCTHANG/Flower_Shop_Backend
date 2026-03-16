import { IChatRepository } from "./chat.repository";
import { SendMessageDto } from "./chat.request";
import { ChatResponseDto, MessageResponseDto } from "./chat.response";
import AppError from "@/utils/appError";

export class ChatService {
  constructor(private readonly chatRepo: IChatRepository) {}

  /**
   * Khách hàng gửi tin nhắn
   * Tự động tìm hoặc tạo cuộc hội thoại duy nhất của User đó
   */
  async userSendMessage(userId: string, dto: SendMessageDto) {
    // 1. Lấy hoặc tạo Chat ID (Đảm bảo 1 User - 1 Chat)
    const chat = await this.chatRepo.getOrCreateChat(userId);

    // 2. Gửi tin nhắn
    const message = await this.chatRepo.sendMessage({
      chatId: chat.id,
      senderId: userId,
      senderRole: "user",
      content: dto.content,
    });

    return new MessageResponseDto(message);
  }

  /**
   * Admin gửi tin nhắn phản hồi cho khách hàng
   */
  async adminSendMessage(adminId: string, chatId: string, dto: SendMessageDto) {
    // Lưu tin nhắn với role admin
    const message = await this.chatRepo.sendMessage({
      chatId,
      senderId: adminId,
      senderRole: "admin",
      content: dto.content,
    });

    return new MessageResponseDto(message);
  }

  /**
   * Lấy lịch sử tin nhắn của một cuộc hội thoại
   * Trả về dữ liệu đã được format qua DTO và phân trang
   */
  async getChatMessages(chatId: string, query: any) {
    const result = await this.chatRepo.getMessages(chatId, query);

    return {
      ...result,
      // Map dữ liệu qua DTO để trả về JSON chuẩn
      data: MessageResponseDto.fromList(result.data),
    };
  }

  /**
   * Admin lấy danh sách toàn bộ các cuộc hội thoại
   * Hiển thị kèm thông tin User và tin nhắn mới nhất (Preview)
   */
  async getAdminChatList(query: any) {
    const result = await this.chatRepo.findAll(query);

    return {
      ...result,
      data: ChatResponseDto.fromList(result.data),
    };
  }

  /**
   * Lấy thông tin cuộc hội thoại hiện tại của User
   * Dùng khi User load trang Chat để biết ID hội thoại của mình
   */
  async getMyChat(userId: string) {
    const chat = await this.chatRepo.getOrCreateChat(userId);
    return new ChatResponseDto(chat);
  }
}
