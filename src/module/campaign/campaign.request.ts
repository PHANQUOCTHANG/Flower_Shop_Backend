import { z } from "zod";

const campaignItemSchema = z.object({
  productId: z.string().uuid("Product ID phải là UUID hợp lệ"),
  discountValue: z.coerce.number().min(0, "Mức giảm giá không được âm"),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).default("PERCENTAGE"),
  salePrice: z.coerce.number().min(0, "Giá sale không được âm"),
  limitQuantity: z.coerce.number().min(1, "Số lượng giới hạn tối thiểu 1").nullable().optional(),
});

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

export const CreateCampaignSchema = campaignBase;

export const UpdateCampaignSchema = campaignBase.partial();

export const CampaignIdParamSchema = z.object({
  id: z.string().uuid("ID chiến dịch phải là UUID hợp lệ"),
});

export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignDto = z.infer<typeof UpdateCampaignSchema>;
