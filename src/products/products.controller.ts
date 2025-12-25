// src/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ValidationPipe,
  ParseUUIDPipe,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Put,
  Delete,
  Patch,
  UseGuards,
  UseInterceptors,
  Header,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CacheInterceptor, CacheKey } from '@nestjs/cache-manager';
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }


  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createProductDto: CreateProductDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.create(createProductDto);
    const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/${product.id}`;
    res.setHeader('Location', location);
    return product;
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.delete(id);
  }

  @Patch(':id/inventory')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateInventory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateInventoryDto: UpdateInventoryDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.updateInventory(id, updateInventoryDto.quantity);
  }



  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  async list(
    @Query(new ValidationPipe({ transform: true })) query: QueryProductDto,
  ) {
    return this.productsService.list(query);
  }

  @Get(':id')
  // (Chúng ta cũng có thể cache GetById)
  @UseInterceptors(CacheInterceptor)
  @CacheKey('product_by_id')
  @Header('Cache-Control', 'public, max-age=60')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    return this.productsService.get(id);
  }
}