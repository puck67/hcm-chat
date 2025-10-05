from app.services.rag_service import RAGService

def test_rag_service():
    try:
        print("🤖 Testing RAG Service...")
        
        # Khởi tạo RAG service
        rag_service = RAGService()
        
        # Thêm sample data
        print("📚 Thêm documents mẫu...")
        rag_service.add_hcm_documents()
        
        # Test với các câu hỏi
        test_questions = [
            "Độc lập có ý nghĩa gì với dân tộc?",
            "Đạo đức cách mạng được hình thành như thế nào?", 
            "Tại sao phải yêu nước?",
            "Vai trò của dân trong xã hội là gì?"
        ]
        
        print("\n🔍 Testing Q&A:")
        for i, question in enumerate(test_questions, 1):
            print(f"\n--- Câu hỏi {i}: {question}")
            answer = rag_service.generate_response(question)
            print(f"Trả lời: {answer[:200]}..." if len(answer) > 200 else f"Trả lời: {answer}")
        
        # Stats
        stats = rag_service.get_stats()
        print(f"\n📊 Stats: {stats}")
        
        print("\n✅ RAG Service hoạt động tốt!")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_rag_service()
