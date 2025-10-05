# 🇻🇳 HCM Chatbot - Hướng dẫn cài đặt và sử dụng

## 🎯 Tổng quan hệ thống

Hệ thống HCM Chatbot đã được tích hợp hoàn chỉnh với 3 thành phần chính:

```
Frontend (port 3000) ←→ .NET API (port 5000) ←→ Python AI (port 8000)
                              ↓
                         PostgreSQL Database
```

### ✅ Các tính năng đã hoàn thiện:

- **🔐 Authentication System**: Đăng ký, đăng nhập với JWT
- **💬 Chat Interface**: Giao diện chat như ChatGPT
- **📚 RAG AI**: Tích hợp Python AI với Gemini
- **💾 Lưu lịch sử**: Conversations và messages trong database
- **👤 User Management**: Quản lý user và admin dashboard
- **📱 Responsive Design**: Hỗ trợ mobile và desktop

## 🚀 Cách chạy hệ thống

### 1️⃣ Khởi động Database
```bash
# Đảm bảo PostgreSQL đang chạy
pg_isready -h localhost -p 5432

# Database sẽ tự động được tạo khi chạy .NET API
```

### 2️⃣ Khởi động .NET API
```bash
cd dotnet-api/hcm-chatbot-api
dotnet run --project Web_API/Web_API.csproj
```
- 🌐 Chạy trên: `http://localhost:5000`
- 📋 Swagger UI: `http://localhost:5000/swagger`

### 3️⃣ Khởi động Python AI Backend
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- 🌐 Chạy trên: `http://localhost:8000`
- 📋 API Docs: `http://localhost:8000/docs`

### 4️⃣ Khởi động Frontend
```bash
cd frontend
python3 -m http.server 3000
```
- 🌐 Chạy trên: `http://localhost:3000`

## 👤 Tài khoản mặc định

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`
- **Email**: `admin@hcmchatbot.com`

> Tài khoản admin sẽ tự động được tạo khi chạy .NET API lần đầu

## 🌐 Cách sử dụng

### 1. Truy cập trang chủ
Mở trình duyệt và truy cập: `http://localhost:3000/welcome.html`

### 2. Đăng ký tài khoản mới
- Click "Đăng ký"
- Điền thông tin: username, email, fullname, password
- Click "Đăng ký"

### 3. Đăng nhập
- Chuyển sang tab "Đăng nhập"
- Nhập username và password
- Click "Đăng nhập"

### 4. Sử dụng Chat
- Sau khi đăng nhập thành công, sẽ được chuyển đến trang chat
- Giao diện bao gồm:
  - **Sidebar**: Danh sách cuộc trò chuyện, tạo chat mới
  - **Main Area**: Khu vực chat chính
  - **Input Area**: Nhập tin nhắn

### 5. Tính năng Chat
- **Tạo cuộc trò chuyện mới**: Click "Cuộc trò chuyện mới"
- **Gửi tin nhắn**: Nhập câu hỏi về tư tưởng Hồ Chí Minh
- **Xem lịch sử**: Click vào cuộc trò chuyện trong sidebar
- **Xóa cuộc trò chuyện**: Click icon thùng rác

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Thông tin user hiện tại

### Chat
- `POST /api/chat/send` - Gửi tin nhắn
- `GET /api/chat/conversations` - Lấy danh sách cuộc trò chuyện
- `GET /api/chat/conversations/{id}/messages` - Lấy tin nhắn của cuộc trò chuyện
- `DELETE /api/chat/conversations/{id}` - Xóa cuộc trò chuyện

### Health Check
- `GET /health` - Kiểm tra trạng thái hệ thống

## 🏗️ Kiến trúc chi tiết

### Frontend Files
```
frontend/
├── welcome.html      # Trang chủ
├── auth.html         # Đăng nhập/đăng ký
├── chat.html         # Giao diện chat chính
├── chat.js           # JavaScript cho chat
└── index.html        # Legacy (redirect to auth)
```

### .NET API Structure
```
dotnet-api/hcm-chatbot-api/
├── Web_API/Controllers/
│   ├── AuthController.cs      # Authentication
│   ├── ChatController.cs      # Chat tích hợp AI
│   ├── UsersController.cs     # User management
│   └── DashboardController.cs # Admin dashboard
├── Models/             # Database models
├── Services/           # Business logic
└── Data/              # Database context
```

### Python AI Backend
```
backend/
├── app/
│   ├── main.py                    # FastAPI app
│   └── services/
│       ├── enhanced_rag_service.py # RAG system
│       └── vector_store.py        # Vector database
└── venv/                          # Virtual environment
```

## 🔄 Flow hoạt động

1. **User đăng nhập** → Frontend → .NET API → JWT Token
2. **User gửi chat** → Frontend → .NET API → Python AI → Response
3. **Lưu tin nhắn** → .NET API → PostgreSQL Database
4. **Load lịch sử** → Frontend → .NET API → Database

## 🐛 Troubleshooting

### Lỗi kết nối database
```bash
# Kiểm tra PostgreSQL
pg_isready -h localhost -p 5432

# Kiểm tra database tồn tại
psql -h localhost -U postgres -c "\l" | grep hcm_chatbot
```

### Lỗi .NET API
```bash
# Build lại project
dotnet build Web_API/Web_API.csproj

# Kiểm tra logs
dotnet run --project Web_API/Web_API.csproj --verbosity normal
```

### Lỗi Python AI
```bash
# Activate virtual environment
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Check logs
python -m uvicorn backend.app.main:app --reload
```

### Lỗi Frontend
```bash
# Kiểm tra CORS settings trong .NET API
# Đảm bảo localhost:3000 có trong allowedOrigins

# Test API connectivity
curl http://localhost:5000/health
curl http://localhost:8000/health
```

## 📊 Database Schema

### Tables
- **users**: Thông tin người dùng
- **conversations**: Cuộc trò chuyện
- **messages**: Tin nhắn (user + assistant)
- **daily_stats**: Thống kê hàng ngày

### Key Features
- **JSONB support**: Lưu sources của AI response
- **Confidence scores**: Độ tin cậy của câu trả lời
- **Automatic timestamps**: Created/updated timestamps
- **Optimized indexes**: Performance tuning

## 🎉 Kết luận

Hệ thống HCM Chatbot đã được tích hợp hoàn chỉnh với:
- ✅ Authentication & User Management
- ✅ Real-time Chat với AI
- ✅ Lưu trữ lịch sử chat
- ✅ RAG system với tư tưởng Hồ Chí Minh
- ✅ Responsive design
- ✅ Admin dashboard capabilities

**🚀 Ready to use như ChatGPT!**