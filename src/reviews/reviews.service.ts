import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Map Review to ReviewResponseDto
   */
  private toResponseDto(review: any): ReviewResponseDto {
    return {
      id: review.id,
      userId: review.userId,
      userEmail: review.user?.email,
      userName: review.user
        ? `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim()
        : undefined,
      productId: review.productId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  /**
   * Create a review
   */
  async create(
    userId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const { productId, rating, comment } = dto;

    // Check if product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if user already reviewed this product
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    // Create review and update product rating in transaction
    const review = await this.prisma.$transaction(async (tx) => {
      // Create review
      const newReview = await tx.review.create({
        data: {
          userId,
          productId,
          rating,
          comment,
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Calculate new average rating
      const reviews = await tx.review.findMany({
        where: { productId },
      });

      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRating / reviews.length;

      // Update product rating
      await tx.product.update({
        where: { id: productId },
        data: {
          ratingRate: avgRating,
          ratingCount: reviews.length,
        },
      });

      return newReview;
    });

    return this.toResponseDto(review);
  }

  /**
   * Get all reviews for a product
   */
  async getProductReviews(productId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map(this.toResponseDto);
  }

  /**
   * Get a single review by ID
   */
  async getReview(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.toResponseDto(review);
  }

  /**
   * Update a review
   */
  async update(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    // Find review
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Verify ownership
    if (review.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    // Update review and recalculate product rating
    const updatedReview = await this.prisma.$transaction(async (tx) => {
      // Update review
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: dto,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Recalculate product rating
      const reviews = await tx.review.findMany({
        where: { productId: review.productId },
      });

      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRating / reviews.length;

      await tx.product.update({
        where: { id: review.productId },
        data: {
          ratingRate: avgRating,
          ratingCount: reviews.length,
        },
      });

      return updated;
    });

    return this.toResponseDto(updatedReview);
  }

  /**
   * Delete a review
   */
  async delete(userId: string, reviewId: string): Promise<void> {
    // Find review
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Verify ownership
    if (review.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    // Delete review and recalculate product rating
    await this.prisma.$transaction(async (tx) => {
      // Delete review
      await tx.review.delete({
        where: { id: reviewId },
      });

      // Recalculate product rating
      const reviews = await tx.review.findMany({
        where: { productId: review.productId },
      });

      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      await tx.product.update({
        where: { id: review.productId },
        data: {
          ratingRate: avgRating,
          ratingCount: reviews.length,
        },
      });
    });
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(userId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map(this.toResponseDto);
  }
}

