import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Create a review
   * POST /api/reviews
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req,
    @Body(ValidationPipe) dto: CreateReviewDto,
  ) {
    const userId = req.user.id;
    return this.reviewsService.create(userId, dto);
  }

  /**
   * Get all reviews for a product
   * GET /api/reviews/product/:productId
   */
  @Get('product/:productId')
  async getProductReviews(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  /**
   * Get user's own reviews
   * GET /api/reviews/my-reviews
   */
  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  async getUserReviews(@Request() req) {
    const userId = req.user.id;
    return this.reviewsService.getUserReviews(userId);
  }

  /**
   * Get a single review
   * GET /api/reviews/:id
   */
  @Get(':id')
  async getReview(@Param('id', ParseUUIDPipe) reviewId: string) {
    return this.reviewsService.getReview(reviewId);
  }

  /**
   * Update a review
   * PUT /api/reviews/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) reviewId: string,
    @Body(ValidationPipe) dto: UpdateReviewDto,
  ) {
    const userId = req.user.id;
    return this.reviewsService.update(userId, reviewId, dto);
  }

  /**
   * Delete a review
   * DELETE /api/reviews/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Request() req,
    @Param('id', ParseUUIDPipe) reviewId: string,
  ) {
    const userId = req.user.id;
    await this.reviewsService.delete(userId, reviewId);
  }
}

