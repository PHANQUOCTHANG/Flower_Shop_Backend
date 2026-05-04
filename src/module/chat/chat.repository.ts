import { BaseQuery } from "@/utils/query";
import { PrismaClient, Chat, Message } from "@prisma/client";
import { AIService } from "@/module/chat/ai.service";

export interface IChatRepository {
  getOrCreateChat(userId: string, adminId?: string | null): Promise<Chat>;
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

  async getOrCreateChat(
    userId: string,
    adminId: string | null = null,
  ): Promise<Chat> {
    const whereCondition: any = { userId };

    if (adminId === AIService.AI_ID) {
      // Tìm chat của AI
      whereCondition.adminId = AIService.AI_ID;
    } else {
      // Tìm chat với Admin (adminId = null hoặc là ID của Admin thật, loại trừ AI)
      whereCondition.OR = [
        { adminId: null },
        { adminId: { not: AIService.AI_ID } },
      ];
    }

    const existing = await this.prisma.chat.findFirst({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
    });

    if (existing) return existing;

    return this.prisma.chat.create({
      data: { userId, adminId, status: "open" },
    });
  }

  async findById(chatId: string): Promise<Chat | null> {
    return this.prisma.chat.findUnique({ where: { id: chatId } });
  }

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
          // Chỉ cập nhật adminId khi người gửi là admin thật (không phải AI)
          ...(data.senderRole === "admin" &&
          data.senderId !== AIService.AI_ID
            ? { adminId: data.senderId }
            : {}),
        },
      });

      return message;
    });
  }

  async getMessages(chatId: string, query: any) {
    const limit = Math.min(Number(query.limit) || 20, 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const cursor = query.cursor;

    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        ...(cursor && {
          createdAt: { lt: new Date(cursor) },
        }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: cursor ? 0 : (page - 1) * limit,
    });

    const total = await this.prisma.message.count({ where: { chatId } });
    const totalPages = Math.ceil(total / limit);

    return {
      data: messages.reverse(),
      nextCursor: messages.length
        ? messages[messages.length - 1].createdAt
        : null,
      hasMore: messages.length === limit && page < totalPages,
      meta: { total, page, limit, totalPages },
    };
  }

  async findAll(query: BaseQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = 10;

    const where: any = {
      messages: { some: {} },
      // FIX #2: Loại trừ chat AI khỏi inbox admin, nhưng vẫn phải giữ lại các chat chưa có admin (adminId = null)
      OR: [
        { adminId: null },
        { adminId: { not: AIService.AI_ID } },
      ],
    };

    if (query.search) {
      where.user = {
        fullName: { contains: query.search, mode: "insensitive" },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.chat.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { fullName: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
      }),
      this.prisma.chat.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markMessagesAsRead(chatId: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: {
        chatId,
        // Chỉ đánh dấu đã đọc cho tin nhắn của user (không phải admin hay AI)
        senderRole: { notIn: ["admin", "ai"] },
        isRead: false,
      },
      data: { isRead: true },
    });
  }
}
