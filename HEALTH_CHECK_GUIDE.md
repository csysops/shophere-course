# 🏥 HEALTH CHECK ENDPOINT - HƯỚNG DẪN

**Ngày triển khai**: 2025-01-27  
**Trạng thái**: ✅ Hoàn tất

---

## 📋 TỔNG QUAN

Health Check Endpoint đã được triển khai để monitor trạng thái của:
- ✅ Database (PostgreSQL)
- ✅ Redis Cache
- ✅ Application uptime
- ✅ Environment info

---

## 🔗 ENDPOINTS

### 1. `/health`
```bash
curl http://localhost:3000/health
```

### 2. `/api/health`
```bash
curl http://localhost:3000/api/health
```

**Lưu ý**: Cả hai endpoints đều hoạt động và trả về cùng kết quả.

---

## 📊 RESPONSE FORMAT

### Success Response (200 OK)
```json
{
  "status": "ok",
  "database": {
    "status": "connected",
    "responseTime": 15
  },
  "redis": {
    "status": "connected",
    "responseTime": 2
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

### Error Response (200 OK với status: "error")
```json
{
  "status": "error",
  "database": {
    "status": "error",
    "error": "Database connection failed"
  },
  "redis": {
    "status": "disconnected",
    "error": "Redis not available, using in-memory cache"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

---

## 🔍 CÁC TRẠNG THÁI

### Database Status:
- `connected`: Database đang hoạt động bình thường
- `disconnected`: Không thể kết nối database
- `error`: Có lỗi khi kiểm tra database

### Redis Status:
- `connected`: Redis đang hoạt động và cache hoạt động
- `disconnected`: Redis không có sẵn, đang dùng in-memory cache
- `error`: Có lỗi khi kiểm tra Redis

### Overall Status:
- `ok`: Database đã kết nối (Redis là optional)
- `error`: Database không kết nối được

---

## 🧪 TESTING

### Test với cURL:
```bash
# Basic health check
curl http://localhost:3000/health

# Pretty print JSON
curl http://localhost:3000/health | jq

# Check specific status
curl http://localhost:3000/health | jq '.database.status'
curl http://localhost:3000/health | jq '.redis.status'
```

### Test với Docker Healthcheck:
Docker Compose đã được cấu hình để sử dụng endpoint này:
```yaml
healthcheck:
  test: [ "CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1" ]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Test trong Browser:
Mở trình duyệt và truy cập:
```
http://localhost:3000/health
```

---

## 📈 MONITORING

### Sử dụng với Monitoring Tools:

#### 1. Prometheus:
```yaml
scrape_configs:
  - job_name: 'shopsphere-api'
    metrics_path: '/health'
    static_configs:
      - targets: ['localhost:3000']
```

#### 2. Uptime Monitoring:
- **UptimeRobot**: Monitor `/health` endpoint
- **Pingdom**: Check endpoint mỗi 1 phút
- **StatusCake**: Monitor với alerting

#### 3. Load Balancer:
Nginx có thể sử dụng health check:
```nginx
upstream backend {
    server localhost:3000;
    health_check uri=/health;
}
```

---

## 🔧 TROUBLESHOOTING

### Vấn đề: Database status = "error"

**Nguyên nhân có thể**:
- Database chưa được start
- DATABASE_URL sai
- Database connection pool đầy

**Giải pháp**:
```bash
# Kiểm tra database đang chạy
docker-compose ps postgres

# Kiểm tra connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Kiểm tra DATABASE_URL trong .env
echo $DATABASE_URL
```

### Vấn đề: Redis status = "disconnected"

**Nguyên nhân có thể**:
- Redis chưa được start
- REDIS_HOST/REDIS_PORT sai
- Redis không có sẵn (fallback về in-memory)

**Giải pháp**:
```bash
# Kiểm tra Redis đang chạy
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# Kiểm tra config
echo $REDIS_HOST
echo $REDIS_PORT
```

**Lưu ý**: Nếu Redis không có sẵn, ứng dụng vẫn hoạt động với in-memory cache, nhưng không tối ưu cho production.

---

## 🎯 BEST PRACTICES

### 1. Rate Limiting
Health check endpoint đã được exclude khỏi rate limiting trong `main.ts`:
```typescript
skip: (req) => {
  return req.path === '/api/health' || req.path === '/health';
}
```

### 2. Response Time
- Database check: Thường < 50ms
- Redis check: Thường < 10ms
- Nếu response time > 100ms → có thể có vấn đề

### 3. Monitoring Frequency
- **Development**: Check mỗi 30 giây
- **Production**: Check mỗi 10-15 giây
- **Critical systems**: Check mỗi 5 giây

---

## 📝 FILES ĐÃ TẠO

1. ✅ `src/health/health.service.ts` - Logic kiểm tra health
2. ✅ `src/health/health.controller.ts` - HTTP endpoints
3. ✅ `src/health/health.module.ts` - Module configuration
4. ✅ `src/app.module.ts` - Đã import HealthModule

---

## ✅ CHECKLIST

- [x] Health check endpoint `/health`
- [x] Health check endpoint `/api/health`
- [x] Database connection check
- [x] Redis connection check
- [x] Uptime tracking
- [x] Environment info
- [x] Error handling
- [x] Response time measurement
- [x] Exclude khỏi rate limiting
- [x] Docker healthcheck compatible

---

## 🚀 NEXT STEPS

Sau khi có Health Check, bạn có thể:
1. ✅ Setup monitoring với Prometheus
2. ✅ Configure alerting khi health check fail
3. ✅ Setup load balancer với health checks
4. ✅ Monitor uptime và response times

---

**Cập nhật lần cuối**: 2025-01-27


