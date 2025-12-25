// src/users/users.service.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    // 👈 XÓA: @Inject('RABBITMQ_SERVICE') private rabbitClient: ClientProxy,
  ) {}

  async create(input: CreateUserDto) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);
    const verificationCode = uuidv4(); // Generate verification code

    try {
      // 🚀 BẮT ĐẦU OUTBOX PATTERN
      const user = await this.prisma.$transaction(async (tx) => {
        // 1. Tạo User with verification code
        const createdUser = await tx.user.create({
          data: {
            email: input.email,
            passwordHash: passwordHash,
            role: 'CUSTOMER',
            isVerified: false,
            verificationCode: verificationCode,
          },
        });

        // 2. Tạo Sự kiện Outbox
        const eventName = 'user_created';
        const eventPayload = {
          email: createdUser.email,
          id: createdUser.id,
        };

        await tx.outboxEvent.create({
          data: {
            eventName: eventName,
            payload: eventPayload as unknown as Prisma.JsonObject,
          },
        });

        return createdUser;
      });
      // 🚀 KẾT THÚC OUTBOX PATTERN

      // Send verification email
      await this.emailService.sendUserVerification(user, verificationCode);

      const { passwordHash: _, ...result } = user;
      return result;

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email already registered');
        }
      }
      throw error;
    }
  }

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOneById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  async updateProfile(userId: string, updateData: { firstName?: string; lastName?: string; avatar?: string }) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        avatar: updateData.avatar,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Find user by Keycloak ID
   * Used for Keycloak authentication
   */
  async findByKeycloakId(keycloakId: string) {
    return this.prisma.user.findUnique({
      where: { keycloakId },
      select: {
        id: true,
        email: true,
        keycloakId: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Sync user from Keycloak token to local database
   * Auto-creates user if not exists
   */
  async syncUserFromKeycloak(keycloakUser: {
    keycloakId: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    emailVerified?: boolean;
    roles?: string[];
  }) {
    // Check if user already exists
    let user = await this.findByKeycloakId(keycloakUser.keycloakId);

    if (user) {
      // Update existing user info
      user = await this.prisma.user.update({
        where: { keycloakId: keycloakUser.keycloakId },
        data: {
          email: keycloakUser.email,
          firstName: keycloakUser.firstName,
          lastName: keycloakUser.lastName,
          isVerified: keycloakUser.emailVerified ?? false,
          // Map Keycloak admin role to ADMIN
          role: keycloakUser.roles?.includes('admin') ? 'ADMIN' : 'CUSTOMER',
        },
        select: {
          id: true,
          email: true,
          keycloakId: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else {
      // Create new user from Keycloak
      user = await this.prisma.user.create({
        data: {
          keycloakId: keycloakUser.keycloakId,
          email: keycloakUser.email,
          firstName: keycloakUser.firstName,
          lastName: keycloakUser.lastName,
          passwordHash: null, // No password for Keycloak users
          isVerified: keycloakUser.emailVerified ?? false,
          role: keycloakUser.roles?.includes('admin') ? 'ADMIN' : 'CUSTOMER',
        },
        select: {
          id: true,
          email: true,
          keycloakId: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    return user;
  }
}