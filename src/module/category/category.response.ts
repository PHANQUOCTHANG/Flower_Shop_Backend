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
    this.id = category.id.toString(); // BigInt -> String
    this.name = category.name;
    this.slug = category.slug;
    this.parentId = category.parentId?.toString() ?? null;
    this.thumbnailUrl = category.thumbnailUrl;
    this.sortOrder = category.sortOrder;
    this.status = category.status;
    this.createdAt = category.createdAt.toISOString();
  }

  static from(c: Category) { return new CategoryResponseDto(c); }
  static fromList(cs: Category[]) { return cs.map(c => new CategoryResponseDto(c)); }
}