import { z } from "zod";

// [Schema] Base cho Category
const categoryBase = z.object({
  name: z.string().trim().min(2, "Tên danh mục tối thiểu 2 ký tự").max(150),
  description: z.string().nullable().optional(),
  parentId: z.string().regex(/^\d+$/, "Parent ID phải là số").nullable().optional(),
  thumbnailUrl: z.string().url("Link ảnh không hợp lệ").nullable().optional(),
  sortOrder: z.number().int().default(0),
  status: z.enum(["active", "hidden"]).default("active"),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().nullable().optional(),
});

// [Schema] Tạo mới
export const CreateCategorySchema = categoryBase;

// [Schema] Cập nhật
export const UpdateCategorySchema = categoryBase.partial();

// [Schema] Validate ID param
export const CategoryIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID danh mục phải là số hợp lệ"),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;