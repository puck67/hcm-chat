#!/usr/bin/env python3
"""
Script đơn giản - chỉ cập nhật knowledge base và kiểm tra cơ bản
"""

import os
import sys
from dotenv import load_dotenv

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.enhanced_rag_service import EnhancedRAGService

def main():
    """Cập nhật knowledge base đơn giản"""
    
    print("🚀 CẬP NHẬT KNOWLEDGE BASE")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Kiểm tra API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY không tìm thấy trong file .env")
        return
    
    print("✅ API Key OK")
    
    # Khởi tạo RAG service
    rag_service = EnhancedRAGService()
    
    # Thống kê trước
    stats_before = rag_service.get_stats()
    print(f"📊 Trước: {stats_before['total_documents']} documents")
    
    # Cập nhật knowledge base (force update để xóa cũ)
    print("\n🔄 Đang quét tất cả file .md...")
    rag_service.update_knowledge_base(force_update=True)
    
    # Thống kê sau
    stats_after = rag_service.get_stats()
    print(f"📊 Sau: {stats_after['total_documents']} documents")
    
    # Test 1 câu hỏi đơn giản thôi
    print(f"\n🧪 Test 1 câu hỏi đơn giản...")
    try:
        result = rag_service.generate_response_with_sources("Tư tưởng Hồ Chí Minh là gì?")
        sources_count = len(result.get('sources', []))
        confidence = result.get('confidence', 0)
        print(f"✅ Test OK - {sources_count} nguồn, confidence: {confidence}%")
    except Exception as e:
        print(f"❌ Test lỗi: {e}")
    
    print(f"\n🎯 HOÀN THÀNH!")
    print(f"   • Tổng documents: {stats_after['total_documents']}")
    print(f"   • Chatbot sẵn sàng trả lời câu hỏi!")

if __name__ == "__main__":
    main()
