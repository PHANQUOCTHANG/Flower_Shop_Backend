import { Worker, Job } from "bullmq";
import { getBullMQRedis, orderDLQ } from "@/config/queue";
import { OnlinePaymentGateway } from "@/module/order/order.type";
import { getIO } from "@/config/socket";
import { orderService } from "@/config/container";
import { CheckoutDto } from "@/module/order/order.request";
import logger from "@/utils/logger";

interface CheckoutJobData {
  userId: string;
  dto: CheckoutDto;
  cartId: string;
}

export const startOrderWorker = () => {
  const worker = new Worker<CheckoutJobData>(
    "process-checkout",
    async (job: Job<CheckoutJobData>) => {
      const { userId, dto } = job.data;
      const io = getIO();

      // Log payload (không log thông tin nhạy cảm như password/token)
      logger.info(`[Worker] Processing job ${job.id} for user ${userId} | paymentMethod: ${dto.paymentMethod}`);

      io.to(`user:${userId}`).emit("order:status", {
        jobId: job.id,
        status: "processing",
        message: "Đang xử lý đơn hàng...",
      });

      try {
        const order = await orderService.checkout(userId, dto);

        logger.info(`[Worker] Job ${job.id} completed → orderId: ${order.id}`);

        io.to(`user:${userId}`).emit("order:status", {
          jobId: job.id,
          status: "completed",
          message: "Đặt hàng thành công!",
          data: { orderId: order.id, totalPrice: order.totalPrice },
        });

        return order;
      } catch (error: any) {
        logger.error(
          `[Worker] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}) — ${error.message}`
        );

        io.to(`user:${userId}`).emit("order:status", {
          jobId: job.id,
          status: "failed",
          message: error.message || "Đặt hàng thất bại",
        });

        // Nếu đã hết số lần retry → chuyển sang Dead-Letter Queue
        const maxAttempts = job.opts.attempts ?? 3;
        if (job.attemptsMade >= maxAttempts) {
          await orderDLQ.add("failed-checkout", job.data, {
            jobId: `dlq:${job.id}`,
          });
          logger.warn(`[Worker] Job ${job.id} moved to DLQ after ${job.attemptsMade} attempts`);
        }

        throw error;
      }
    },
    {
      connection: getBullMQRedis(), // Dùng singleton — không tạo connection mới
      concurrency: 3,               // Giảm 5 → 3: ít job đồng thời hơn, tiết kiệm lệnh Redis
      // Bỏ limiter không cần thiết cho dự án nhỏ-trung (tiết kiệm ZADD/ZCOUNT/ZREMRANGEBYRANK)
    }
  );

  worker.on("completed", (job) => {
    logger.info(`[Worker] ✅ Job ${job?.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(
      `[Worker] ❌ Job ${job?.id} failed after ${job?.attemptsMade} attempts: ${err.message}`
    );
  });

  let isPausingDueToLimit = false;

  worker.on("error", (err) => {
    // Nếu gặp lỗi rate limit của Upstash
    if (err.message.includes("max requests limit exceeded")) {
      if (!isPausingDueToLimit) {
        isPausingDueToLimit = true;
        logger.error(`[Worker] Upstash Redis hết quota! Tạm dừng worker 10 phút để tránh spam log...`);
        
        // Tạm dừng pool job của worker
        try { worker.pause(); } catch(e) {}
        
        // Cài giờ chạy lại sau 10 phút
        setTimeout(() => {
          isPausingDueToLimit = false;
          logger.info(`[Worker] Khởi động lại worker kiểm tra Redis...`);
          try { worker.resume(); } catch(e) {}
        }, 10 * 60 * 1000); // 10 phút
      }
    } else {
      // Bắt lỗi worker-level bình thường
      logger.error(`[Worker] Worker-level error: ${err.message}`);
    }
  });

  // ─── Cleanup Worker cho cổng thanh toán online ──────────────────────────────
  // Xử lý delayed job hủy đơn hàng quá hạn 15 phút không thanh toán (dùng chung
  // cho mọi cổng — chỉ khác nhau ở tên queue BullMQ và label để log)
  const makeCleanupWorker = (queueName: string, gateway: OnlinePaymentGateway) => {
    const label = queueName === "vnpay-cleanup" ? "VNPay Cleanup" : "ZaloPay Cleanup";
    const cleanupWorker = new Worker<{ orderId: string }>(
      queueName,
      async (job: Job<{ orderId: string }>) => {
        const { orderId } = job.data;
        logger.info(`[${label}] Checking expired order: ${orderId}`);

        try {
          await orderService.cancelExpiredOnlinePaymentOrder(orderId, gateway);
          logger.info(`[${label}] Done for order ${orderId}`);
        } catch (error: any) {
          logger.error(`[${label}] Failed for order ${orderId}: ${error.message}`);
          throw error;
        }
      },
      {
        connection: getBullMQRedis(),
        concurrency: 1, // Hủy lai rai, không cần concurrency cao
      },
    );

    cleanupWorker.on("failed", (job, err) => {
      logger.error(`[${label}] ❌ Job ${job?.id} failed: ${err.message}`);
    });

    return cleanupWorker;
  };

  const vnpayCleanupWorker = makeCleanupWorker("vnpay-cleanup", "vnpay");
  const zalopayCleanupWorker = makeCleanupWorker("zalopay-cleanup", "zalopay");

  return { worker, vnpayCleanupWorker, zalopayCleanupWorker };
};
