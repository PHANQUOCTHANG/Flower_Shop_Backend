import { Chat, Message } from "@prisma/client";

// Format dữ liệu cho từng tin nhắn
export class MessageResponseDto {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: Date;

  constructor(message: Message) {
    this.id = message.id;
    this.chatId = message.chatId;
    this.senderId = message.senderId;
    this.senderRole = message.senderRole;
    this.content = message.content;
    this.createdAt = message.createdAt;
  }

  static fromList(messages: Message[]) {
    return messages.map((m) => new MessageResponseDto(m));
  }
}

// Format dữ liệu cho cuộc hội thoại
export class ChatResponseDto {
  id: string;
  userId: string;
  adminId: string | null;
  status: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  
  // Thông tin thêm (nếu có include)
  user?: { fullName: string; avatarUrl: string | null };
  messages?: MessageResponseDto[];

  constructor(chat: any) {
    this.id = chat.id;
    this.userId = chat.userId;
    this.adminId = chat.adminId;
    this.status = chat.status;
    this.lastMessageAt = chat.lastMessageAt;
    this.createdAt = chat.createdAt;

    if (chat.user) {
      this.user = {
        fullName: chat.user.fullName,
        avatarUrl: chat.user.avatarUrl,
      };
    }

    if (chat.messages) {
      this.messages = MessageResponseDto.fromList(chat.messages);
    }
  }

  static fromList(chats: any[]) {
    return chats.map((c) => new ChatResponseDto(c));
  }
}