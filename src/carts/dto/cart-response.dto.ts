export class CartItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImageUrl?: string;
  quantity: number;
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CartResponseDto {
  id: string;
  userId: string;
  items: CartItemResponseDto[];
  totalItems: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

