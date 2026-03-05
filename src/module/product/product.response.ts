import {
  Product,
  ProductImage,
  ProductCategory,
  Category,
} from "@prisma/client";

export class ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  sku : string | null ;
  stockQuantity: number;
  thumbnailUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;

  images: any[];
  categories: any[];

  constructor(
    product: Product & {
      images?: ProductImage[];
      categories?: (ProductCategory & { category?: Category })[];
    },
  ) {
    this.id = product.id.toString(); // BigInt -> String
    this.name = product.name;
    this.slug = product.slug;
    this.price = Number(product.price); // Decimal -> Number
    this.comparePrice = product.comparePrice
      ? Number(product.comparePrice)
      : null;
    this.sku = product.sku;
    this.stockQuantity = product.stockQuantity;
    this.thumbnailUrl = product.thumbnailUrl;
    this.status = product.status;

    // Map danh sách ảnh
    this.images =
      product.images?.map((img: ProductImage) => ({
        id: img.id.toString(),
        url: img.imageUrl,
        isPrimary: img.isPrimary,
      })) || [];

    // Map chi tiết danh mục
    this.categories =
      product.categories?.map(
        (c: ProductCategory & { category?: Category }) => ({
          id: c.categoryId.toString(),
          name: c.category?.name || "",
          slug: c.category?.slug || "",
        }),
      ) || [];

    this.createdAt = product.createdAt.toISOString();
    this.updatedAt = product.updatedAt.toISOString();
  }

  static from(p: Product) {
    return new ProductResponseDto(p);
  }

  static fromList(ps: Product[]) {
    return ps.map((p) => new ProductResponseDto(p));
  }
}
