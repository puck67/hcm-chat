# 🇻🇳 HCM Chatbot - Hệ thống Chat AI Hoàn chỉnh

> Nền tảng ChatGPT về tư tưởng Hồ Chí Minh với Authentication, Database và Admin Dashboard

![Vietnam Flag](https://img.shields.io/badge/🇻🇳-Vietnam-red?style=for-the-badge)
![.NET](https://img.shields.io/badge/.NET-8.0-blue?style=for-the-badge&logo=dotnet)
![Python](https://img.shields.io/badge/Python-3.8+-green?style=for-the-badge&logo=python)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue?style=for-the-badge&logo=postgresql)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript)

## 📖 Mô tả dự án

HCM Chatbot là hệ thống chat AI hoàn chỉnh như ChatGPT, được thiết kế riêng để trao đổi về tư tưởng Chủ tịch Hồ Chí Minh. Hệ thống tích hợp 3 thành phần chính: .NET Web API, Python AI Backend và Frontend hiện đại với đầy đủ tính năng authentication, lưu trữ lịch sử chat và admin dashboard.

### ✨ Tính năng hoàn chỉnh

- 🔐 **Authentication System** với JWT và .NET Identity
- 💬 **ChatGPT-like Interface** với lịch sử cuộc trò chuyện
- 🤖 **AI RAG System** tích hợp Gemini AI
- 💾 **PostgreSQL Database** lưu trữ toàn bộ dữ liệu
- 👤 **User Management** và Admin Dashboard
- 📱 **Responsive Design** hỗ trợ mobile/desktop
- ⚡ **Real-time Chat** với typing indicators
- 📊 **Confidence Score** và source citation
- 🔄 **Conversation Management** tạo/xóa cuộc trò chuyện
- 🛡️ **Security** với CORS, authentication middleware

## 🏗️ Kiến trúc hệ thống

```
Frontend (port 3000) ←→ .NET API (port 5000) ←→ Python AI (port 8000)
                              ↓
                         PostgreSQL Database
```

### 📁 Cấu trúc thư mục

```
hcm-chatbot/
├── frontend/                    # Frontend Web Application
│   ├── welcome.html            # Trang chủ hệ thống
│   ├── auth.html              # Đăng ký/đăng nhập
│   ├── chat.html              # Giao diện chat chính
│   ├── chat.js                # JavaScript chat functionality
│   └── styles/                # CSS styling
├── dotnet-api/                 # .NET 8 Web API
│   └── hcm-chatbot-api/
│       ├── Web_API/           # API Controllers
│       │   ├── Controllers/   # Auth, Chat, Users, Dashboard
│       │   ├── Program.cs     # API configuration
│       │   └── Web_API.csproj
│       ├── Models/            # Database models & DTOs
│       ├── Services/          # Business logic services
│       ├── Repositories/      # Data access layer
│       └── Data/             # Database context
├── backend/                   # Python AI Backend
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   └── services/
│   │       ├── enhanced_rag_service.py  # RAG AI system
│   │       └── vector_store.py          # Vector database
│   ├── requirements.txt      # Python dependencies
│   └── venv/                # Virtual environment
├── start-all.sh             # 🚀 Khởi động toàn bộ hệ thống
├── stop-all.sh              # 🛑 Dừng toàn bộ hệ thống
├── status.sh                # 📊 Kiểm tra trạng thái
├── SETUP_GUIDE.md           # Hướng dẫn chi tiết
└── README.md                # File này
```

## 🚀 Cài đặt và chạy hệ thống

### ⚡ Khởi động nhanh

**Chỉ cần 1 lệnh để chạy toàn bộ hệ thống:**

```bash
./start-all.sh
```

**Dừng hệ thống:**

```bash
./stop-all.sh
```

**Kiểm tra trạng thái:**

```bash
./status.sh
```

### 📋 Yêu cầu hệ thống

- **PostgreSQL** 16+ (phải chạy trước)
- **.NET** 8.0+
- **Python** 3.8+
- **Git**
- **API Keys**: Gemini AI (cho Python AI backend)

### 🗄️ Cài đặt PostgreSQL

```bash
# macOS (với Homebrew)
brew install postgresql@16
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-16

# Windows
# Download từ https://www.postgresql.org/download/
```

### 1️⃣ Clone và Setup

```bash
git clone <repository-url>
cd hcm-chatbot

# Cấp quyền thực thi cho scripts
chmod +x *.sh
```

### 2️⃣ Cấu hình Backend AI (tùy chọn)

Nếu muốn sử dụng AI, cần setup Gemini API:

```bash
# Tạo file .env trong backend/
cd backend
cp .env.example .env

# Thêm Gemini API key vào .env
echo "GEMINI_API_KEY=your_api_key_here" >> .env
```

**Lấy Gemini API Key tại:** https://ai.google.dev/

## 🌐 Truy cập hệ thống

Sau khi chạy `./start-all.sh`, truy cập:

- **🌐 Frontend**: http://localhost:3000/welcome.html
- **🔗 .NET API**: http://localhost:9000/swagger
- **🤖 Python AI**: http://localhost:8000/docs
- **💾 Health Check**: http://localhost:9000/health

## 👤 Tài khoản mặc định

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin với full quyền

> Tài khoản admin được tự động tạo khi khởi động .NET API lần đầu

## 📱 Hướng dẫn sử dụng

### 1. Truy cập trang chủ
Mở: http://localhost:3000/welcome.html

### 2. Đăng ký tài khoản
- Click "Đăng ký"
- Điền: username, email, fullname, password
- Click "Đăng ký"

### 3. Đăng nhập
- Chuyển tab "Đăng nhập"
- Nhập username/password
- Click "Đăng nhập"

### 4. Sử dụng Chat
- **Sidebar**: Danh sách cuộc trò chuyện, tạo chat mới
- **Main Area**: Khu vực chat chính
- **Input Area**: Nhập tin nhắn

### 5. Tính năng Chat
- **Tạo cuộc trò chuyện mới**: Click "Cuộc trò chuyện mới"
- **Gửi tin nhắn**: Nhập câu hỏi về tư tưởng Hồ Chí Minh
- **Xem lịch sử**: Click vào cuộc trò chuyện trong sidebar
- **Xóa cuộc trò chuyện**: Click icon thùng rác

### 🎯 Gợi ý câu hỏi
- "Tư tưởng Hồ Chí Minh về độc lập dân tộc là gì?"
- "Quan điểm của Bác Hồ về đạo đức cách mạng?"
- "Tư tưởng Hồ Chí Minh về giáo dục và văn hóa?"

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Thông tin user hiện tại

### Chat
- `POST /api/chat/send` - Gửi tin nhắn
- `GET /api/chat/conversations` - Lấy danh sách cuộc trò chuyện
- `GET /api/chat/conversations/{id}/messages` - Lấy tin nhắn
- `DELETE /api/chat/conversations/{id}` - Xóa cuộc trò chuyện

### Health Check
- `GET /health` - Kiểm tra trạng thái hệ thống

## 🔄 Workflow hoạt động

1. **User đăng nhập** → Frontend → .NET API → JWT Token
2. **User gửi chat** → Frontend → .NET API → Python AI → Response
3. **Lưu tin nhắn** → .NET API → PostgreSQL Database
4. **Load lịch sử** → Frontend → .NET API → Database

## 🧪 Testing & Development

### Kiểm tra API

```bash
# Health check
curl http://localhost:9000/health
curl http://localhost:8000/health

# Test auth
curl -X POST "http://localhost:9000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "admin123"}'
```

### Development Mode

```bash
# .NET API với hot reload
cd dotnet-api/hcm-chatbot-api
dotnet watch --project Web_API/Web_API.csproj

# Python AI với auto-reload
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend với live server
cd frontend
python3 -m http.server 3000
```

## 🔧 Troubleshooting

### Lỗi thường gặp

#### 1. PostgreSQL không chạy
```bash
# Kiểm tra PostgreSQL
pg_isready -h localhost -p 5432

# Khởi động PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

#### 2. .NET API lỗi build
```bash
# Build lại project
cd dotnet-api/hcm-chatbot-api
dotnet build Web_API/Web_API.csproj

# Restore packages
dotnet restore
```

#### 3. Python AI không khởi động
```bash
# Kiểm tra virtual environment
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

#### 4. Port đã được sử dụng
```bash
# Kiểm tra ports
lsof -i :3000  # Frontend
lsof -i :5000  # .NET API
lsof -i :8000  # Python AI

# Kill processes
./stop-all.sh
```

### Logs
```bash
# Xem logs
tail -f logs/dotnet-api.log
tail -f logs/python-ai.log
tail -f logs/frontend.log
```

## 📊 Database Schema

### Tables
- **users**: Thông tin người dùng, authentication
- **conversations**: Cuộc trò chuyện của user
- **messages**: Tin nhắn (user + assistant)
- **daily_stats**: Thống kê hàng ngày

### Key Features
- **JSONB support**: Lưu sources của AI response
- **Confidence scores**: Độ tin cậy của câu trả lời
- **Automatic timestamps**: Created/updated timestamps
- **JWT Authentication**: Secure login system

## 🎉 Kết luận

Hệ thống HCM Chatbot đã hoàn thiện với kiến trúc microservices:

✅ **Authentication & User Management** với JWT
✅ **ChatGPT-like Interface** với real-time chat
✅ **RAG AI System** tích hợp Gemini
✅ **PostgreSQL Database** lưu trữ persistent
✅ **Admin Dashboard** quản lý user
✅ **Responsive Design** mobile-friendly
✅ **One-command Startup** với bash scripts

### 🚀 Quick Start Summary

```bash
# 1. Khởi động PostgreSQL
brew services start postgresql

# 2. Clone và setup
git clone <repo>
cd hcm-chatbot
chmod +x *.sh

# 3. Chạy hệ thống
./start-all.sh

# 4. Truy cập
open http://localhost:3000/welcome.html

# 5. Đăng nhập admin
# Username: admin
# Password: admin123
```

**🇻🇳 Ready to use như ChatGPT! 🇻🇳**

---

**📋 Commands:**
- `./start-all.sh` - Khởi động toàn bộ
- `./stop-all.sh` - Dừng toàn bộ
- `./status.sh` - Kiểm tra trạng thái
- `SETUP_GUIDE.md` - Hướng dẫn chi tiết

*"Không có gì quý hơn độc lập tự do"* - Hồ Chí Minh
