import { Worker } from "bullmq";
import { getBullMQRedis, campaignStatusQueue } from "@/config/queue";
import { campaignService } from "@/config/container";
import logger from "@/utils/logger";

// Tự động chuyển trạng thái campaign theo thời gian (SCHEDULED→ACTIVE, ACTIVE→ENDED)
// mỗi 60 giây. Dùng BullMQ repeatable job — nhất quán với hạ tầng queue sẵn có của
// dự án (order/vnpay/zalopay cleanup), tự dedupe qua Redis kể cả khi chạy nhiều
// instance backend cùng lúc. Không phát socket — chỉ đồng bộ DB, client thấy thay
// đổi qua refetch/staleTime của TanStack Query như bình thường.
export const startCampaignStatusWorker = () => {
  campaignStatusQueue
    .add(
      "sync",
      {},
      { repeat: { every: 60_000 }, jobId: "campaign-status-sync-repeat" },
    )
    .catch((err) => logger.error(`[CampaignWorker] Không thể đăng ký repeatable job: ${err.message}`));

  const worker = new Worker(
    "campaign-status-sync",
    async () => {
      await campaignService.syncCampaignStatuses();
    },
    { connection: getBullMQRedis(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error(`[CampaignWorker] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
};
