
// DTO này định nghĩa dữ liệu chúng ta trả về cho client.
export class ProductResponseDto {
  id: string;
  name: string;
  description: string | null;
  price: number; 
  sku: string;
  imageUrl: string | null;
  categoryName: string;
  ratingRate?: number;
  ratingCount?: number;
  inventoryQuantity?: number; // Số lượng tồn kho
  createdAt: Date;
  updatedAt: Date;
}