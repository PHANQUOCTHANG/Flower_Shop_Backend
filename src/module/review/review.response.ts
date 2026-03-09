export interface ReviewResponseDto {
  id: string;
  user: any;
  product: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: Date;
}
