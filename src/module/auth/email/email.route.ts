import { Router } from "express";
import * as emailCtrl from "@/module/auth/email/email.controller";

const router = Router();

// URL: /api/v1/emails/send
router.post("/send", emailCtrl.sendEmail);

export default router;
