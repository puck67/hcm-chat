# Frontend - HCM Chatbot

Giao diện người dùng cho chatbot tư tưởng Hồ Chí Minh.

## Cách chạy

1. **Khởi động backend trước:**
```bash
cd ../backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

2. **Mở frontend:**
```bash
cd frontend
# Mở file index.html bằng browser
open index.html
# Hoặc sử dụng Live Server nếu có VS Code
```

## Tính năng

- ✅ Giao diện chat hiện đại với gradient và animations
- ✅ Hiển thị avatar Hồ Chí Minh
- ✅ Tích hợp API với backend FastAPI
- ✅ Hiển thị sources và confidence score
- ✅ Gợi ý câu hỏi nhanh
- ✅ Responsive design cho mobile
- ✅ Loading animations và status indicators
- ✅ Auto-scroll và focus management

## Cấu trúc

- `index.html` - Cấu trúc HTML chính
- `styles.css` - Styling với modern UI
- `script.js` - Logic JavaScript và API integration
- `README.md` - Hướng dẫn sử dụng