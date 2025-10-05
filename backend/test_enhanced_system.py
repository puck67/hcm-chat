from app.services.enhanced_rag_service import EnhancedRAGService

def test_enhanced_system():
    print("🧪 Testing Enhanced RAG System...")
    
    # Initialize service
    rag_service = EnhancedRAGService()
    
    # Update knowledge base
    print("\n📚 Updating enhanced knowledge base...")
    rag_service.update_knowledge_base(force_update=True)
    
    # Test questions
    questions = [
        "Ý nghĩa của độc lập dân tộc?",
        "Đạo đức cách mạng là gì?",
    ]
    
    print("\n🤖 Testing Enhanced Q&A:")
    for question in questions:
        print(f"\n--- Câu hỏi: {question}")
        result = rag_service.generate_response_with_sources(question)
        
        print(f"Trả lời: {result['answer'][:150]}...")
        print(f"Confidence: {result['confidence']}/100")
        print(f"Sources: {len(result['sources'])}")
        
        for i, source in enumerate(result['sources'][:2]):
            print(f"  - {source['source']} (Credibility: {source['credibility']}/100)")
    
    print(f"\n📊 Stats: {rag_service.get_stats()}")
    print("\n✅ Enhanced System ready!")

if __name__ == "__main__":
    test_enhanced_system()
