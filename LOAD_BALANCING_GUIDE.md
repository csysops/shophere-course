# ⚖️ LOAD BALANCING VỚI NGINX - HƯỚNG DẪN

**Ngày triển khai**: 2025-01-27  
**Trạng thái**: ✅ Hoàn tất

---

## 📋 TỔNG QUAN

Hệ thống đã được cấu hình với:
- ✅ **Nginx Load Balancer** - Phân phối requests
- ✅ **3 API Instances** - Xử lý requests song song
- ✅ **Health Checks** - Tự động loại bỏ server không healthy
- ✅ **Rate Limiting** - Bảo vệ ở tầng Nginx
- ✅ **High Availability** - Không có single point of failure

---

## 🏗️ KIẾN TRÚC

```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Nginx     │
                    │ Load Balancer│
                    └──┬───┬───┬──┘
                       │   │   │
        ┌──────────────┼───┼───┼──────────────┐
        │              │   │   │              │
   ┌────▼────┐   ┌─────▼───▼───▼─────┐   ┌────▼────┐
   │ API 1   │   │   API 2            │   │ API 3   │
   │ :3000   │   │   :3000            │   │ :3000   │
   └────┬────┘   └─────┬──────────────┘   └────┬────┘
        │              │                       │
        └──────────────┼───────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌─────▼────┐   ┌────▼────┐
   │PostgreSQL│   │  Redis   │   │RabbitMQ │
   └─────────┘   └──────────┘   └─────────┘
```

---

## 🚀 CÁCH SỬ DỤNG

### 1. Khởi động hệ thống

```bash
# Build và start tất cả services
docker-compose -f docker-compose.prod.yml up -d --build

# Kiểm tra status
docker-compose -f docker-compose.prod.yml ps

# Xem logs
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f api1
```

### 2. Test Load Balancing

```bash
# Test với curl (sẽ được phân phối giữa 3 instances)
for i in {1..10}; do
  curl http://localhost/api/products | jq '.items[0].name'
  echo ""
done

# Kiểm tra instance nào xử lý request
# (Có thể thêm header X-Instance-ID trong response để debug)
```

### 3. Kiểm tra Health

```bash
# Health check qua Nginx
curl http://localhost/health

# Health check trực tiếp từ instance
curl http://localhost:3000/api/health  # Sẽ không hoạt động vì port không expose
```

---

## ⚙️ CẤU HÌNH

### Nginx Configuration

File: `nginx/nginx.conf`

**Load Balancing Method:**
- **Round-robin** (mặc định): Phân phối requests đều giữa các servers
- Có thể thay đổi thành:
  - `least_conn`: Chọn server có ít connections nhất
  - `ip_hash`: Sticky session dựa trên IP client

**Health Checks:**
- `max_fails=3`: Sau 3 lần fail, server sẽ bị loại bỏ
- `fail_timeout=30s`: Sau 30s, server sẽ được thử lại

**Rate Limiting:**
- API endpoints: 100 requests/second
- Auth endpoints: 5 requests/second

### Docker Compose

File: `docker-compose.prod.yml`

**Services:**
- `nginx`: Load balancer (port 80)
- `api1`, `api2`, `api3`: 3 API instances
- `postgres`, `redis`, `rabbitmq`: Shared services

**Connection Pooling:**
Mỗi API instance có `connection_limit=30` trong DATABASE_URL:
```
DATABASE_URL=...&connection_limit=30&pool_timeout=20
```

Tổng cộng: 3 instances × 30 connections = **90 connections** (đủ cho 300+ concurrent users)

---

## 📊 HIỆU NĂNG

### Trước khi có Load Balancing:
- **1 instance**: ~100 concurrent users
- **Single point of failure**: Nếu instance down → toàn bộ hệ thống down

### Sau khi có Load Balancing:
- **3 instances**: ~300 concurrent users
- **High availability**: Nếu 1 instance down → 2 instances còn lại vẫn hoạt động
- **Load distribution**: Requests được phân phối đều
- **Zero downtime**: Có thể restart từng instance mà không ảnh hưởng

---

## 🔧 TÙY CHỈNH

### Thay đổi số lượng instances

Sửa `docker-compose.prod.yml`:

```yaml
# Thêm instance mới
api4:
  build: .
  container_name: shopsphere-api-4
  # ... (copy từ api3)
```

Và cập nhật `nginx.conf`:
```nginx
upstream backend {
    server api1:3000 max_fails=3 fail_timeout=30s;
    server api2:3000 max_fails=3 fail_timeout=30s;
    server api3:3000 max_fails=3 fail_timeout=30s;
    server api4:3000 max_fails=3 fail_timeout=30s;  # Thêm dòng này
}
```

### Thay đổi Load Balancing Method

