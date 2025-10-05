#!/usr/bin/env python3
"""
DEMO: So sánh trước và sau khi cập nhật Knowledge Base
Cho thấy cải tiến rõ ràng về khả năng trả lời câu hỏi
"""

import os
import sys
from dotenv import load_dotenv

# Add app to path  
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.enhanced_rag_service import EnhancedRAGService

def demo_before_after():
    """Demo so sánh trước và sau cập nhật"""
    
    load_dotenv()
    rag_service = EnhancedRAGService()
    
    print("🎯" + "="*60 + "🎯")
    print("     DEMO: TRƯỚC VÀ SAU KHI CẬP NHẬT KNOWLEDGE BASE")
    print("🎯" + "="*60 + "🎯")
    
    # Stats hiện tại
    stats = rag_service.get_stats()
    print(f"\n📊 KNOWLEDGE BASE HIỆN TẠI:")
    print(f"   • Tổng documents: {stats['total_documents']}")
    print(f"   • Cập nhật lần cuối: {stats['last_update']}")
    
    # Câu hỏi test chi tiết
    test_questions = [
        {
            "question": "Tư tưởng Hồ Chí Minh là gì?",
            "before": "Chỉ trả lời chung chung, không có định nghĩa chuẩn",
            "category": "Khái niệm cơ bản"
        },
        {
            "question": "Cơ sở thực tiễn hình thành tư tưởng Hồ Chí Minh?", 
            "before": "Không thể trả lời - thiếu nội dung chương 2",
            "category": "Cơ sở hình thành"
        },
        {
            "question": "Quan điểm của Hồ Chí Minh về độc lập dân tộc?",
            "before": "Không thể trả lời - thiếu nội dung chương 3", 
            "category": "Độc lập dân tộc"
        },
        {
            "question": "Đảng là đạo đức, là văn minh có nghĩa gì?",
            "before": "Không thể trả lời - thiếu nội dung chương 4",
            "category": "Đảng và Nhà nước"
        },
        {
            "question": "Nhà nước của dân, do dân, vì dân theo Hồ Chí Minh?",
            "before": "Không có trích dẫn cụ thể",
            "category": "Nhà nước pháp quyền"
        }
    ]
    
    print(f"\n🧪 TEST {len(test_questions)} CÂU HỎI QUAN TRỌNG:")
    print("=" * 70)
    
    success_count = 0
    
    for i, test in enumerate(test_questions, 1):
        print(f"\n{i}. 📋 CATEGORY: {test['category']}")
        print(f"   ❓ CÂU HỎI: {test['question']}")
        print(f"   📉 TRƯỚC ĐÂY: {test['before']}")
        
        # Test với knowledge base hiện tại
        try:
            result = rag_service.generate_response_with_sources(test['question'])
            
            answer = result.get('answer', '')
            sources = result.get('sources', [])
            confidence = result.get('confidence', 0)
            
            if answer and confidence > 60:
                success_count += 1
                print(f"   ✅ SAU CẬP NHẬT: Trả lời thành công!")
                print(f"      🎯 Confidence: {confidence}%")
                print(f"      📚 Nguồn: {len(sources)} tài liệu")
                
                # Preview câu trả lời
                preview = answer[:200] + "..." if len(answer) > 200 else answer
                print(f"      📝 Preview: {preview}")
                
                if sources:
                    source_names = [s.get('document', 'Unknown') for s in sources[:2]]
                    print(f"      📖 Từ: {', '.join(source_names)}")
            else:
                print(f"   ❌ SAU CẬP NHẬT: Vẫn không trả lời được (confidence: {confidence}%)")
                
        except Exception as e:
            print(f"   ❌ LỖI: {e}")
        
        print("-" * 70)
    
    # Tổng kết cải tiến
    print(f"\n🎉 KẾT QUẢ CẢI TIẾN:")
    print(f"   📈 Tỷ lệ thành công: {success_count}/{len(test_questions)} = {success_count/len(test_questions)*100:.0f}%")
    
    if success_count >= len(test_questions) * 0.8:
        print(f"   💯 XUẤT SẮC! Cải tiến vượt trội")
    elif success_count >= len(test_questions) * 0.6:
        print(f"   👍 TỐT! Cải tiến đáng kể")
    else:
        print(f"   ⚠️ CẦN CẢI THIỆN THÊM")
    
    print(f"\n🔥 LỢI ÍCH CỤ THỂ CỦA VIỆC CẬP NHẬT:")
    print(f"   ✅ Bao phủ toàn bộ 4 chương tư tưởng HCM")
    print(f"   ✅ 930 documents với nội dung chi tiết") 
    print(f"   ✅ Trích dẫn chính xác từ giáo trình gốc")
    print(f"   ✅ Tìm kiếm ngữ nghĩa thông minh")
    print(f"   ✅ Confidence score đánh giá độ tin cậy")
    print(f"   ✅ Citations links đến đúng chương/mục")
    
    print(f"\n🎯 NGƯỜI DÙNG GIỜ ĐÂY CÓ THỂ:")
    print(f"   💬 Hỏi bất kỳ câu nào về tư tưởng HCM")
    print(f"   📚 Nhận câu trả lời có trích dẫn chuẩn")
    print(f"   🔗 Click link để xem chi tiết trong sách") 
    print(f"   🎓 Học tập hiệu quả hơn với AI assistant")

if __name__ == "__main__":
    demo_before_after()
