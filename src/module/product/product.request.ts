import { z } from "zod";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const productImageSchema = z.object({
  imageUrl: z.string().url("Link ảnh không hợp lệ"),
  publicId: z.string().min(1, "Public ID is required"),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

// ─── Base schema ──────────────────────────────────────────────────────────────

const productBase = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên tối thiểu 2 ký tự")
    .max(255, "Tên tối đa 255 ký tự"),

  shortDescription: z.string().max(500).nullable().optional(),

  description: z.string().nullable().optional(),

  // FIX: FormData gửi số dạng string → coerce ép kiểu tự động
  price: z.coerce.number().min(0, "Giá không được âm"),

  comparePrice: z.coerce
    .number()
    .min(0, "Giá so sánh không được âm")
    .nullable()
    .optional(),

  sku: z.string().max(100).nullable().optional(),

  thumbnailUrl: z.string().url().nullable().optional(),

  status: z.enum(["active", "hidden", "draft"]).default("active"),

  // FIX: multer parse 1 item thành string, nhiều items thành string[]
  // preprocess chuẩn hoá về array trước khi validate
  categoryIds: z
    .preprocess(
      (val) => (val == null ? [] : Array.isArray(val) ? val : [val]),
      z.array(z.string()),
    )
    .optional(),

  // images được controller gắn vào sau khi middleware upload xong
  images: z.array(productImageSchema).optional(),
});

// ─── Exported schemas ─────────────────────────────────────────────────────────

export const CreateProductSchema = productBase;
export const UpdateProductSchema = productBase.partial();

export const ProductIdParamSchema = z.object({
  id: z.string().uuid("ID sản phẩm phải là UUID hợp lệ"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
