import { Router } from "express";
import * as emailCtrl from "@/module/auth/email/email.controller";

const router = Router();

/**
 * @swagger
 * /api/v1/emails/send:
 *   post:
 *     summary: Gửi email thông báo
 *     tags:
 *       - Emails
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               body:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gửi thành công
 */
// URL: /api/v1/emails/send
router.post("/send", emailCtrl.sendEmail);

export default router;
