import os
from dotenv import load_dotenv

def test_env():
    """Test environment variables"""
    load_dotenv()
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")
    
    print("🔑 Kiểm tra API Keys:")
    print(f"Gemini API Key: {'✅ Có' if gemini_key else '❌ Không có'}")
    print(f"Pinecone API Key: {'✅ Có' if pinecone_key else '❌ Không có'}")
    
    if not gemini_key or not pinecone_key:
        print("\n❌ Vui lòng cập nhật file .env với API keys")
        return False
    
    return True

def test_imports():
    """Test import các packages"""
    try:
        print("\n📦 Kiểm tra packages:")
        
        import pinecone
        print("✅ Pinecone imported")
        
        import sentence_transformers
        print("✅ Sentence Transformers imported")
        
        import google.generativeai
        print("✅ Google Generative AI imported")
        
        return True
        
    except Exception as e:
        print(f"❌ Lỗi import: {e}")
        return False

def test_pinecone_connection():
    """Test kết nối Pinecone"""
    try:
        from pinecone import Pinecone
        
        load_dotenv()
        api_key = os.getenv("PINECONE_API_KEY")
        
        pc = Pinecone(api_key=api_key)
        indexes = pc.list_indexes()
        
        print(f"\n🌲 Pinecone connection: ✅")
        print(f"Existing indexes: {len(indexes)}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Lỗi kết nối Pinecone: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Bắt đầu test system...")
    
    if test_env() and test_imports() and test_pinecone_connection():
        print("\n✅ Tất cả tests pass! Ready to test vector store!")
    else:
        print("\n❌ Có lỗi xảy ra. Vui lòng fix trước khi tiếp tục.")
