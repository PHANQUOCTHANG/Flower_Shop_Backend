import { Router } from "express";
import * as zalopayCtrl from "./zalopay.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

// [POST] ZaloPay gọi server-to-server để thông báo kết quả — không cần auth
router.post("/callback", zalopayCtrl.zalopayCallback);

// [GET] FE chủ động hỏi trạng thái thanh toán (fallback khi callback chưa tới) — cần auth
router.get("/query/:orderId", requireAuth, zalopayCtrl.zalopayQueryStatus);

export default router;
