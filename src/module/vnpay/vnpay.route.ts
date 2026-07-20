import { Router } from "express";
import * as vnpayCtrl from "./vnpay.controller";

const router = Router();

// [GET] VNPay redirect user về đây sau khi thanh toán
router.get("/return", vnpayCtrl.vnpayReturn);

// [GET] VNPay gọi server-to-server để thông báo kết quả
router.get("/ipn", vnpayCtrl.vnpayIpn);

export default router;
