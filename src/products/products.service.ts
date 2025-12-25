import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { Prisma, Product } from '@prisma/client';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
// Định nghĩa một kiểu mở rộng để bao gồm Category
type ProductWithCategory = Product & {
  category: { name: string } | null;
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private toResponseDto(product: any): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price), 
      sku: product.sku,
      imageUrl: product.imageUrl,
      categoryName: product.category?.name || 'N/A',
      ratingRate: product.ratingRate || 0,
      ratingCount: product.ratingCount || 0,
      inventoryQuantity: product.inventory?.quantity,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }


  async list(query: QueryProductDto) {
    const {
      page = 1,
      pageSize = 10,
      q,
      category,
      minPrice,
      maxPrice,
      sort = 'updatedAt',
      order = 'desc',
    } = query;

    // 1. Xây dựng mệnh đề 'where'
const where: Prisma.ProductWhereInput = {
  deletedAt: null, // 👈 THÊM DÒNG NÀY
};
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }
    if (category) {
      where.category = { slug: category };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }
    // Soft-delete được xử lý tự động bởi middleware

    // 2. Xây dựng mệnh đề 'orderBy'
    const orderBy = { [sort]: order };

    // 3. Thực thi truy vấn
    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { 
          category: { select: { name: true } },
          inventory: true, // Include inventory
        },
      }),
    ]);

    // 4. Map kết quả
    const mappedItems = items.map(this.toResponseDto);
    return { total, page, pageSize, items: mappedItems };
  }

  async get(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { 
        category: { select: { name: true } },
        inventory: true,
      },
    });
    // Middleware đã xử lý soft-delete (nếu không tìm thấy, product sẽ là null)
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.toResponseDto(product);
  }

  async create(input: CreateProductDto): Promise<ProductResponseDto> {
    const { categoryId, ...productData } = input;

    try {
      const newProduct = await this.prisma.product.create({
        data: {
          ...productData,
          category: {
            connect: { id: categoryId },
          },
          inventory: {
            create: { quantity: 0 },
          },
        },
        include: { category: { select: { name: true } } },
      });
      return this.toResponseDto(newProduct);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Bắt lỗi vi phạm unique constraint (SKU)
        if (error.code === 'P2002') {
          throw new ConflictException(`SKU '${input.sku}' already exists.`);
        }
      }
      throw error; // Ném lại các lỗi khác
    }
  }
async update(id: string, input: UpdateProductDto): Promise<ProductResponseDto> {
  // 1. Kiểm tra xem sản phẩm có tồn tại không
  // Middleware soft-delete (nếu được kích hoạt) sẽ xử lý việc này
  const product = await this.prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new NotFoundException('Product not found to update');
  }

  // 2. Tách categoryId nếu có
  const { categoryId, ...productData } = input;
  
  // 3. Chuẩn bị dữ liệu update
  const updateData: Prisma.ProductUpdateInput = {
    ...productData,
  };
  
  // Nếu categoryId được cung cấp, kết nối nó
  if (categoryId) {
    updateData.category = { connect: { id: categoryId } };
  }

  try {
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: { select: { name: true } } }, // Lấy category để map
    });
    
    return this.toResponseDto(updatedProduct);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Bắt lỗi SKU bị trùng
      if (error.code === 'P2002') {
        throw new ConflictException(`SKU '${input.sku}' already exists.`);
      }
    }
    throw error;
  }
}
async delete(id: string): Promise<void> {
  // 1. Kiểm tra xem sản phẩm có tồn tại không
  const product = await this.prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new NotFoundException('Product not found to delete');
  }

  // 2. Thực hiện "Soft Delete" thủ công
  // Thay vì .delete(), chúng ta dùng .update()
  await this.prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() }, 
  });
}

  /**
   * Update inventory quantity for a product (Admin only)
   */
  async updateInventory(id: string, quantity: number): Promise<ProductResponseDto> {
    // 1. Kiểm tra product có tồn tại không
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2. Update inventory
    if (product.inventory) {
      // Nếu đã có inventory, update nó
      await this.prisma.inventory.update({
        where: { productId: id },
        data: { quantity },
      });
    } else {
      // Nếu chưa có inventory, tạo mới
      await this.prisma.inventory.create({
        data: {
          productId: id,
          quantity,
        },
      });
    }

    // 3. Lấy lại product với inventory mới
    const updatedProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        inventory: true,
      },
    });

    return this.toResponseDto(updatedProduct);
  }
}