import { BaseQuery } from "@/utils/query";
import { PrismaClient, Chat, Message } from "@prisma/client";

// Định nghĩa Interface cho Repository
export interface IChatRepository {
  getOrCreateChat(userId: string): Promise<Chat>;
  createMessage(data: {
    chatId: string;
    senderId: string;
    senderRole: string;
    content: string;
  }): Promise<Message>;
  getMessages(chatId: string, query: any): Promise<any>;
  findAll(query: BaseQuery): Promise<any>;
  findById(chatId: string): Promise<Chat | null>;
  markMessagesAsRead(chatId: string): Promise<void>;
}

export class ChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Lấy hoặc tạo mới cuộc hội thoại của User
  async getOrCreateChat(userId: string): Promise<Chat> {
    const existing = await this.prisma.chat.findFirst({ where: { userId } });
    if (existing) return existing;

    return this.prisma.chat.create({
      data: { userId, status: "open" },
    });
  }

  // Tìm cuộc hội thoại theo ID
  async findById(chatId: string): Promise<Chat | null> {
    return this.prisma.chat.findUnique({ where: { id: chatId } });
  }

  // Tạo tin nhắn và cập nhật thời gian phản hồi cuối (Transaction)
  async createMessage(data: {
    chatId: string;
    senderId: string;
    senderRole: string;
    content: string;
  }): Promise<Message> {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({ data });

      await tx.chat.update({
        where: { id: data.chatId },
        data: {
          lastMessageAt: new Date(),
          ...(data.senderRole === "admin" ? { adminId: data.senderId } : {}),
        },
      });

      return message;
    });
  }

  // Lấy lịch sử tin nhắn phân trang
  async getMessages(chatId: string, query: any) {
    const limit = Math.min(Number(query.limit) || 20, 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const cursor = query.cursor; // createdAt hoặc messageId

    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        ...(cursor && {
          createdAt: {
            lt: new Date(cursor), // lấy tin cũ hơn
          },
        }),
      },
      orderBy: {
        createdAt: "desc", // mới -> cũ
      },
      take: limit,
      skip: cursor ? 0 : (page - 1) * limit, // pagination nếu không dùng cursor
    });

    // Đếm tổng số tin để tính totalPages
    const total = await this.prisma.message.count({ where: { chatId } });
    const totalPages = Math.ceil(total / limit);

    return {
      data: messages.reverse(), // FE hiển thị cũ -> mới
      nextCursor: messages.length
        ? messages[messages.length - 1].createdAt
        : null,
      hasMore: messages.length === limit && page < totalPages,
      // Meta for pagination
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  // Danh sách chat dành cho Admin
  async findAll(query: BaseQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = 10;

    const where: any = {
      messages: {
        some: {}, // Chỉ lấy những chat có ít nhất 1 tin nhắn
      },
    };

    // Filter by user name
    if (query.search) {
      where.user = {
        fullName: {
          contains: query.search,
          mode: "insensitive",
        },
      };
    }

    const data = await this.prisma.chat.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { fullName: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    return { data };
  }

  // Đánh dấu tất cả tin nhắn của user trong chat là đã đọc
  async markMessagesAsRead(chatId: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: {
        chatId,
        senderRole: { not: "admin" },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }
}
