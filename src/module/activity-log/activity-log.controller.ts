import { Request, Response, NextFunction } from "express";
import { IActivityLogService } from "./activity-log.service";

export class ActivityLogController {
  constructor(private readonly service: IActivityLogService) {}

  // GET /api/activity-logs
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = (req.query.type as string) || undefined;

      const result = await this.service.findAll({ page, limit, type });

      res.json({
        status: "success",
        message: "Lấy danh sách activity log thành công",
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/activity-logs/unread-count
  getUnreadCount = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await this.service.countUnread();
      res.json({ status: "success", data: { count } });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/activity-logs/:id/read
  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const log = await this.service.markAsRead(id);
      if (!log) {
        res.status(404).json({ status: "error", message: "Không tìm thấy log" });
        return;
      }
      res.json({ status: "success", data: log });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/activity-logs/read-all
  markAllAsRead = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await this.service.markAllAsRead();
      res.json({ status: "success", data: { updated: count } });
    } catch (error) {
      next(error);
    }
  };
}
