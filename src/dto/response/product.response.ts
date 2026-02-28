export interface ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  price: number;
  discount: number;
  finalPrice: number;
  description: string;
  images: string[];
  stock: number;
  status: string;
  category: any;
  rating: number;
  amountBuy: number;
  productNew: boolean;
  color: any;
  size: string;
  createdAt: Date;
  updatedAt: Date;
}
