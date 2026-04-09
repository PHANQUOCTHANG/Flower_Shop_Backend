import { Worker, Job } from "bullmq";
import { createRedisConnection } from "@/config/queue"; // đổi import
import { getIO } from "@/config/socket";
import { orderService } from "@/config/container";
import { CheckoutDto } from "@/module/order/order.request";

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

      io.to(`user:${userId}`).emit("order:status", {
        jobId: job.id,
        status: "processing",
        message: "Đang xử lý đơn hàng...",
      });

      try {
        const order = await orderService.checkout(userId, dto);

        io.to(`user:${userId}`).emit("order:status", {
          jobId: job.id,
          status: "completed",
          message: "Đặt hàng thành công!",
          data: { orderId: order.id, totalPrice: order.totalPrice },
        });

        return order;
      } catch (error: any) {
        console.error("[Worker] Job failed:", job.id, error.message);

        io.to(`user:${userId}`).emit("order:status", {
          jobId: job.id,
          status: "failed",
          message: error.message || "Đặt hàng thất bại",
        });

        throw error;
      }
    },
    {
      connection: createRedisConnection(), // gọi factory
      concurrency: 5,
      limiter: {
        max: 20,
        duration: 1000,
      },
    },
  );

  worker.on("completed", (job) => {
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      err.message,
    );
  });

  return worker;
};
