#!/usr/bin/env python3
"""
Test script để kiểm tra cơ chế fallback của hệ thống chatbot
Kiểm tra xem hệ thống có thể trả lời câu hỏi nằm ngoài tài liệu .md hay không
"""

import requests
import json

# Cấu hình API endpoint
API_BASE = "http://localhost:8000"

def test_question(question, description):
    """Test một câu hỏi và hiển thị kết quả"""
    print(f"\n{'='*60}")
    print(f"TEST: {description}")
    print(f"Câu hỏi: {question}")
    print('='*60)
    
    try:
        # Gửi request
        response = requests.post(
            f"{API_BASE}/chat",
            headers={"Content-Type": "application/json"},
            json={"question": question},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"✅ Trạng thái: Thành công")
            print(f"📝 Câu trả lời: {result.get('answer', 'N/A')[:200]}...")
            print(f"🔍 Nguồn tham khảo: {len(result.get('sources', []))} nguồn")
            print(f"📊 Độ tin cậy: {result.get('confidence', 0)}%")
            
            # Kiểm tra có phải fallback không (không có sources hoặc confidence thấp)
            sources = result.get('sources', [])
            confidence = result.get('confidence', 0)
            
            if not sources or confidence <= 75:
                print(f"🔄 Phát hiện: Có thể sử dụng FALLBACK (Gemini trực tiếp)")
            else:
                print(f"📚 Phát hiện: Sử dụng dữ liệu từ tài liệu .md")
                
        else:
            print(f"❌ Lỗi: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def main():
    """Chạy các test case"""
    print("🚀 BẮT ĐẦU KIỂM TRA CƠ CHẾ FALLBACK")
    
    # Test 1: Câu hỏi trong tài liệu .md
    test_question(
        "Tư tưởng Hồ Chí Minh là gì?",
        "Câu hỏi TRONG tài liệu .md (nên có sources)"
    )
    
    # Test 2: Câu hỏi ngoài tài liệu .md - Công nghệ
    test_question(
        "Bạn có biết về công nghệ AI hiện tại không?",
        "Câu hỏi NGOÀI tài liệu .md - Công nghệ AI"
    )
    
    # Test 3: Câu hỏi ngoài tài liệu .md - Thời tiết
    test_question(
        "Hôm nay thời tiết Hà Nội như thế nào?",
        "Câu hỏi NGOÀI tài liệu .md - Thời tiết"
    )
    
    # Test 4: Câu hỏi ngoài tài liệu .md - Toán học
    test_question(
        "2 + 2 bằng bao nhiêu?",
        "Câu hỏi NGOÀI tài liệu .md - Toán học cơ bản"
    )
    
    # Test 5: Câu hỏi ngoài tài liệu .md - Lịch sử thế giới
    test_question(
        "Thế chiến thứ 2 bắt đầu năm nào?",
        "Câu hỏi NGOÀI tài liệu .md - Lịch sử thế giới"
    )
    
    print(f"\n{'='*60}")
    print("🏁 KẾT THÚC KIỂM TRA")
    print("📋 KẾT LUẬN:")
    print("- Nếu câu hỏi có sources và confidence cao → Từ tài liệu .md")
    print("- Nếu câu hỏi không có sources hoặc confidence thấp → Fallback Gemini")
    print("- Hệ thống SẼ trả lời cả câu hỏi ngoài tài liệu thông qua fallback")
    print('='*60)

if __name__ == "__main__":
    main()
