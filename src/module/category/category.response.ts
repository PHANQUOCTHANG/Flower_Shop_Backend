import { Category } from "@prisma/client";

export class CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  status: string;
  createdAt: string;

  constructor(category: Category) {
    this.id = category.id;
    this.name = category.name;
    this.slug = category.slug;
    this.parentId = category.parentId ?? null;
    this.thumbnailUrl = category.thumbnailUrl;
    this.sortOrder = category.sortOrder;
    this.status = category.status;
    this.createdAt = category.createdAt.toISOString();
  }

  // Tạo DTO từ một danh mục
  static from(c: Category): CategoryResponseDto {
    return new CategoryResponseDto(c);
  }

  // Tạo DTO từ danh sách danh mục
  static fromList(cs: Category[]): CategoryResponseDto[] {
    return cs.map((c) => new CategoryResponseDto(c));
  }
}
