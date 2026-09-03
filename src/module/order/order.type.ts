import { BaseQuery } from "@/utils/query";
import { normalizeQuery } from "@/utils/query";

import { OrderStatus, PaymentStatus } from "@prisma/client";

// Các cổng thanh toán online hỗ trợ luồng PENDING_PAYMENT → xác nhận qua callback/IPN
export type OnlinePaymentGateway = "vnpay" | "zalopay";

// Kiểu query cho filter/sort đơn hàng
export interface OrderQuery extends BaseQuery {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export const normalizeQueryOrder = (query: any): OrderQuery => ({
  ...normalizeQuery(query),
  status: (query.status?.trim().toUpperCase() as OrderStatus) || undefined,
  paymentStatus: (query.paymentStatus?.trim().toUpperCase() as PaymentStatus) || undefined,
  dateFrom: query.dateFrom?.trim() || undefined,
  dateTo: query.dateTo?.trim() || undefined,
});
