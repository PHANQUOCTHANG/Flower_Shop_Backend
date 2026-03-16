import { PrismaClient, Chat, Message, Prisma } from "@prisma/client";
import { IPaginatedResult } from "@/utils/query"; // Giả định util phân trang của bạn

export interface IChatRepository {
  getOrCreateChat(userId: string): Promise<Chat>;
  getMessages(chatId: string, query: any): Promise<IPaginatedResult<Message>>;
  sendMessage(data: any): Promise<Message>;
  findAll(query: any): Promise<IPaginatedResult<Chat>>;
}

export class ChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Lấy cuộc hội thoại duy nhất của User.
   * Nếu chưa có thì tự động tạo mới (Dùng upsert để an toàn)
   */
  async getOrCreateChat(userId: string): Promise<Chat> {
    return this.prisma.chat.upsert({
      where: { userId }, // Điều kiện: 1 User - 1 Chat
      update: {}, // Nếu tồn tại rồi thì không cập nhật gì
      create: {
        userId: userId,
        status: "open",
      },
    });
  }

  /**
   * Gửi tin nhắn và cập nhật lastMessageAt của Chat (Transaction)
   */
  async sendMessage(data: {
    chatId: string;
    senderId: string;
    senderRole: string;
    content: string;
  }): Promise<Message> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Tạo tin nhắn mới
      const message = await tx.message.create({
        data,
      });

      // 2. Cập nhật thời gian tin nhắn cuối cùng để sắp xếp danh sách chat
      await tx.chat.update({
        where: { id: data.chatId },
        data: {
          lastMessageAt: new Date(),
          // Nếu admin nhắn, tự động gán adminId vào cuộc hội thoại nếu chưa có
          ...(data.senderRole === "admin" ? { adminId: data.senderId } : {}),
        },
      });

      return message;
    });
  }

  /**
   * Lấy danh sách tin nhắn của một cuộc hội thoại (Phân trang)
   */
  async getMessages(chatId: string, query: { page?: number; limit?: number }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { chatId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" }, // Tin mới nhất lên đầu để dễ load more
      }),
      this.prisma.message.count({ where: { chatId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Dành cho Admin: Lấy danh sách tất cả các cuộc chat của khách hàng
   */
  async findAll(query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.ChatWhereInput = {};
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.chat.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { fullName: true, avatarUrl: true } },
          // Lấy tin nhắn cuối cùng để hiển thị preview giống Messenger
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: "desc" }, // Chat nào có tin mới nhất thì lên đầu
      }),
      this.prisma.chat.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