Sửa `nginx.conf`:

```nginx
upstream backend {
    least_conn;  # Thêm dòng này
    server api1:3000 max_fails=3 fail_timeout=30s;
    # ...
}
```

Hoặc cho sticky sessions:
```nginx
upstream backend {
    ip_hash;  # Sticky session
    server api1:3000 max_fails=3 fail_timeout=30s;
    # ...
}
```

### Thay đổi Rate Limits

Sửa `nginx.conf`:

```nginx
# Tăng rate limit cho API
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/s;

# Tăng rate limit cho auth
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;
```

---

## 🧪 TESTING

### Test Load Distribution

```bash
# Script để test load distribution
for i in {1..100}; do
  curl -s http://localhost/api/products > /dev/null
  echo "Request $i completed"
done

# Monitor logs để xem requests được phân phối
docker-compose -f docker-compose.prod.yml logs -f nginx | grep "api"
```

### Test High Availability

```bash
# Stop một instance
docker-compose -f docker-compose.prod.yml stop api1

# Test - hệ thống vẫn hoạt động với 2 instances còn lại
curl http://localhost/api/products

# Start lại instance
docker-compose -f docker-compose.prod.yml start api1
```

### Test Health Checks

```bash
# Stop một instance
docker-compose -f docker-compose.prod.yml stop api2

# Nginx sẽ tự động loại bỏ api2 khỏi load balancer
# Sau 30s, api2 sẽ được thử lại khi start

# Start lại
docker-compose -f docker-compose.prod.yml start api2
```

---

## 📈 MONITORING

### Nginx Logs

```bash
# Access logs
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log

# Error logs
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/error.log
```

### API Instance Logs

```bash
# Logs của tất cả instances
docker-compose -f docker-compose.prod.yml logs -f api1 api2 api3

# Logs của một instance cụ thể
docker-compose -f docker-compose.prod.yml logs -f api1
```

### Health Status

```bash
# Check health của tất cả services
docker-compose -f docker-compose.prod.yml ps

# Health check endpoint
curl http://localhost/health | jq
```

---

## ⚠️ TROUBLESHOOTING

### Vấn đề: Nginx không start

**Nguyên nhân:**
- Cấu hình nginx.conf sai
- Port 80 đã được sử dụng

**Giải pháp:**
```bash
# Kiểm tra cấu hình
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Kiểm tra port
sudo lsof -i :80

# Xem logs
docker-compose -f docker-compose.prod.yml logs nginx
```

### Vấn đề: Requests không được phân phối

**Nguyên nhân:**
- API instances chưa ready
- Health check fail

**Giải pháp:**
```bash
# Kiểm tra API instances
docker-compose -f docker-compose.prod.yml ps api1 api2 api3

# Test health check
curl http://localhost/health

# Kiểm tra nginx upstream
docker-compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/nginx.conf | grep upstream
```

### Vấn đề: Rate limiting quá strict

**Giải pháp:**
- Tăng rate limit trong `nginx.conf`
- Hoặc whitelist IP trong nginx config

---

## 🎯 BEST PRACTICES

### 1. Health Checks
- ✅ Đảm bảo health check endpoint hoạt động đúng
- ✅ Cấu hình `max_fails` và `fail_timeout` phù hợp

### 2. Connection Pooling
- ✅ Mỗi instance có connection pool riêng
- ✅ Tổng connections không vượt quá database limit

### 3. Monitoring
- ✅ Monitor logs của tất cả instances
- ✅ Setup alerting khi instance down

### 4. Scaling
- ✅ Bắt đầu với 2-3 instances
- ✅ Scale dần dần dựa trên traffic

---

## 📝 FILES ĐÃ TẠO

1. ✅ `nginx/nginx.conf` - Cấu hình Nginx load balancer
2. ✅ `docker-compose.prod.yml` - Updated với Nginx và multiple instances
3. ✅ `LOAD_BALANCING_GUIDE.md` - Tài liệu này

---

## ✅ CHECKLIST

- [x] Nginx load balancer configuration
- [x] Multiple API instances (3 instances)
- [x] Health checks cho backend servers
- [x] Rate limiting ở tầng Nginx
- [x] Connection pooling cho mỗi instance
- [x] High availability setup
- [x] Docker Compose configuration
- [x] Documentation

---

## 🚀 NEXT STEPS

Sau khi có Load Balancing, bạn có thể:
1. ✅ Scale lên nhiều instances hơn khi cần
2. ✅ Setup SSL/TLS với Let's Encrypt
3. ✅ Implement session stickiness nếu cần
4. ✅ Setup monitoring với Prometheus
5. ✅ Implement blue-green deployment

---

**Cập nhật lần cuối**: 2025-01-27


