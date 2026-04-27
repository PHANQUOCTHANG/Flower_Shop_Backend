import { ActivityLog, PrismaClient } from "@prisma/client";

export interface IActivityLogRepository {
  create(data: { type: string; message: string; data?: object }): Promise<ActivityLog>;
  findAll(query: { page?: number; limit?: number; type?: string }): Promise<{
    data: ActivityLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  markAsRead(id: string): Promise<ActivityLog | null>;
  markAllAsRead(): Promise<number>;
  countUnread(): Promise<number>;
}

export class ActivityLogRepository implements IActivityLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: { type: string; message: string; data?: object }): Promise<ActivityLog> {
    return this.prisma.activityLog.create({
      data: {
        type: data.type,
        message: data.message,
        data: data.data ?? undefined,
      },
    });
  }

  async findAll(query: { page?: number; limit?: number; type?: string }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = query.type ? { type: query.type } : {};

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markAsRead(id: string): Promise<ActivityLog | null> {
    try {
      return await this.prisma.activityLog.update({
        where: { id },
        data: { isRead: true },
      });
    } catch {
      return null;
    }
  }

  async markAllAsRead(): Promise<number> {
    const result = await this.prisma.activityLog.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  async countUnread(): Promise<number> {
    return this.prisma.activityLog.count({ where: { isRead: false } });
  }
}
