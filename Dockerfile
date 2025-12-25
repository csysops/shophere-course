########################################
# 1️⃣ BUILD STAGE
########################################
FROM node:20-alpine AS builder

WORKDIR /app

# Install required system deps for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (build needs devDeps)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS
RUN npm run build

########################################
# 2️⃣ PRODUCTION STAGE
########################################
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

# Set production environment
ENV NODE_ENV=production

# Copy only what is needed
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/templates ./templates

# Prisma needs this at runtime
RUN npx prisma generate

# Expose Render port
EXPOSE 3000

# Start NestJS directly
CMD ["node", "dist/main.js"]
