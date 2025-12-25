import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;
}

