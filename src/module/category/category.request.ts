import { z } from "zod";

// Schema cơ bản danh mục
const categoryBase = z.object({
  name: z.string().trim().min(2, "Tên danh mục tối thiểu 2 ký tự").max(150),
  description: z.string().nullable().optional(),
  parentId: z
    .string()
    .uuid("Parent ID phải là UUID hợp lệ")
    .nullable()
    .optional(),
  thumbnailUrl: z.string().url("Link ảnh không hợp lệ").nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
  status: z.enum(["active", "hidden"]).default("active"),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().nullable().optional(),
});

export const CreateCategorySchema = categoryBase;

export const UpdateCategorySchema = categoryBase.partial().extend({
  thumbnailEmpty: z.coerce.boolean().optional(),
});

export const CategoryIdParamSchema = z.object({
  id: z.string().uuid("ID danh mục phải là UUID hợp lệ"),
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
