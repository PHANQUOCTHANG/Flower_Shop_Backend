import { BaseQuery, normalizeQuery } from "@/utils/query";

export interface ProductQuery extends BaseQuery {
  category?: string;
  priceMax?: number;
  priceMin?: number;
  status?: string;
}

// Chuẩn hóa các tham số truy vấn sản phẩm
export const normalizeQueryProduct = (query: any): ProductQuery => ({
  ...normalizeQuery(query),
  category: query.category?.trim() || undefined,
  priceMax: Number(query.priceMax) || undefined,
  priceMin: Number(query.priceMin) || undefined,
  status: query.status?.trim() || undefined,
});
