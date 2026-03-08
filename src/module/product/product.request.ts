import { z } from "zod";

// [Schema] Hình ảnh đi kèm sản phẩm
const productImagesSchema = z.object({
  imageUrl: z.string().url("Link ảnh không hợp lệ"),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const productBase = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên tối thiểu 2 ký tự")
    .max(255, "Tên tối đa 255 ký tự"),

  shortDescription: z
    .string()
    .max(500, "Mô tả ngắn tối đa 500 ký tự")
    .nullable()
    .optional(),

  description: z.string().nullable().optional(),

  // Giá cả xử lý dạng số ở tầng validation
  price: z.number().min(0, "Giá không được âm"),

  comparePrice: z
    .number()
    .min(0, "Giá so sánh không được âm")
    .nullable()
    .optional(),

  costPrice: z.number().min(0, "Giá vốn không được âm").nullable().optional(),

  sku: z.string().max(100, "SKU tối đa 100 ký tự").nullable().optional(),

  stockQuantity: z
    .number()
    .int()
    .min(0, "Số lượng kho không được âm")
    .default(0),

  lowStockThreshold: z.number().int().min(0).default(5),

  thumbnailUrl: z.string().url("Link ảnh không hợp lệ").nullable().optional(),

  status: z.enum(["active", "hidden", "draft"]).default("active"),

  metaTitle: z.string().max(255).nullable().optional(),

  metaDescription: z.string().nullable().optional(),

  // Danh sách ID danh mục (truyền dưới dạng string UUID)
  categoryIds: z.array(z.string().uuid()).optional(),

  // Danh sách ảnh
  images: z.array(productImagesSchema).optional(),
});

// [Schema] Tạo sản phẩm
export const CreateProductSchema = productBase;

// [Schema] Admin cập nhật sản phẩm
export const UpdateProductSchema = productBase.partial();

// [Schema] Kiểm tra ID trên URL (UUID)
export const ProductIdParamSchema = z.object({
  id: z.string().uuid("ID sản phẩm phải là UUID hợp lệ"),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
