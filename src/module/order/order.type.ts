import { BaseQuery } from "@/utils/query";
import { normalizeQuery } from "@/utils/query";
export interface OrderQuery extends BaseQuery {
  status?: "pending" | "processing" | "completed" | "cancelled";
  paymentStatus?: "paid" | "unpaid";
  dateFrom?: string;
  dateTo?: string;
}

export const normalizeQueryOrder = (query: any): OrderQuery => ({
  ...normalizeQuery(query),
  status: query.status?.trim() || undefined,
  paymentStatus: query.paymentStatus?.trim() || undefined,
  dateFrom: query.dateFrom?.trim() || undefined,
  dateTo: query.dateTo?.trim() || undefined,
});
