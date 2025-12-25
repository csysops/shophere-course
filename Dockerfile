# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy entire source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS application (creates dist directory)
RUN npm run build

# 2. Production Run Stage (Lighter, more secure)
FROM node:20-alpine

WORKDIR /app

# Copy dependencies from builder (or reinstall only production deps for lighter image)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/templates ./templates

# Expose port 3000
EXPOSE 3000

# Command to run the application
CMD [ "npm", "run", "start:prod" ]
