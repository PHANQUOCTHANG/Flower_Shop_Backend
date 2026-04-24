export class ReviewMediaResponseDto {
  url: string;
  type: string;

  constructor(data: any) {
    this.url = data.url;
    this.type = data.type;
  }
}

export class ReviewResponseDto {
  id: string;
  rating: number;
  content: string | null;
  createdAt: string;
  
  // // Thông tin người dùng (Lấy từ relation user)
  user: {
    fullName: string;
    avatar: string | null;
  };

  // // Danh sách ảnh/video thực tế (Lấy từ relation media)
  media: ReviewMediaResponseDto[];

  constructor(data: any) {
    this.id = data.id;
    this.rating = data.rating;
    this.content = data.content;
    this.createdAt = data.createdAt.toISOString();
    
    this.user = {
      fullName: data.user?.fullName || "Khách hàng",
      avatar: data.user?.avatar || null,
    };

    this.media = data.media 
      ? data.media.map((m: any) => new ReviewMediaResponseDto(m)) 
      : [];
  }

  static from(data: any) {
    return new ReviewResponseDto(data);
  }

  static fromList(list: any[]) {
    return list.map((item) => new ReviewResponseDto(item));
  }
}