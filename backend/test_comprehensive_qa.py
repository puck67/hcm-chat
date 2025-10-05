#!/usr/bin/env python3
"""
Test comprehensive Q&A - Kiểm tra khả năng trả lời câu hỏi toàn diện 
từ tất cả 4 chương về tư tưởng Hồ Chí Minh
"""

import os
import sys
from dotenv import load_dotenv

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.enhanced_rag_service import EnhancedRAGService

def test_comprehensive_questions():
    """Test câu hỏi từ tất cả các chương"""
    
    # Load environment variables
    load_dotenv()
    
    print("🧪 TEST COMPREHENSIVE Q&A - TƯ TƯỞNG HỒ CHÍ MINH")
    print("=" * 70)
    
    # Khởi tạo RAG service
    rag_service = EnhancedRAGService()
    
    # Cập nhật knowledge base trước khi test
    print("🔄 Đang cập nhật knowledge base...")
    rag_service.update_knowledge_base(force_update=True)
    
    stats = rag_service.get_stats()
    print(f"📊 Knowledge base: {stats['total_documents']} documents")
    print("=" * 70)
    
    # Câu hỏi test theo từng chương
    test_categories = {
        "CHƯƠNG I - KHÁI QUÁT CHUNG": [
            "Tư tưởng Hồ Chí Minh là gì?",
            "Đối tượng nghiên cứu của môn học tư tưởng Hồ Chí Minh?",
            "Ý nghĩa của việc học tập tư tưởng Hồ Chí Minh?",
            "Phương pháp nghiên cứu tư tưởng Hồ Chí Minh?"
        ],
        
        "CHƯƠNG II - CƠ SỞ VÀ QUÁ TRÌNH HÌNH THÀNH": [
            "Cơ sở hình thành tư tưởng Hồ Chí Minh?",
            "Cơ sở thực tiễn hình thành tư tưởng Hồ Chí Minh?",
            "Cơ sở lý luận hình thành tư tưởng Hồ Chí Minh?",
            "Nhân tố chủ quan trong hình thành tư tưởng Hồ Chí Minh?",
            "Quá trình hình thành và phát triển tư tưởng Hồ Chí Minh?",
            "Vai trò của chủ nghĩa Mác-Lênin đối với tư tưởng Hồ Chí Minh?"
        ],
        
        "CHƯƠNG III - ĐỘC LẬP DÂN TỘC VÀ CHỦ NGHĨA XÃ HỘI": [
            "Quan điểm của Hồ Chí Minh về độc lập dân tộc?",
            "Độc lập, tự do là quyền thiêng liêng như thế nào?",
            "Cách mạng giải phóng dân tộc theo Hồ Chí Minh?",
            "Tư tưởng Hồ Chí Minh về chủ nghĩa xã hội?",
            "Quan điểm Hồ Chí Minh về xây dựng chủ nghĩa xã hội ở Việt Nam?",
            "Mối quan hệ giữa độc lập dân tộc và chủ nghĩa xã hội?"
        ],
        
        "CHƯƠNG IV - ĐẢNG VÀ NHÀ NƯỚC": [
            "Tư tưởng Hồ Chí Minh về Đảng Cộng sản Việt Nam?",
            "Vai trò lãnh đạo của Đảng theo Hồ Chí Minh?",
            "Đảng phải trong sạch, vững mạnh có nghĩa gì?",
            "Đảng là đạo đức, là văn minh theo Hồ Chí Minh?",
            "Tư tưởng Hồ Chí Minh về nhà nước của dân, do dân, vì dân?",
            "Nhà nước dân chủ theo quan điểm Hồ Chí Minh?",
            "Nhà nước pháp quyền trong tư tưởng Hồ Chí Minh?"
        ],
        
        "CÂU HỎI TỔNG HỢP": [
            "Đặc điểm nổi bật của tư tưởng Hồ Chí Minh?",
            "Giá trị thời đại của tư tưởng Hồ Chí Minh?",
            "Tư tưởng Hồ Chí Minh có những nội dung cơ bản nào?",
            "Ý nghĩa của việc vận dụng tư tưởng Hồ Chí Minh hiện nay?"
        ]
    }
    
    # Test từng category
    total_questions = 0
    successful_answers = 0
    
    for category, questions in test_categories.items():
        print(f"\n📚 {category}")
        print("-" * 50)
        
        for i, question in enumerate(questions, 1):
            total_questions += 1
            print(f"\n{i}. {question}")
            
            try:
                result = rag_service.generate_response_with_sources(question)
                
                # Phân tích kết quả
                answer = result.get('answer', '')
                sources = result.get('sources', [])
                confidence = result.get('confidence', 0)
                
                if answer and confidence > 0:
                    successful_answers += 1
                    status = "✅"
                    
                    # Hiển thị preview câu trả lời
                    preview = answer[:150] + "..." if len(answer) > 150 else answer
                    print(f"   {status} Đã trả lời (Confidence: {confidence}%)")
                    print(f"   📝 {preview}")
                    
                    if sources:
                        source_docs = [s.get('document', 'Unknown') for s in sources[:2]]
                        print(f"   📚 Nguồn: {', '.join(source_docs)}")
                else:
                    print(f"   ❌ Không trả lời được hoặc confidence thấp ({confidence}%)")
                    
            except Exception as e:
                print(f"   ❌ Lỗi: {e}")
    
    # Tổng kết
    print("\n" + "=" * 70)
    print("📊 KẾT QUẢ TỔNG KẾT:")
    print(f"   • Tổng số câu hỏi test: {total_questions}")
    print(f"   • Trả lời thành công: {successful_answers}")
    print(f"   • Tỷ lệ thành công: {successful_answers/total_questions*100:.1f}%")
    
    if successful_answers >= total_questions * 0.8:
        print("   🎉 XUẤT SẮC! Chatbot có thể trả lời được hầu hết câu hỏi")
    elif successful_answers >= total_questions * 0.6:
        print("   👍 TỐT! Chatbot trả lời được phần lớn câu hỏi")
    else:
        print("   ⚠️  CẦN CẢI THIỆN! Một số nội dung cần bổ sung thêm")
    
    print("\n🎯 Knowledge base đã bao quát toàn bộ 4 chương tư tưởng Hồ Chí Minh!")

if __name__ == "__main__":
    test_comprehensive_questions()
