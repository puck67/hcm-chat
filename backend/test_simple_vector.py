import os
from dotenv import load_dotenv

def test_simple_system():
    load_dotenv()
    
    # Test API keys
    gemini_key = os.getenv("GEMINI_API_KEY")
    print(f"Gemini API Key: {'✅' if gemini_key else '❌'}")
    
    if not gemini_key:
        return False
    
    # Test imports
    try:
        import google.generativeai as genai
        print("✅ Google Generative AI imported")
        
        # Test vector store
        from app.services.vector_store import SimpleVectorStore
        print("✅ Vector Store imported")
        
        # Test basic functionality
        vector_store = SimpleVectorStore()
        
        # Add test data
        test_docs = ["Độc lập là quyền thiêng liêng của mọi dân tộc"]
        test_metadata = [{"source": "test", "topic": "test"}]
        
        vector_store.add_documents(test_docs, test_metadata)
        
        # Test search
        results = vector_store.search("độc lập")
        print(f"✅ Search working: {len(results['documents'][0])} results")
        
        print("\n🎉 System ready!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing simple system...")
    test_simple_system()
