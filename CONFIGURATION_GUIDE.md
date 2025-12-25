# HƯỚNG DẪN CẤU HÌNH CHO 100 CONCURRENT USERS

## 📋 Tổng quan

Sau khi triển khai các cải thiện, project đã được cấu hình để xử lý 100+ người dùng đồng thời. Tài liệu này hướng dẫn cách cấu hình môi trường.

---

## 🔧 1. CẤU HÌNH DATABASE CONNECTION POOL

### Cách 1: Thêm vào DATABASE_URL (Khuyến nghị)

Cập nhật file `.env`:

```env
# Trước (không có connection pool)
DATABASE_URL="postgresql://user:password@localhost:5432/shop_db?schema=public"

# Sau (có connection pool - đủ cho 100 users)
DATABASE_URL="postgresql://user:password@localhost:5432/shop_db?schema=public&connection_limit=30&pool_timeout=20"
```

**Giải thích tham số:**
- `connection_limit=30`: Số kết nối tối đa trong pool (đủ cho 100 concurrent users)
- `pool_timeout=20`: Thời gian chờ (giây) khi pool đầy

### Cách 2: Cấu hình trong PostgreSQL

Nếu muốn tăng connection limit ở database level:

```sql
-- Kiểm tra current settings
SHOW max_connections;

-- Tăng max_connections (cần restart PostgreSQL)
-- Sửa trong postgresql.conf:
max_connections = 200
```

---

## 🔴 2. CẤU HÌNH REDIS

### Kiểm tra Redis đang chạy

```bash
# Với Docker Compose
docker-compose ps redis

# Hoặc kiểm tra trực tiếp
redis-cli ping
# Nếu trả về "PONG" thì Redis đang chạy
```

### Cấu hình trong .env

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Nếu Redis có password
REDIS_PASSWORD=your_password
```

### Lưu ý:
- Nếu Redis không có sẵn, ứng dụng sẽ tự động fallback về in-memory cache
- In-memory cache không share giữa các instances → nên dùng Redis trong production

---

## 🛡️ 3. CẤU HÌNH RATE LIMITING

Rate limiting đã được cấu hình với các giới hạn sau:

| Endpoint | Window | Max Requests | Mục đích |
|----------|--------|--------------|----------|
| `/api/*` (Global) | 15 phút | 1000 | Bảo vệ API chung |
| `/api/auth/login` | 15 phút | 5 | Chống brute force |
| `/api/auth/register` | 1 giờ | 3 | Chống spam đăng ký |
| `/api/auth/forgot-password` | 1 giờ | 3 | Chống spam reset password |

### Tùy chỉnh Rate Limit

Thêm vào `.env`:

```env
# Rate Limiting Configuration
RATE_LIMIT_MAX=1000  # Số requests tối đa cho global limiter (mặc định: 1000)
```

---

## 📊 4. KIỂM TRA CẤU HÌNH

### Test Redis Connection

```bash
# Chạy ứng dụng và kiểm tra logs
npm run start:dev

# Nếu thấy log: "Redis connection failed, falling back to in-memory cache"
# → Redis chưa được cấu hình đúng
```

### Test Database Connection Pool

```bash
# Kiểm tra số connections đang sử dụng
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'shop_db';"
```

### Test Rate Limiting

```bash
# Test với curl (gửi nhiều requests)
for i in {1..10}; do
  curl -X GET http://localhost:3000/api/products
  echo ""
done

# Request thứ 11 sẽ bị rate limit (nếu vượt quá giới hạn)
```

---

## 🚀 5. DEPLOYMENT CHECKLIST

### Development:
- [x] Redis Cache đã được cấu hình
- [x] Database Connection Pool đã được tăng
- [x] Rate Limiting đã được implement
- [ ] Redis đang chạy (kiểm tra với `docker-compose ps`)
- [ ] DATABASE_URL có `connection_limit=30`

### Production:
- [ ] Redis được cấu hình với password
- [ ] DATABASE_URL có connection pooling
- [ ] Rate limiting được điều chỉnh phù hợp với traffic
- [ ] Monitoring và logging được setup
- [ ] Load balancing được cấu hình (nếu có nhiều instances)

---

## 📈 6. MONITORING & METRICS

### Kiểm tra Performance

```bash
# Sử dụng Apache Bench để test
ab -n 10000 -c 100 http://localhost:3000/api/products

# Hoặc sử dụng k6
k6 run --vus 100 --duration 30s load-test.js
```

### Metrics cần theo dõi:
- **Response Time**: P50, P95, P99
- **Database Connections**: Số connections đang sử dụng
- **Cache Hit Rate**: Tỷ lệ cache hit
- **Rate Limit Hits**: Số requests bị rate limit

---

## ⚠️ 7. TROUBLESHOOTING

### Vấn đề: Redis connection failed

**Nguyên nhân:**
- Redis chưa được start
- REDIS_HOST/REDIS_PORT sai
- Firewall chặn port 6379

**Giải pháp:**
```bash
# Start Redis
docker-compose up -d redis

# Kiểm tra connection
redis-cli -h localhost -p 6379 ping
```

### Vấn đề: Database connection timeout

**Nguyên nhân:**
- Connection pool quá nhỏ
- Database max_connections quá thấp

**Giải pháp:**
```env
# Tăng connection_limit trong DATABASE_URL
DATABASE_URL="...&connection_limit=50&pool_timeout=30"
```

### Vấn đề: Rate limit quá strict

**Giải pháp:**
```env
# Tăng RATE_LIMIT_MAX trong .env
RATE_LIMIT_MAX=2000
```

---

## 📚 8. TÀI LIỆU THAM KHẢO

- [Prisma Connection Pooling](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)

---

**Cập nhật lần cuối**: 2025-01-27

