export class ReviewResponseDto {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  productId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

