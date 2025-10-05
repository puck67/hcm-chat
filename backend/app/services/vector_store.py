import os
import json
import numpy as np
import re
import unicodedata
import google.generativeai as genai
from dotenv import load_dotenv
from typing import List, Dict

load_dotenv()

class SimpleVectorStore:
    def __init__(self):
        # Khởi tạo Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY không tìm thấy")
        genai.configure(api_key=api_key)
        print("Gemini API đã sẵn sàng!")
        
        # Storage
        self.storage_path = "./simple_vector_storage"
        os.makedirs(self.storage_path, exist_ok=True)
        
        # In-memory data
        self.documents = []
        self.metadatas = []
        self.embeddings = []
        
        # Load existing data nếu có
        self.load_data()

    def get_embedding(self, text: str):
        """Tạo embedding. Mặc định dùng hash-based để tránh lỗi quota.
        Bật Gemini embedding bằng cách set USE_GEMINI_EMBEDDING=1 trong .env
        """
        if os.getenv("USE_GEMINI_EMBEDDING", "0") == "1":
            try:
                result = genai.embed_content(
                    model="models/embedding-001",
                    content=text,
                    task_type="retrieval_document"
                )
                return result['embedding']
            except Exception as e:
                print(f"Lỗi tạo embedding: {e}")
        # Fallback ổn định, không gọi API
        return [hash(text) % 1000 / 1000.0] * 384

    def reset(self):
        """Xóa dữ liệu index cũ để re-index sạch."""
        try:
            self.documents = []
            self.metadatas = []
            self.embeddings = []
            file_path = os.path.join(self.storage_path, "data.json")
            if os.path.exists(file_path):
                os.remove(file_path)
            print("Vector store đã được reset.")
        except Exception as e:
            print(f"Lỗi reset vector store: {e}")
    
    def add_documents(self, texts: List[str], metadatas: List[Dict], ids: List[str] = None):
        """Thêm documents"""
        if ids is None:
            ids = [f"doc_{len(self.documents) + i}" for i in range(len(texts))]
        
        print(f"Đang thêm {len(texts)} documents...")
        
        for text, metadata in zip(texts, metadatas):
            # Tạo embedding
            embedding = self.get_embedding(text)
            
            # Lưu data
            self.documents.append(text)
            self.metadatas.append({**metadata, "text": text})
            self.embeddings.append(embedding)
        
        # Save to file
        self.save_data()
        print("Documents đã được thêm!")
    
    def search(self, query: str, n_results: int = 5):
        """Tìm kiếm documents. Trả về kèm điểm similarity để phía RAG quyết định fallback."""
        if not self.documents:
            return {"documents": [[]], "metadatas": [[]]}
        
        print(f"Đang tìm kiếm: {query}")
        
        # Tính similarity đơn giản (cosine similarity)
        similarities = []
        for i, doc_embedding in enumerate(self.embeddings):
            # Đơn giản hóa: chỉ so sánh text
            similarity = self.simple_similarity(query.lower(), self.documents[i].lower())
            similarities.append((similarity, i))
        
        # Sort theo similarity
        similarities.sort(reverse=True)
        # Lọc bỏ các kết quả không liên quan (điểm = 0)
        similarities = [(s, i) for (s, i) in similarities if s > 0]
        if not similarities:
            return {"documents": [[]], "metadatas": [[]], "scores": [[]]}
        
        # Lấy top results
        top_indices = [idx for _, idx in similarities[:n_results]]
        top_scores = [score for score, _ in similarities[:n_results]]
        
        documents = [self.documents[i] for i in top_indices]
        metadatas = [{k: v for k, v in self.metadatas[i].items() if k != "text"} for i in top_indices]
        
        return {
            "documents": [documents],
            "metadatas": [metadatas],
            "scores": [top_scores]
        }
    
    def normalize_text(self, s: str) -> str:
        s = s.lower()
        s = unicodedata.normalize('NFD', s)
        s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')  # bỏ dấu
        s = re.sub(r"[\s\u200b]+", " ", s).strip()
        return s

    def simple_similarity(self, query: str, doc: str):
        """Similarity dựa trên Jaccard token + chứa cụm từ, có bỏ dấu."""
        q = self.normalize_text(query)
        d = self.normalize_text(doc)
        if not q or not d:
            return 0.0
        # Ưu tiên nếu câu hỏi xuất hiện nguyên cụm trong đoạn
        if q in d:
            return 1.0
        q_tokens = set(re.findall(r"\w+", q))
        d_tokens = set(re.findall(r"\w+", d))
        if not q_tokens:
            return 0.0
        return len(q_tokens & d_tokens) / len(q_tokens)
    
    def save_data(self):
        """Lưu data xuống file"""
        data = {
            "documents": self.documents,
            "metadatas": self.metadatas,
            "embeddings": self.embeddings
        }
        
        with open(os.path.join(self.storage_path, "data.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_data(self):
        """Load data từ file"""
        file_path = os.path.join(self.storage_path, "data.json")
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                self.documents = data.get("documents", [])
                self.metadatas = data.get("metadatas", [])
                self.embeddings = data.get("embeddings", [])
                
                print(f"Đã load {len(self.documents)} documents")
            except Exception as e:
                print(f"Lỗi load data: {e}")
    
    def get_collection_count(self):
        """Lấy số lượng documents"""
        return len(self.documents)

# Alias để tương thích
PineconeVectorStore = SimpleVectorStore
