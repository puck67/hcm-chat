#!/usr/bin/env python3
"""
Script cập nhật toàn bộ knowledge base với data mới từ chương 1-4
Để chatbot có thể trả lời được toàn bộ câu hỏi liên quan đến tư tưởng Hồ Chí Minh
"""

import os
import sys
from dotenv import load_dotenv

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.enhanced_rag_service import EnhancedRAGService

def main():
    """Cập nhật knowledge base với tất cả data từ chương 1-4"""
    
    print("🚀 Bắt đầu cập nhật Knowledge Base...")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    # Kiểm tra API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY không tìm thấy trong file .env")
        return
    
    print("✅ API Key đã sẵn sàng")
    
    # Khởi tạo RAG service
    rag_service = EnhancedRAGService()
    
    # Hiển thị thống kê trước khi cập nhật
    stats_before = rag_service.get_stats()
    print(f"📊 Trước cập nhật: {stats_before['total_documents']} documents")
    
    # Force update để xóa data cũ và load lại toàn bộ
    print("\n🔄 Đang cập nhật knowledge base (force update)...")
    rag_service.update_knowledge_base(force_update=True)
    
    # Hiển thị thống kê sau khi cập nhật
    stats_after = rag_service.get_stats()
    print(f"📊 Sau cập nhật: {stats_after['total_documents']} documents")
    print(f"⏰ Thời gian cập nhật: {stats_after['last_update']}")
    
    # Test một vài câu hỏi để kiểm tra
    test_questions = [
        "Tư tưởng Hồ Chí Minh là gì?",
        "Đối tượng nghiên cứu môn học tư tưởng Hồ Chí Minh?",
        "Cơ sở hình thành tư tưởng Hồ Chí Minh?",
        "Độc lập dân tộc theo Hồ Chí Minh?",
        "Vai trò của Đảng Cộng sản Việt Nam?",
        "Nhà nước của dân, do dân, vì dân?"
    ]
    
    print("\n🧪 Test một vài câu hỏi...")
    print("=" * 60)
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n{i}. Câu hỏi: {question}")
        try:
            result = rag_service.generate_response_with_sources(question)
            sources_count = len(result.get('sources', []))
            confidence = result.get('confidence', 0)
            
            # Hiển thị tóm tắt kết quả
            answer_preview = result['answer'][:200] + "..." if len(result['answer']) > 200 else result['answer']
            print(f"   ✅ Trả lời được ({sources_count} nguồn, độ tin cậy: {confidence}%)")
            print(f"   📝 Preview: {answer_preview}")
            
            if sources_count > 0:
                print(f"   📚 Nguồn chính: {result['sources'][0].get('document', 'Unknown')}")
            
        except Exception as e:
            print(f"   ❌ Lỗi: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Hoàn thành cập nhật Knowledge Base!")
    print(f"📈 Tổng cộng {stats_after['total_documents']} documents từ tất cả chương")
    print("🎯 Chatbot đã sẵn sàng trả lời câu hỏi về toàn bộ nội dung tư tưởng Hồ Chí Minh")
    
    # Hiển thị hướng dẫn sử dụng
    print("\n📋 Hướng dẫn:")
    print("- Khởi động server: python -m app.main")
    print("- Test API: POST http://localhost:8000/chat")
    print("- Reindex khi có data mới: POST http://localhost:8000/admin/reindex")

if __name__ == "__main__":
    main()
