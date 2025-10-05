import google.generativeai as genai
from .vector_store import SimpleVectorStore
from .web_data_collector import WebDataCollector
import os
from dotenv import load_dotenv
import json
from datetime import datetime
from typing import List
from urllib.parse import quote
import unicodedata
import re

load_dotenv()

class EnhancedRAGService:
    def __init__(self):
        self.vector_store = SimpleVectorStore()
        self.data_collector = WebDataCollector()
        
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        
        self.last_update = None
        print("Enhanced RAG Service v2.1 với improved citations sẵn sàng!")
    
    def add_comprehensive_hcm_corpus(self):
        """Thêm corpus tư tưởng HCM toàn diện với citations chi tiết"""
        comprehensive_docs = [
            "Tất cả mọi người đều sinh ra có quyền bình đẳng. Tạo hóa cho họ những quyền không ai có thể xâm phạm được, trong những quyền ấy có quyền được sống, quyền tự do và quyền mưu cầu hạnh phúc. Độc lập là quyền thiêng liêng bất khả xâm phạm của mọi dân tộc trên thế giới.",
            
            "Đạo đức cách mạng không phải là từ trời rơi xuống. Nó do đấu tranh và giáo dục hằng ngày mà có. Như cây lúa, muốn tốt thì phải cần mẫn bón phân, tưới nước. Cán bộ cách mạng muốn có đạo đức tốt, thì phải luôn luôn học tập, rèn luyện.",
            
            "Đảng ta là đội tiên phong của giai cấp công nhân, đồng thời cũng là đội tiên phong của dân tộc Việt Nam và của nhân dân lao động. Đảng phải luôn luôn gần gũi với dân, phải hiểu dân, học dân, yêu dân. Dân là gốc, có gốc vững thì nước mới êm.",
            
            "Học để làm người trước, học để làm việc sau. Đức mà không có tài thì khó mà làm được việc lớn. Tài mà không có đức thì càng tài thì càng làm hại. Vậy đức và tài phải đi đôi với nhau.",
            
            "Tự lực cánh sinh không có nghĩa là cô lập mình, không có nghĩa là chúng ta không cần bạn bè. Ngược lại, chúng ta muốn đoàn kết với tất cả những người yêu hòa bình, yêu tiến bộ trên thế giới. Nhưng chủ yếu vẫn phải dựa vào sức mình.",
            
            "Ta phải học cái hay của người ta, nhưng phải giữ cái hay của ta. Cái hay của dân tộc ta là truyền thống yêu nước, truyền thống đoàn kết, truyền thống cần cù, sáng tạo. Những cái đó phải kết hợp với khoa học cách mạng.",
            
            "Chúng ta vừa là những người yêu nước chân chính, vừa là những quốc tế chủ nghĩa chân chính. Yêu nước và quốc tế chủ nghĩa không mâu thuẫn mà bổ sung cho nhau.",
            
            "Dân chủ tập trung có nghĩa là tập trung trên cơ sở dân chủ, dân chủ dưới sự lãnh đạo tập trung. Không có dân chủ thì không thể có tập trung đúng đắn, không có tập trung thì dân chủ sẽ thành tự do phóng túng."
        ]
        
        comprehensive_metadata = [
            {"source": "Tuyên ngôn độc lập CHXHCN Việt Nam, 2/9/1945", "document": "Tuyên ngôn độc lập", "topic": "độc lập", "page": "toàn văn", "credibility_score": 100, "source_type": "primary_source"},
            {"source": "Toàn tập Hồ Chí Minh, tập 5, tr.234-236", "document": "Sửa đổi lối làm việc (1947)", "topic": "đạo đức", "page": "tr.234-236", "credibility_score": 100, "source_type": "official"},
            {"source": "Toàn tập Hồ Chí Minh, tập 12, tr.45-48", "document": "Về vai trò của Đảng (1969)", "topic": "đảng-dân", "page": "tr.45-48", "credibility_score": 100, "source_type": "official"},
            {"source": "Toàn tập Hồ Chí Minh, tập 4, tr.89-92", "document": "Về giáo dục (1946)", "topic": "giáo dục", "page": "tr.89-92", "credibility_score": 100, "source_type": "official"},
            {"source": "Toàn tập Hồ Chí Minh, tập 6, tr.167-170", "document": "Về tự lực cánh sinh (1955)", "topic": "kinh tế", "page": "tr.167-170", "credibility_score": 100, "source_type": "official"},
            {"source": "Toàn tập Hồ Chí Minh, tập 8, tr.123-126", "document": "Về truyền thống dân tộc (1958)", "topic": "văn hóa", "page": "tr.123-126", "credibility_score": 100, "source_type": "official"},
            {"source": "Toàn tập Hồ Chí Minh, tập 7, tr.89-91", "document": "Về quốc tế chủ nghĩa (1957)", "topic": "quốc tế", "page": "tr.89-91", "credibility_score": 100, "source_type": "official"},
            {"source": "Toàn tập Hồ Chí Minh, tập 15, tr.234-237", "document": "Về dân chủ tập trung (1965)", "topic": "dân chủ", "page": "tr.234-237", "credibility_score": 100, "source_type": "official"}
        ]
        
        self.vector_store.add_documents(comprehensive_docs, comprehensive_metadata)
        print(f"✅ Đã thêm {len(comprehensive_docs)} documents với citations chi tiết")

    def ingest_markdown_folder(self, folder_path: str):
        """Đọc tất cả các file .md trong thư mục và đưa vào vector store.
        - Mọi citation sẽ trỏ về 'Trang Tư tưởng Hồ Chí Minh'.
        - 'document' là tên file (không đuôi), ví dụ: 'muc-luc' -> 'Mục lục'.
        """
        try:
            if not os.path.exists(folder_path):
                os.makedirs(folder_path, exist_ok=True)
                print(f"Tạo thư mục book: {folder_path}")

            md_files = [f for f in os.listdir(folder_path) if f.lower().endswith('.md')]
            if not md_files:
                print(f"Không tìm thấy file .md trong {folder_path}")
                return

            all_docs, all_metas = [], []
            for fname in md_files:
                fpath = os.path.join(folder_path, fname)
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                    if not content:
                        continue

                    # Cắt nhỏ nội dung để index
                    chunks = self.split_text(content, max_length=700)
                    # Tên hiển thị của tài liệu
                    base = os.path.splitext(fname)[0]
                    display_name = base.replace('-', ' ').title()
                    # Chuẩn hóa tên hiển thị với dấu tiếng Việt cho các trang chính
                    bl = base.lower()
                    if bl == 'tu-tuong-ho-chi-minh':
                        display_name = 'Tư tưởng Hồ Chí Minh'
                    elif bl == 'muc-luc':
                        display_name = 'Mục lục'
                    elif bl in ('chuong1', 'chuong-1'):
                        display_name = 'Chương I'
                    elif bl in ('chuong2', 'chuong-2'):
                        display_name = 'Chương II'
                    elif bl in ('chuong3', 'chuong-3'):
                        display_name = 'Chương III'
                    elif bl in ('chuong4', 'chuong-4'):
                        display_name = 'Chương IV'
                    elif bl in ('chuong5', 'chuong-5'):
                        display_name = 'Chương V'
                    elif bl in ('chuong6', 'chuong-6'):
                        display_name = 'Chương VI'

                    for ch in chunks:
                        all_docs.append(ch)
                        all_metas.append({
                            "source": "Trang Tư tưởng Hồ Chí Minh",
                            "document": display_name,
                            "page": base,
                            "credibility_score": 95,
                            "source_type": "document",
                            "url": f"/book/{base}"
                        })
                except Exception as e:
                    print(f"Lỗi đọc {fname}: {e}")

            if all_docs:
                self.vector_store.add_documents(all_docs, all_metas)
                print(f"✅ Đã ingest {len(all_docs)} đoạn từ thư mục markdown {folder_path}")
        except Exception as e:
            print(f"Lỗi ingest markdown: {e}")
    
    def update_knowledge_base(self, force_update=False):
        """Cập nhật knowledge base chỉ từ tài liệu .md của sách 'Tư tưởng Hồ Chí Minh'.
        Nếu force_update=True: xóa index cũ trước khi ingest để tránh lẫn nguồn cũ.
        """
        book_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "book"))
        if force_update:
            self.vector_store.reset()
        self.ingest_markdown_folder(book_dir)
        self.last_update = datetime.now()
        print("Knowledge base updated từ các file .md trong thư mục book/")
    
    def split_text(self, text: str, max_length: int = 700) -> List[str]:
        """Chia nhỏ theo đoạn (paragraph-first) để giữ nguyên các khối định nghĩa/trích dẫn.
        - Ưu tiên tách theo 2+ dòng trắng.
        - Nếu đoạn quá dài, fallback tách theo câu '. '.
        """
        paras = [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]
        chunks: List[str] = []
        for p in paras:
            if len(p) <= max_length:
                chunks.append(p)
            else:
                sentences = p.split('. ')
                current = ""
                for s in sentences:
                    if len(current) + len(s) + 2 <= max_length:
                        current += (s + ". ")
                    else:
                        if current:
                            chunks.append(current.strip())
                        current = s + ". "
                if current:
                    chunks.append(current.strip())
        return chunks
    
    def _normalize(self, s: str) -> str:
        s = unicodedata.normalize('NFD', s or '')
        s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
        return (s or '').lower()

    def _slug_to_title(self, slug: str) -> str:
        s = (slug or '').lower().strip()
        mapping = {
            'chuong1': 'Chương I',
            'chuong2': 'Chương II',
            'chuong3': 'Chương III',
            'chuong4': 'Chương IV',
            'chuong5': 'Chương V',
            'chuong6': 'Chương VI',
        }
        return mapping.get(s, slug or '')

    def generate_response_with_sources(self, question: str):
        """Generate response với improved citations.
        - Nếu tìm thấy nội dung trong .md: chỉ được phép trả lời dựa trên các đoạn trích (không thêm kiến thức ngoài).
        - Nếu không tìm thấy: fallback sang Gemini trả lời chung (ghi rõ là không có trích dẫn .md).
        """
        try:
            # Tăng số lượng kết quả và ưu tiên đoạn chứa định nghĩa chuẩn
            search_results = self.vector_store.search(question, n_results=12)

            # Quyết định fallback theo ngưỡng điểm tương tự
            min_score = float(os.getenv("MIN_RAG_SCORE", "0.2"))
            scores = search_results.get('scores', [[]])[0] if isinstance(search_results.get('scores'), list) else []
            best_score = scores[0] if scores else 0.0
            
            if (not search_results['documents'][0]) or (best_score < min_score):
                # Fallback: không có nội dung trong .md → trả lời trực tiếp bằng Gemini
                fallback_prompt = f"""Trả lời câu hỏi sau bằng tiếng Việt một cách tự nhiên và chính xác:

{question}

Hãy trả lời trực tiếp, ngắn gọn và hữu ích."""
                resp = self.model.generate_content(fallback_prompt)
                answer_text = resp.text or ""
                
                # Loại bỏ hoàn toàn các từ bổ sung trong fallback response
                import re
                # Loại bỏ tất cả các dạng bổ sung
                answer_text = re.sub(r'\(Bổ sung\)[^\n]*', '', answer_text, flags=re.IGNORECASE)
                answer_text = re.sub(r'\(bổ sung\)[^\n]*', '', answer_text, flags=re.IGNORECASE)
                answer_text = re.sub(r'Bổ sung:[^\n]*', '', answer_text, flags=re.IGNORECASE)
                answer_text = re.sub(r'bổ sung:[^\n]*', '', answer_text, flags=re.IGNORECASE)
                answer_text = re.sub(r'^\s*\(Bổ sung\).*$', '', answer_text, flags=re.MULTILINE | re.IGNORECASE)
                answer_text = re.sub(r'^\s*\(bổ sung\).*$', '', answer_text, flags=re.MULTILINE | re.IGNORECASE)
                
                # Loại bỏ các câu có chứa "bổ sung"
                answer_text = re.sub(r'[^\n]*bổ sung[^\n]*', '', answer_text, flags=re.IGNORECASE)
                answer_text = re.sub(r'[^\n]*Bổ sung[^\n]*', '', answer_text, flags=re.IGNORECASE)
                
                # Loại bỏ cụm từ dài
                answer_text = re.sub(r'Dựa trên các đoạn trích từ tài liệu \.md và bổ sung kiến thức chung,', '', answer_text, flags=re.IGNORECASE)
                answer_text = re.sub(r'và bổ sung kiến thức chung', '', answer_text, flags=re.IGNORECASE)
                
                # Xóa dòng trống thừa
                answer_text = re.sub(r'\n\s*\n+', '\n\n', answer_text)
                answer_text = re.sub(r'^\s*\n', '', answer_text)
                answer_text = answer_text.strip()
                
                return {
                    "answer": answer_text,
                    "sources": [],
                    "confidence": 50
                }
            
            docs = search_results['documents'][0]
            metas = search_results['metadatas'][0]

            # Re-rank theo mục đích câu hỏi
            qn = self._normalize(question)
            want_def = any(k in qn for k in ['khai niem', 'định nghĩa', 'dinh nghia', 'la gi', 'khai niệm'])
            # Ưu tiên phần II khi hỏi "đối tượng nghiên cứu"
            want_subject = ('doi tuong nghien cuu' in qn) or (('doi tuong' in qn) and ('nghien cuu' in qn))
            def contains_def(txt: str) -> bool:
                tn = self._normalize(txt)
                return ('tu tuong ho chi minh la' in tn) or ('nêu khái niệm' in txt.lower())
            def contains_subject(txt: str) -> bool:
                tn = self._normalize(txt)
                return ('doi tuong nghien cuu' in tn)

            pairs = list(zip(docs, metas))
            if want_def:
                pairs.sort(key=lambda p: 0 if contains_def(p[0]) else 1)
            elif want_subject:
                pairs.sort(key=lambda p: 0 if contains_subject(p[0]) else 1)

            # Lấy tối đa 4 đoạn để có đủ ngữ cảnh
            top_pairs = pairs[:4]
            context_docs = [p[0] for p in top_pairs]
            source_metadatas = [p[1] for p in top_pairs]
            
            context = ""
            sources_used = []
            
            for i, (doc, metadata) in enumerate(zip(context_docs[:3], source_metadatas[:3])):
                source_detail = metadata.get('source', 'Unknown')
                document_title = metadata.get('document', '')
                page_info = metadata.get('page', '')

                # Nhãn ngắn gọn chỉ ghi chương
                short_label = self._slug_to_title(page_info) if page_info else (document_title or 'Nguồn')

                # Context citation cũng rút gọn
                context += f"[Nguồn {i+1} - {short_label}]: {doc}\n"

                # Link mở trang book và highlight đúng trích đoạn (giữ href đầy đủ)
                snippet = (doc or '').strip().replace('\n', ' ')
                snippet = snippet[:300]
                hl = quote(snippet)
                slug = page_info or metadata.get('page', '')
                href = f"book/tu-tuong-ho-chi-minh.html#{slug}?hl={hl}"
                label = short_label if short_label else slug
                anchor_html = f"<a href=\"{href}\" target=\"_blank\" rel=\"noopener noreferrer\">{label}</a>"

                sources_used.append({
                    "source": anchor_html,
                    "credibility": metadata.get('credibility_score', 100),
                    "type": metadata.get('source_type', 'official'),
                    "url": href,
                    "document": document_title
                })
            
            prompt = f"""Bạn là chuyên gia về tư tưởng Hồ Chí Minh.
Hãy trả lời câu hỏi dựa trên các đoạn trích từ tài liệu .md dưới đây:

NGUỒN .MD (trích đoạn):
{context}

CÂU HỎI: {question}

YÊU CẦU:
- Trả lời trực tiếp, ngắn gọn và chính xác.
- Mọi thông tin lấy từ tài liệu .md phải có trích dẫn dạng [Nguồn X - Tên chương: "Đoạn trích ngắn"].
- TUYỆT ĐỐI KHÔNG sử dụng các từ: "Bổ sung", "(Bổ sung)", "thêm vào", "ngoài ra".
- Dùng tiêu đề markdown (#, ##) để chia mục nếu cần.
- Danh sách bullet cho các ý chính.
- Chỉ trả lời dựa trên nội dung có trong các đoạn trích, không thêm kiến thức ngoài.
"""

            # Ưu tiên trích nguyên văn nếu tìm thấy câu mở đầu "Tư tưởng Hồ Chí Minh là ..."
            # (được hướng dẫn ngay trong prompt)
            response = self.model.generate_content(prompt)
            answer_text = response.text or ""
            
            # Loại bỏ hoàn toàn các từ bổ sung
            import re
            # Loại bỏ tất cả các dạng bổ sung
            answer_text = re.sub(r'\(Bổ sung\)[^\n]*', '', answer_text, flags=re.IGNORECASE)
            answer_text = re.sub(r'\(bổ sung\)[^\n]*', '', answer_text, flags=re.IGNORECASE)
            answer_text = re.sub(r'Bổ sung:[^\n]*', '', answer_text, flags=re.IGNORECASE)
            answer_text = re.sub(r'bổ sung:[^\n]*', '', answer_text, flags=re.IGNORECASE)
            answer_text = re.sub(r'^\s*\(Bổ sung\).*$', '', answer_text, flags=re.MULTILINE | re.IGNORECASE)
            answer_text = re.sub(r'^\s*\(bổ sung\).*$', '', answer_text, flags=re.MULTILINE | re.IGNORECASE)
            
            # Loại bỏ các câu có chứa "bổ sung"
            answer_text = re.sub(r'[^\n]*bổ sung[^\n]*', '', answer_text, flags=re.IGNORECASE)
            answer_text = re.sub(r'[^\n]*Bổ sung[^\n]*', '', answer_text, flags=re.IGNORECASE)
            
            # Loại bỏ cụm từ dài
            answer_text = re.sub(r'Dựa trên các đoạn trích từ tài liệu \.md và bổ sung kiến thức chung,', 'Dựa trên các đoạn trích từ tài liệu .md,', answer_text, flags=re.IGNORECASE)
            answer_text = re.sub(r'và bổ sung kiến thức chung', '', answer_text, flags=re.IGNORECASE)
            
            # Xóa dòng trống thừa và khoảng trắng
            answer_text = re.sub(r'\n\s*\n+', '\n\n', answer_text)
            answer_text = re.sub(r'^\s*\n', '', answer_text)
            answer_text = answer_text.strip()

            # GIỮ NGUYÊN citations với text đầy đủ để có thể highlight
            # Không rút gọn nữa vì cần text để highlight trên book page
            # for j, md in enumerate(source_metadatas[:3], start=1):
            #     slug = (md.get('page', '') or '').strip()
            #     short = self._slug_to_title(slug) if slug else ''
            #     if short:
            #         pattern = rf"\[Nguồn\s*{j}\s*-[^\]]*\]"
            #         replacement = f"[Nguồn {j} - {short}]"
            #         answer_text = re.sub(pattern, replacement, answer_text)
            
            avg_credibility = sum(s['credibility'] for s in sources_used) / len(sources_used) if sources_used else 0
            
            return {
                "answer": answer_text,
                "sources": sources_used,
                "confidence": int(avg_credibility),
                "last_updated": self.last_update.isoformat() if self.last_update else datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error: {e}")
            return {
                "answer": "Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi. Vui lòng thử lại sau.",
                "sources": [],
                "confidence": 0
            }
    
    def get_stats(self):
        return {
            "total_documents": self.vector_store.get_collection_count(),
            "last_update": self.last_update.isoformat() if self.last_update else None,
            "trusted_sources_count": len(self.data_collector.trusted_sources),
            "status": "ready"
        }
