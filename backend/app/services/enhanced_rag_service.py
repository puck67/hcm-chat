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
        """Chuẩn hóa text: loại bỏ dấu tiếng Việt và chuyển thành chữ thường"""
        if not s:
            return ''
        
        # Bảng chuyển đổi ký tự có dấu tiếng Việt
        vietnamese_chars = {
            'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
            'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
            'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
            'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
            'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
            'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
            'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
            'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
            'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
            'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
            'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
            'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
            'đ': 'd', 'Đ': 'd'
        }
        
        # Chuyển thành chữ thường
        s = s.lower()
        
        # Thay thế các ký tự có dấu
        for vn_char, latin_char in vietnamese_chars.items():
            s = s.replace(vn_char, latin_char)
        
        # Loại bỏ các ký tự đặc biệt, chỉ giữ chữ và số
        s = re.sub(r'[^a-z0-9\s]', '', s)
        
        # Chuẩn hóa khoảng trắng
        s = re.sub(r'\s+', ' ', s).strip()
        
        return s

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
    
    def detect_chapter_summary_request(self, question: str) -> tuple[bool, str]:
        """Phát hiện yêu cầu tóm tắt chương và trả về (is_summary, chapter_name)"""
        q_norm = self._normalize(question)
        summary_keywords = ['tom tat', 'tom tac', 'tong ket', 'noi dung chinh', 'yeu to']
        chapter_keywords = ['chuong', 'phan']
        
        # Kiểm tra có từ khóa tóm tắt
        has_summary = any(kw in q_norm for kw in summary_keywords)
        has_chapter = any(kw in q_norm for kw in chapter_keywords)
        
        if not (has_summary and has_chapter):
            return False, ""
        
        # Tìm số chương
        import re
        # Tìm chương bằng số La Mã hoặc số Arabic
        chapter_match = re.search(r'chương\s*(\d+|[ivxlcdm]+)', q_norm)
        if chapter_match:
            chapter_num = chapter_match.group(1)
            # Chuyển số La Mã thành số Arabic nếu cần
            roman_to_num = {'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6'}
            if chapter_num.lower() in roman_to_num:
                chapter_num = roman_to_num[chapter_num.lower()]
            return True, f"chuong{chapter_num}"
        
        # Tìm theo pattern "chương X"
        for i in range(1, 7):
            if f"chuong {i}" in q_norm or f"chuong{i}" in q_norm:
                return True, f"chuong{i}"
        
        return False, ""
    
    def detect_mindmap_request(self, question: str) -> bool:
        """Phát hiện yêu cầu tạo sơ đồ tư duy"""
        q_norm = self._normalize(question)
        mindmap_keywords = [
            'tao so do tu duy',
            'so do tu duy',
            've so do',
            'so do ve',
            'bieu do',
            'so do',
            'mindmap',
            'mind map',
            'mermaid mindmap',
            'hien thi so do',
            'tao so do'
        ]
        
        is_mindmap = any(kw in q_norm for kw in mindmap_keywords)
        print(f"🔍 MINDMAP DEBUG: '{question}' -> normalized: '{q_norm}' -> is_mindmap: {is_mindmap}")
        return is_mindmap
    
    def get_full_chapter_content(self, chapter_name: str) -> str:
        """Đọc toàn bộ nội dung của một chương từ file .md"""
        book_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "book"))
        chapter_file = os.path.join(book_dir, f"{chapter_name}.md")
        
        try:
            if os.path.exists(chapter_file):
                with open(chapter_file, 'r', encoding='utf-8') as f:
                    return f.read().strip()
            else:
                print(f"Không tìm thấy file: {chapter_file}")
                return ""
        except Exception as e:
            print(f"Lỗi đọc file {chapter_file}: {e}")
            return ""

    def generate_response_with_sources(self, question: str):
        """Generate response với improved citations.
        - Nếu tìm thấy nội dung trong .md: chỉ được phép trả lời dựa trên các đoạn trích (không thêm kiến thức ngoài).
        - Nếu không tìm thấy: fallback sang Gemini trả lời chung (ghi rõ là không có trích dẫn .md).
        - Xử lý đặc biệt cho yêu cầu tóm tắt chương: đọc toàn bộ nội dung chương.
        """
        try:
            print(f"🎯 RAG SERVICE: Processing question: '{question}'")
            
            # Kiểm tra xem có phải yêu cầu tóm tắt chương không
            is_chapter_summary, chapter_name = self.detect_chapter_summary_request(question)
            
            if is_chapter_summary and chapter_name:
                print(f"📖 CHAPTER SUMMARY detected: {chapter_name}")
                # Xử lý đặc biệt cho tóm tắt chương
                return self._handle_chapter_summary(question, chapter_name)
            
            # Kiểm tra xem có phải yêu cầu tạo sơ đồ tư duy không
            if self.detect_mindmap_request(question):
                print(f"🧠 MINDMAP REQUEST detected!")
                return self._handle_mindmap_request(question)
            
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
    
    def _handle_chapter_summary(self, question: str, chapter_name: str):
        """Xử lý đặc biệt cho yêu cầu tóm tắt chương"""
        try:
            # Đọc toàn bộ nội dung chương
            full_content = self.get_full_chapter_content(chapter_name)
            
            if not full_content:
                return {
                    "answer": f"Không tìm thấy nội dung của {self._slug_to_title(chapter_name)}.",
                    "sources": [],
                    "confidence": 0
                }
            
            # Chia nhỏ nội dung thành các phần để AI có thể xử lý
            # Giới hạn độ dài để tránh vượt quá context window
            max_content_length = 15000  # Giữ lại đủ space cho prompt và response
            if len(full_content) > max_content_length:
                # Chia thành các phần nhỏ hơn
                content_parts = self.split_text(full_content, max_length=max_content_length//3)
                # Lấy 3 phần đầu tiên để đảm bảo có overview tốt  
                summary_content = "\n\n".join(content_parts[:3])
            else:
                summary_content = full_content
            
            chapter_title = self._slug_to_title(chapter_name)
            
            # Tạo prompt đặc biệt cho tóm tắt chương
            prompt = f"""Bạn là chuyên gia về tư tưởng Hồ Chí Minh. Hãy tóm tắt {chapter_title} dựa trên nội dung sau:

{summary_content}

YÊU CẦU TÓM TẮT:
- Tạo một bản tóm tắt toàn diện và có cấu trúc cho {chapter_title}
- Sử dụng tiêu đề markdown (##, ###) để chia các mục chính
- Trình bày các ý chính bằng danh sách bullet points
- Nêu rõ các khái niệm và định nghĩa quan trọng
- Làm nổi bật những tư tưởng cốt lõi của Hồ Chí Minh trong chương này
- Trả lời bằng tiếng Việt, văn phong học thuật nhưng dễ hiểu
- Độ dài: 800-1200 từ

Bắt đầu tóm tắt:"""
            
            response = self.model.generate_content(prompt)
            answer_text = response.text or ""
            
            # Tạo source thông tin cho chương
            source_info = {
                "source": f"<a href=\"book/tu-tuong-ho-chi-minh.html#{chapter_name}\" target=\"_blank\" rel=\"noopener noreferrer\">{chapter_title}</a>",
                "credibility": 100,
                "type": "document",
                "url": f"book/tu-tuong-ho-chi-minh.html#{chapter_name}",
                "document": chapter_title
            }
            
            return {
                "answer": answer_text,
                "sources": [source_info],
                "confidence": 95,
                "last_updated": self.last_update.isoformat() if self.last_update else datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error in chapter summary: {e}")
            return {
                "answer": f"Xin lỗi, có lỗi xảy ra khi tóm tắt {self._slug_to_title(chapter_name)}. Vui lòng thử lại sau.",
                "sources": [],
                "confidence": 0
            }
    
    def _handle_mindmap_request(self, question: str):
        """Xử lý yêu cầu tạo sơ đồ tư duy"""
        try:
            # Trích xuất chủ đề từ câu hỏi
            topic = self._extract_mindmap_topic(question)
            
            # Kiểm tra nếu là request về chương cụ thể
            import re
            chapter_match = re.search(r'chương\s*(\d+)', topic.lower())
            if chapter_match:
                chapter_num = chapter_match.group(1)
                chapter_name = f"chuong{chapter_num}"
                
                # Đọc toàn bộ nội dung chương
                chapter_content = self.get_full_chapter_content(chapter_name)
                
                if chapter_content:
                    # Cắt ngắn nội dung để tránh vượt quá context limit và timeout
                    max_content = 8000  # Giảm từ 12000 xuống 8000
                    if len(chapter_content) > max_content:
                        # Lấy phần đầu và tóm tắt
                        chapter_content = chapter_content[:max_content] + "\n\n[Nội dung đã được rút gọn để tối ưu hóa...]"
                    
                    relevant_content = chapter_content
                    chapter_title = self._slug_to_title(chapter_name)
                    
                    source_info = {
                        "source": f"<a href=\"book/tu-tuong-ho-chi-minh.html#{chapter_name}\" target=\"_blank\" rel=\"noopener noreferrer\">{chapter_title}</a>",
                        "credibility": 100,
                        "type": "mindmap",
                        "url": f"book/tu-tuong-ho-chi-minh.html#{chapter_name}",
                        "document": f"Sơ đồ tư duy {chapter_title}"
                    }
                else:
                    # Fallback nếu không tìm thấy file chương
                    search_results = self.vector_store.search(topic, n_results=8)
                    relevant_content = "\n\n".join(search_results['documents'][0][:6]) if search_results['documents'][0] else ""
                    source_info = {
                        "source": "Tư liệu tư tưởng Hồ Chí Minh",
                        "credibility": 85,
                        "type": "mindmap",
                        "url": "",
                        "document": "Sơ đồ tư duy"
                    }
            else:
                # Tìm kiếm thông tin liên quan đến chủ đề thông thường
                search_results = self.vector_store.search(topic, n_results=8)
                
                if not search_results['documents'][0]:
                    # Không có thông tin liên quan, tạo mindmap tổng quát
                    return self._create_general_mindmap(topic)
                
                # Lấy nội dung liên quan
                relevant_content = "\n\n".join(search_results['documents'][0][:6])
                source_info = {
                    "source": "Tư liệu tư tưởng Hồ Chí Minh",
                    "credibility": 95,
                    "type": "mindmap",
                    "url": "",
                    "document": "Sơ đồ tư duy"
                }
            
            if relevant_content:
                
                # Tạo prompt với syntax đúng cho Mermaid mindmap
                prompt = f"""Tạo Mermaid mindmap cho: "{topic}"

Nội dung: {relevant_content[:3000]}...

QUAN TRỌNG - Format CHÍNH XÁC (cần đúng indentation):

```mermaid
mindmap
  root(({topic}))
    Nhánh chính 1
      Ý con 1
      Ý con 2
    Nhánh chính 2
      Ý con 1
      Ý con 2
```

QUY TẮC:
- root() có 2 spaces
- Nhánh chính có 4 spaces  
- Ý con có 6 spaces
- Tối đa 4 nhánh chính, mỗi nhánh 3-4 ý con
- Text ngắn gọn (<15 từ mỗi node)

Chỉ trả về mermaid code:"""
                
                # Tối ưu hóa generation config
                import google.generativeai as genai
                generation_config = genai.types.GenerationConfig(
                    temperature=0.3,  # Giảm temperature để tăng tốc
                    max_output_tokens=2048,  # Giảm output tokens để tăng tốc
                    top_p=0.8,
                    top_k=10
                )
                
                response = self.model.generate_content(
                    prompt,
                    generation_config=generation_config
                )
                
                # Debug Gemini response chi tiết 
                print(f"🤖 Gemini response type: {type(response)}")
                
                # Check safety filters và finish reason
                if hasattr(response, 'prompt_feedback'):
                    print(f"🛡️ prompt_feedback: {response.prompt_feedback}")
                
                if hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    print(f"🏁 finish_reason: {getattr(candidate, 'finish_reason', 'Unknown')}")
                    print(f"🛡️ safety_ratings: {getattr(candidate, 'safety_ratings', [])}")
                    print(f"🔍 candidate.content.parts: {len(candidate.content.parts)} parts")
                
                # Nếu không có parts, có thể bị block - thử prompt đơn giản hơn
                if hasattr(response, 'candidates') and response.candidates and len(response.candidates[0].content.parts) == 0:
                    print("⚠️ No content parts found - possible content blocked. Trying simple fallback...")
                    
                    # Fallback với prompt siêu đơn giản
                    simple_prompt = f"""Create a simple mindmap about: {topic}

Format:
```mermaid
mindmap
  root((Topic))
    Branch 1
      Item A  
      Item B
    Branch 2
      Item C
      Item D
```"""
                    
                    print(f"🔄 Trying simplified prompt...")
                    fallback_response = self.model.generate_content(simple_prompt)
                    
                    try:
                        mermaid_code = fallback_response.text or ""
                        print(f"✅ Fallback successful: {len(mermaid_code)} chars")
                    except:
                        mermaid_code = f"""```mermaid
mindmap
  root(({topic}))
    Nội dung chính
      Khái niệm cơ bản
      Ý nghĩa quan trọng
    Ứng dụng thực tế
      Trong học tập
      Trong cuộc sống
```"""
                        print(f"🔧 Using hardcoded fallback mindmap")
                else:
                    # Normal extraction
                    try:
                        mermaid_code = response.text or ""
                        print(f"✅ Successfully got response.text: {len(mermaid_code)} chars")
                    except Exception as e:
                        print(f"⚠️ response.text failed: {e}")
                        # Extract từ parts như trước
                        if hasattr(response, 'candidates') and response.candidates:
                            parts = response.candidates[0].content.parts
                            if parts:
                                all_text = ""
                                for part in parts:
                                    all_text += getattr(part, 'text', '') or ''
                                mermaid_code = all_text
                            else:
                                mermaid_code = ""
                        else:
                            mermaid_code = ""
                
                print(f"📄 Final mermaid_code preview: {mermaid_code[:100]}...")
                
                # Kiểm tra và làm sạch mermaid code
                mermaid_code = self._clean_mermaid_code(mermaid_code)
                
                return {
                    "answer": f"## Sơ đồ tư duy: {topic}\n\n{mermaid_code}",
                    "sources": [source_info],
                    "confidence": 90,
                    "last_updated": datetime.now().isoformat()
                }
            else:
                # Không có thông tin liên quan, tạo mindmap tổng quát
                return self._create_general_mindmap(topic)
                
        except Exception as e:
            print(f"Error in mindmap generation: {e}")
            return {
                "answer": "Xin lỗi, tôi không thể tạo sơ đồ tư duy lúc này. Vui lòng thử lại sau.",
                "sources": [],
                "confidence": 0
            }
    
    def _extract_mindmap_topic(self, question: str) -> str:
        """Trích xuất chủ đề chính từ yêu cầu mindmap"""
        import re
        q_lower = question.lower()
        
        # Tìm pattern với nhiều dạng khác nhau
        patterns = [
            # Sơ đồ tư duy patterns
            r'tạo.*?sơ đồ tư duy.*?cho\s*(.+)',
            r'tạo.*?sơ đồ tư duy.*?về\s*(.+)',
            r'tạo.*?sơ đồ tư duy.*?:\s*(.+)',
            # Vẽ sơ đồ patterns
            r'vẽ.*?sơ đồ.*?về\s*(.+)',
            r'vẽ.*?sơ đồ.*?cho\s*(.+)',
            r'vẽ.*?sơ đồ.*?:\s*(.+)',
            # Sơ đồ về patterns
            r'sơ đồ.*?về\s*(.+)',
            r'sơ đồ.*?cho\s*(.+)',
            r'sơ đồ.*?:\s*(.+)',
            # Mindmap patterns
            r'mindmap.*?cho\s*(.+)',
            r'mindmap.*?về\s*(.+)',
            r'mindmap.*?:\s*(.+)',
            # Tạo sơ đồ patterns
            r'tạo.*?sơ đồ.*?về\s*(.+)',
            r'tạo.*?sơ đồ.*?cho\s*(.+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, q_lower)
            if match:
                topic = match.group(1).strip()
                
                # Xử lý đặc biệt cho "nội dung chương X"
                chapter_match = re.search(r'nội dung\s*(chương|chưong)\s*(\d+|[ivxlc]+)', topic)
                if chapter_match:
                    chapter_num = chapter_match.group(2)
                    # Chuyển đổi số La Mã nếu cần
                    roman_to_num = {'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6'}
                    if chapter_num.lower() in roman_to_num:
                        chapter_num = roman_to_num[chapter_num.lower()]
                    return f"Nội dung Chương {chapter_num}"
                
                # Xử lý trực tiếp "chương X"
                chapter_direct = re.search(r'(chương|chưong)\s*(\d+|[ivxlc]+)', topic)
                if chapter_direct:
                    chapter_num = chapter_direct.group(2)
                    roman_to_num = {'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6'}
                    if chapter_num.lower() in roman_to_num:
                        chapter_num = roman_to_num[chapter_num.lower()]
                    return f"Chương {chapter_num}"
                
                # Loại bỏ các từ không cần thiết
                topic = re.sub(r'(hồ chí minh|hcm)', '', topic).strip()
                return topic.title() if topic else "Tư tưởng Hồ Chí Minh"
        
        # Nếu không tìm thấy, trả về chủ đề mặc định
        return "Tư tưởng Hồ Chí Minh"
    
    def _clean_mermaid_code(self, code: str) -> str:
        """Làm sạch và chuẩn hóa Mermaid code"""
        if not code:
            return ""
        
        # Loại bỏ các dòng giải thích
        lines = code.split('\n')
        mermaid_lines = []
        in_mermaid = False
        
        for line in lines:
            line = line.strip()
            if line.startswith('```mermaid'):
                in_mermaid = True
                mermaid_lines.append(line)
            elif line.startswith('```') and in_mermaid:
                mermaid_lines.append(line)
                break
            elif in_mermaid:
                mermaid_lines.append(line)
        
        if not mermaid_lines:
            # Nếu không có mermaid block, thêm vào
            return f"```mermaid\n{code}\n```"
        
        return '\n'.join(mermaid_lines)
    
    def _create_general_mindmap(self, topic: str):
        """Tạo mindmap tổng quát khi không có thông tin cụ thể"""
        general_mindmap = f"""```mermaid
mindmap
  root(({topic}))
    Tư tưởng chính trị
        Độc lập dân tộc
        Dân chủ nhân dân
        Chủ nghĩa xã hội
    Tư tưởng đạo đức
        Cần kiệm liêm chính
        Sống và làm việc có kế hoạch
        Đoàn kết yêu thương
    Tư tưởng giáo dục
        Học để làm người
        Kết hợp lý thuyết và thực tiễn
        Giáo dục toàn diện
    Tư tưởng văn hóa
        Dân tộc - Khoa học - Đại chúng
        Kế thừa và phát triển
        Giữ gìn bản sắc dân tộc
```"""
        
        return {
            "answer": f"## Sơ đồ tư duy: {topic}\n\n{general_mindmap}",
            "sources": [{
                "source": "Tư liệu tư tưởng Hồ Chí Minh",
                "credibility": 85,
                "type": "mindmap",
                "url": "",
                "document": "Sơ đồ tư duy tổng quát"
            }],
            "confidence": 80,
            "last_updated": datetime.now().isoformat()
        }
    
    def get_stats(self):
        return {
            "total_documents": self.vector_store.get_collection_count(),
            "last_update": self.last_update.isoformat() if self.last_update else None,
            "trusted_sources_count": len(self.data_collector.trusted_sources),
            "status": "ready",
            "features": ["chapter_summary", "mindmap_generation", "rag_search"]
        }
