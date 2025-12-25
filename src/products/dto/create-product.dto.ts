import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  sku: string;
  
  @IsString()
  @IsUUID() 
  categoryId: string;
  
  @IsString()
  @IsOptional()
  imageUrl?: string;
}