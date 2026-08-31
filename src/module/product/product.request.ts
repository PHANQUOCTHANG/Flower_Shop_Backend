import { z } from "zod";

// Schema hình ảnh sản phẩm
const productImageSchema = z.object({
  imageUrl: z.string().url("Link ảnh không hợp lệ"),
  publicId: z.string().min(1).optional().nullable(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

// Schema cơ bản sản phẩm
const productBase = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên tối thiểu 2 ký tự")
    .max(255, "Tên tối đa 255 ký tự"),
  shortDescription: z.string().max(500).nullable().optional(),
  description: z.string().nullable().optional(),
  // FormData truyền số dưới dạng chuỗi, nên cần coerce
  price: z.coerce.number().min(0, "Giá không được âm"),
  comparePrice: z.coerce
    .number()
    .min(0, "Giá so sánh không được âm")
    .nullable()
    .optional(),
  sku: z.string().max(100).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  thumbnailPublicId: z.string().max(255).nullable().optional(),
  thumbnailWidth: z.number().int().nullable().optional(),
  thumbnailHeight: z.number().int().nullable().optional(),
  status: z.enum(["active", "hidden", "draft"]).default("active"),
  // Chuẩn hóa categoryIds về mảng
  categoryIds: z
    .preprocess(
      (val) => (val == null ? [] : Array.isArray(val) ? val : [val]),
      z.array(z.string()),
    )
    .optional(),
  // Hình ảnh ghi nhận tự động bởi controller sau upload
  images: z.array(productImageSchema).optional(),
});

export const CreateProductSchema = productBase;

export const UpdateProductSchema = productBase.partial().extend({
  thumbnailEmpty: z.coerce.boolean().optional(),
  deletedImageIds: z
    .preprocess(
      (val) => (val == null ? [] : Array.isArray(val) ? val : [val]),
      z.array(z.string()),
    )
    .optional(),
  // Thứ tự cuối cùng của toàn bộ ảnh gallery (cũ lẫn mới) sau khi admin kéo-thả
  // sắp xếp. Mỗi phần tử là id thật của ProductImage (ảnh cũ giữ lại) hoặc
  // "new:<index>" — index tính theo thứ tự file trong field "images" của
  // multipart form (ảnh mới upload). Token nào không xác định được sẽ bị bỏ
  // qua; ảnh nào không có token nào ứng với nó sẽ tự nối vào cuối.
  imageOrder: z
    .preprocess(
      (val) => (val == null ? [] : Array.isArray(val) ? val : [val]),
      z.array(z.string()),
    )
    .optional(),
  // Token (cùng định dạng với imageOrder) của ảnh được chọn làm ảnh đại diện.
  primaryImageId: z.string().nullable().optional(),
});

export const ProductIdParamSchema = z.object({
  id: z.string().uuid("ID sản phẩm phải là UUID hợp lệ"),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
