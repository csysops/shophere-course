import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}

