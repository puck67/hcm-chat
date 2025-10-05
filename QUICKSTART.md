# 🚀 Quick Start Guide

## TL;DR - Chạy nhanh trong 3 bước

```bash
# 1. Clone và setup
git clone https://github.com/username/hcm-chatbot.git
cd hcm-chatbot
./scripts/setup.sh

# 2. Cấu hình API keys
nano backend/.env  # Thêm GEMINI_API_KEY và PINECONE_API_KEY

# 3. Chạy hệ thống
./scripts/start.sh
```

**🌐 Mở browser:** http://localhost:3000

---

## 📋 Scripts có sẵn

| Script | Mô tả | Sử dụng |
|--------|-------|---------|
| `./scripts/setup.sh` | Setup lần đầu | Chạy 1 lần sau khi clone |
| `./scripts/start.sh` | Khởi động hệ thống | Chạy backend + frontend |
| `./scripts/stop.sh` | Dừng hệ thống | Dừng tất cả services |
| `./scripts/restart.sh` | Khởi động lại | Stop + Start |
| `./scripts/status.sh` | Kiểm tra trạng thái | Xem system status |
| `./scripts/start-backend.sh` | Chỉ chạy backend | API server only |
| `./scripts/start-frontend.sh` | Chỉ chạy frontend | Web UI only |

---

## 🔑 Lấy API Keys

### Gemini AI
1. Đi tới https://ai.google.dev/
2. Đăng nhập Google account
3. Tạo API key mới
4. Copy key vào `GEMINI_API_KEY`

### Pinecone
1. Đi tới https://www.pinecone.io/
2. Tạo tài khoản miễn phí
3. Tạo API key trong dashboard
4. Copy key vào `PINECONE_API_KEY`

---

## 🆘 Troubleshooting nhanh

### Backend không chạy
```bash
# Kiểm tra logs
tail -f logs/backend.log

# Kiểm tra Python và virtual env
cd backend && source venv/bin/activate && python --version
```

### Frontend không kết nối
```bash
# Kiểm tra backend health
curl http://localhost:8000/health

# Kiểm tra CORS settings
grep -n "CORS" backend/app/main.py
```

### Port bị chiếm
```bash
# Kiểm tra port đang dùng
lsof -i :8000
lsof -i :3000

# Kill process chiếm port
./scripts/stop.sh
```

---

## 🎯 Test nhanh

```bash
# Kiểm tra backend API
curl -X POST "http://localhost:8000/chat" \
     -H "Content-Type: application/json" \
     -d '{"question": "Xin chào"}'

# Kiểm tra frontend
open http://localhost:3000
```

---

**📚 Xem thêm:** [README.md](README.md) để biết chi tiết đầy đủ.