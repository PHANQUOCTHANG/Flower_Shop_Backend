import { z } from "zod";

const campaignItemSchema = z.object({
  productId: z.string().uuid("Product ID phải là UUID hợp lệ"),
  discountValue: z.coerce.number().min(0, "Mức giảm giá không được âm"),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).default("PERCENTAGE"),
  salePrice: z.coerce.number().min(0, "Giá sale không được âm"),
  limitQuantity: z.coerce.number().min(1, "Số lượng giới hạn tối thiểu 1").nullable().optional(),
});

const uniqueProductIdsRefinement = {
  check: (items: z.infer<typeof campaignItemSchema>[] | undefined) =>
    !items || new Set(items.map((i) => i.productId)).size === items.length,
  message: "Không được thêm trùng sản phẩm trong cùng một chiến dịch",
};

const campaignBase = z.object({
  name: z.string().trim().min(3, "Tên chiến dịch tối thiểu 3 ký tự").max(255),
  description: z.string().nullable().optional(),
  type: z.enum(["FLASH_SALE", "EVENT_SALE"]).default("FLASH_SALE"),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"]).default("DRAFT"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  bannerUrl: z.string().url("Link banner không hợp lệ").nullable().optional(),
  isActive: z.boolean().default(true),
  items: z.array(campaignItemSchema).optional(),
});

export const CreateCampaignSchema = campaignBase.refine(
  (data) => uniqueProductIdsRefinement.check(data.items),
  { message: uniqueProductIdsRefinement.message, path: ["items"] },
);

export const UpdateCampaignSchema = campaignBase.partial().refine(
  (data) => uniqueProductIdsRefinement.check(data.items),
  { message: uniqueProductIdsRefinement.message, path: ["items"] },
);

export const CampaignIdParamSchema = z.object({
  id: z.string().uuid("ID chiến dịch phải là UUID hợp lệ"),
});

export const CampaignQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"]).optional(),
  type: z.enum(["FLASH_SALE", "EVENT_SALE"]).optional(),
});

export const UpdateCampaignStatusSchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"]),
});

export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignDto = z.infer<typeof UpdateCampaignSchema>;
export type CampaignQueryDto = z.infer<typeof CampaignQuerySchema>;
