import { BaseQuery } from "@/utils/query";
import { normalizeQuery } from "@/utils/query";
export interface ProductQuery extends BaseQuery {
	category? : string , 
    priceMax? : number ,
    priceMin? : number 
}

export const normalizeQueryProduct = (query: any): ProductQuery => ({
    ...normalizeQuery(query),
    category: query.category?.trim() || undefined,
    priceMax: Number(query.priceMax) || undefined,
    priceMin: Number(query.priceMin) || undefined
});