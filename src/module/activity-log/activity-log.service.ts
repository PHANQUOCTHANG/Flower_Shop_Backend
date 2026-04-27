import { ActivityLog } from "@prisma/client";
import { IActivityLogRepository } from "./activity-log.repository";

export interface IActivityLogService {
  create(data: { type: string; message: string; data?: object }): Promise<ActivityLog>;
  findAll(query: { page?: number; limit?: number; type?: string }): Promise<any>;
  markAsRead(id: string): Promise<ActivityLog | null>;
  markAllAsRead(): Promise<number>;
  countUnread(): Promise<number>;
}

export class ActivityLogService implements IActivityLogService {
  constructor(private readonly repo: IActivityLogRepository) {}

  async create(data: { type: string; message: string; data?: object }) {
    return this.repo.create(data);
  }

  async findAll(query: { page?: number; limit?: number; type?: string }) {
    return this.repo.findAll(query);
  }

  async markAsRead(id: string) {
    return this.repo.markAsRead(id);
  }

  async markAllAsRead() {
    return this.repo.markAllAsRead();
  }

  async countUnread() {
    return this.repo.countUnread();
  }
}
