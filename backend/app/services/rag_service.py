import google.generativeai as genai
from .vector_store import SimpleVectorStore
import os
from dotenv import load_dotenv

load_dotenv()

class RAGService:
    def __init__(self):
        # Khởi tạo Vector Store
        self.vector_store = SimpleVectorStore()
        
        # Khởi tạo Gemini cho text generation với model name mới
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.5-flash')  # Model name mới
        
        print("RAG Service đã sẵn sàng!")
    
    def add_hcm_documents(self):
        """Thêm documents mẫu về tư tưởng HCM (chỉ nếu chưa có đủ)"""
        if self.vector_store.get_collection_count() >= 10:
            print("Documents đã có sẵn, bỏ qua việc thêm mới")
            return
            
        sample_docs = [
            "Độc lập là quyền thiêng liêng bất khả xâm phạm của mọi dân tộc trên thế giới.",
            "Đạo đức cách mạng không phải là từ trời rơi xuống. Nó do đấu tranh và giáo dục hằng ngày mà có.",
            "Yêu nước là truyền thống tốt đẹp của dân tộc ta từ ngàn xưa.",
            "Dân ta phải thực sự là chủ của nước ta.",
            "Tự lực cánh sinh là chủ trương đúng đắn của Đảng ta.",
            "Học, học nữa, học mãi để trở thành con người có đức, có tài.",
            "Đoàn kết là sức mạnh vô địch của nhân dân ta.",
            "Cần kiệm liêm chính, chí công vô tư là phẩm chất của người cách mạng.",
            "Dân là gốc, có gốc vững thì nước mới êm.",
            "Muốn xây dựng chủ nghĩa xã hội, trước hết phải có con người xã hội chủ nghĩa."
        ]
        
        sample_metadata = [
            {"source": "Tuyên ngôn độc lập 1945", "topic": "độc lập"},
            {"source": "Đạo đức cách mạng", "topic": "đạo đức"},
            {"source": "Về chủ nghĩa yêu nước", "topic": "yêu nước"},
            {"source": "Về dân chủ", "topic": "dân chủ"},
            {"source": "Về kinh tế", "topic": "kinh tế"},
            {"source": "Về giáo dục", "topic": "giáo dục"},
            {"source": "Về đoàn kết", "topic": "đoàn kết"},
            {"source": "Tu dưỡng đảng", "topic": "đạo đức"},
            {"source": "Về dân chủ", "topic": "dân chủ"},
            {"source": "Về xây dựng con người", "topic": "giáo dục"}
        ]
        
        self.vector_store.add_documents(sample_docs, sample_metadata)
        print(f"Đã thêm {len(sample_docs)} documents về tư tưởng HCM")
    
    def generate_response(self, question: str):
        """Sinh trả lời dựa trên RAG"""
        try:
            # 1. Retrieve: Tìm documents liên quan
            search_results = self.vector_store.search(question, n_results=3)
            
            if not search_results['documents'][0]:
                return "Xin lỗi, tôi không tìm thấy thông tin liên quan trong cơ sở tri thức về tư tưởng Hồ Chí Minh."
            
            # 2. Augment: Tạo context từ documents
            context_docs = search_results['documents'][0]
            context = "\n".join([f"- {doc}" for doc in context_docs[:3]])
            
            # 3. Generate: Tạo prompt cho Gemini
            prompt = f"""Bạn là một chuyên gia về tư tưởng Hồ Chí Minh. Hãy trả lời câu hỏi dựa trên các tài liệu sau:

NGUYÊN LIỆU THAM KHẢO:
{context}

CÂUHỎI: {question}

YÊU CẦU:
- Trả lời dựa trên nội dung tư tưởng Hồ Chí Minh được cung cấp
- Giải thích rõ ràng, dễ hiểu
- Có thể trích dẫn trực tiếp từ tài liệu nếu phù hợp
- Nếu câu hỏi không liên quan đến tư tưởng HCM, hãy định hướng về chủ đề này
- Trả lời bằng tiếng Việt, tối đa 3 đoạn văn

TRẢ LỜI:"""

            # 4. Sinh trả lời với Gemini
            response = self.model.generate_content(prompt)
            
            return response.text
            
        except Exception as e:
            print(f"Lỗi generate response: {e}")
            return f"Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi. Vui lòng thử lại sau."
    
    def get_stats(self):
        """Lấy thống kê"""
        return {
            "total_documents": self.vector_store.get_collection_count(),
            "status": "ready"
        }
