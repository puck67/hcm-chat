/**
 * HCM CHATBOT FRONTEND APPLICATION
 * Class chính quản lý toàn bộ giao diện và logic frontend
 * Chức năng:
 * - Xác thực người dùng với JWT token
 * - Quản lý cuộc trò chuyện (tạo mới, load, xóa)
 * - Gửi tin nhắn và hiển thị phản hồi AI
 * - Tích hợp với .NET API backend
 */

// Markdown renderer nhẹ cho chat (H1/H2, list, bold/italic, blockquote, hr, paragraph)
function renderMarkdownLite(md){
    const escapeHtml = (s)=> s
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
    const inline = (s)=> s
        .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
        .replace(/__([^_]+)__/g,'<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g,'<em>$1</em>')
        .replace(/_([^_]+)_/g,'<em>$1</em>');
    const lines = (md||'').split(/\r?\n/);
    const out = [];
    let inUl=false, inOl=false, inBq=false; let bqBuf=[]; let para=[];
    const flushPara=()=>{ if(para.length){ out.push('<p>'+para.join('<br/>')+'</p>'); para=[]; } };
    const closeLists=()=>{ if(inUl){ out.push('</ul>'); inUl=false; } if(inOl){ out.push('</ol>'); inOl=false; } };
    const flushBq=()=>{ if(inBq){ out.push('<blockquote><p>'+bqBuf.join('<br/>')+'</p></blockquote>'); inBq=false; bqBuf=[]; } };
    for(const raw of lines){
        const line = raw;
        const trimmed = line.trim();
        if(trimmed===''){ flushPara(); flushBq(); closeLists(); continue; }
        const h = trimmed.match(/^(#{1,6})\s*-?\s*(.+)$/);
        if(h){ flushPara(); flushBq(); closeLists(); const lvl=h[1].length; const text=inline(escapeHtml(h[2])); out.push(`<h${lvl}>${text}</h${lvl}>`); continue; }
        if(/^---+$/.test(trimmed)){ flushPara(); flushBq(); closeLists(); out.push('<hr/>'); continue; }
        const bqm = trimmed.match(/^>\s?(.*)$/);
        if(bqm){ flushPara(); closeLists(); inBq=true; bqBuf.push(inline(escapeHtml(bqm[1]))); continue; } else if(inBq){ flushBq(); }
        const ulm = trimmed.match(/^[*-]\s+(.+)$/);
        if(ulm){ flushPara(); flushBq(); if(!inUl){ out.push('<ul>'); inUl=true; } out.push('<li>'+inline(escapeHtml(ulm[1]))+'</li>'); continue; } else if(inUl && !/^[*-]\s+/.test(trimmed)){ closeLists(); }
        const olm = trimmed.match(/^\d+\.\s+(.+)$/);
        if(olm){ flushPara(); flushBq(); if(!inOl){ out.push('<ol>'); inOl=true; } out.push('<li>'+inline(escapeHtml(olm[1]))+'</li>'); continue; } else if(inOl && !/^\d+\.\s+/.test(trimmed)){ closeLists(); }
        para.push(inline(escapeHtml(line)));
    }
    flushPara(); flushBq(); closeLists();
    return out.join('\n');
}

// Trích xuất map { index: href } từ danh sách nguồn (dạng anchor HTML)
function buildCitationMap(sources){
    const map = {};
    if(!Array.isArray(sources)) return map;
    for(const s of sources){
        if(typeof s !== 'string') continue;
        const hrefMatch = s.match(/href="([^"]+)"/i);
        const labelMatch = s.match(/>\s*([^<]+)</);
        if(!hrefMatch || !labelMatch) continue;
        const text = labelMatch[1];
        const numMatch = text.match(/Nguồn\s*(\d+)/i);
        if(numMatch){
            map[numMatch[1]] = hrefMatch[1];
        }
    }
    return map;
}

// Chuyển các chuỗi [Nguồn X - ...] trong HTML đã render thành link <a>
function linkInlineCitations(renderedHtml, citationMap, sources){
    return renderedHtml.replace(/\[Nguồn\s*(\d+)\s*[-–]([^\]]*)\]/gi, (match, sourceNum, citationText)=>{
        // Tạo URL đến trang book với highlight text (không cần phụ thuộc vào citationMap)
        const cleanText = citationText.trim();
        const bookUrl = `http://localhost:3000/book/tu-tuong-ho-chi-minh.html#chuong${sourceNum}?hl=${encodeURIComponent(cleanText)}`;
        
        return `<a class="citation-link" href="${bookUrl}" target="_blank" rel="noopener noreferrer" onclick="return openBookWithHighlight('${sourceNum}', '${cleanText.replace(/'/g, "\\'")}')" style="color: #007bff; text-decoration: underline; cursor: pointer;">${match}</a>`;
    });
}

class HCMChatApp {
    constructor() {
        // ===== CẤU HÌNH API =====
        this.API_BASE = window.NODEJS_API || window.API_BASE_URL || 'https://hcm-chatbot-nodejs-api.fly.dev';

        // ===== STATE MANAGEMENT =====
        this.currentConversationId = null; // ID cuộc trò chuyện hiện tại
        this.user = null; // Thông tin người dùng đã đăng nhập
        this.token = null; // JWT token cho authentication
        this.conversations = []; // Danh sách cuộc trò chuyện

        // Khởi tạo ứng dụng
        this.init();
    }

    /**
     * KHỞI TẠO ỨNG DỤNG
     * Kiểm tra authentication và setup giao diện
     */
    async init() {
        // ===== KIỂM TRA AUTHENTICATION =====
        this.token = localStorage.getItem('token'); // Lấy token từ localStorage
        const userStr = localStorage.getItem('user'); // Lấy thông tin user

        // Nếu chưa đăng nhập, chuyển về trang auth
        if (!this.token || !userStr) {
            window.location.href = 'auth.html';
            return;
        }

        try {
            // Parse thông tin user từ JSON
            this.user = JSON.parse(userStr);

            // Kiểm tra quyền truy cập - Admin không được chat
            if (this.user.role === 'admin') {
                alert('Admin không được sử dụng chức năng chat. Chuyển về trang quản trị.');
                window.location.href = 'admin.html';
                return;
            }

            // Setup giao diện và events
            this.setupUI();
            this.bindEvents();

            // Load danh sách cuộc trò chuyện
            await this.loadConversations();
        } catch (error) {
            console.error('Init error:', error);
            // Nếu có lỗi, logout và về trang auth
            this.logout();
        }
    }

    /**
     * SETUP GIAO DIỆN
     * Cấu hình thông tin user và auto-resize textarea
     */
    setupUI() {
        // Hiển thị thông tin user trong sidebar
        document.getElementById('userName').textContent = this.user.fullName || this.user.username;
        document.getElementById('userRole').textContent = this.user.role || 'user';

        // Auto-resize textarea khi người dùng gõ
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', this.autoResizeTextarea);

        // Khởi tạo observer theo dõi message mới để xử lý citations ngay khi xuất hiện
        this.setupCitationObserver();
    }

    /**
     * BIND EVENTS
     * Gắn các event listener cho tương tác người dùng
     */
    bindEvents() {
        // Xử lý submit form chat
        document.getElementById('chatForm').addEventListener('submit', (e) => {
            e.preventDefault(); // Ngăn reload trang
            this.sendMessage();
        });

        // Đóng sidebar khi click overlay (mobile)
        document.getElementById('mobileOverlay').addEventListener('click', () => {
            this.closeSidebar();
        });

        // Xử lý phím Enter để gửi tin nhắn
        document.getElementById('messageInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Ngăn xuống dòng
                this.sendMessage();
            }
            // Shift+Enter vẫn cho phép xuống dòng
        });
    }

    autoResizeTextarea(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        const scrollHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = scrollHeight + 'px';
    }

    async loadConversations() {
        try {
            const response = await this.fetchWithAuth('/conversations');
            if (response.ok) {
                const data = await response.json();
                this.conversations = data.conversations || [];
                this.renderConversations();
            } else {
                console.error('Failed to load conversations');
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    renderConversations() {
        const container = document.getElementById('conversationsList');

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <i class="fas fa-comments" style="font-size: 2rem; margin-bottom: 10px; color: #ddd;"></i>
                    <p>Chưa có cuộc trò chuyện nào</p>
                    <small>Bắt đầu chat để tạo cuộc trò chuyện đầu tiên</small>
                </div>
            `;
            return;
        }

        const conversationsHTML = this.conversations.map(conv => `
            <div class="conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}"
                 onclick="chatApp.selectConversation('${conv.id}')">
                <div class="conversation-title">${conv.title}</div>
                <div class="conversation-meta">
                    <span>${this.formatDate(conv.updatedAt)}</span>
                </div>
                <i class="fas fa-trash delete-conversation"
                   onclick="event.stopPropagation(); chatApp.deleteConversation('${conv.id}')"></i>
            </div>
        `).join('');

        container.innerHTML = conversationsHTML;
    }

    async selectConversation(conversationId) {
        this.currentConversationId = conversationId;
        this.renderConversations(); // Update active state

        // Load messages for this conversation
        await this.loadMessages(conversationId);
        this.hideEmptyState();
        this.closeSidebar(); // Close sidebar on mobile after selection
    }

    async loadMessages(conversationId) {
        try {
            const response = await this.fetchWithAuth(`/conversations/${conversationId}/messages`);
            if (response.ok) {
                const data = await response.json();
                const messages = data.messages || [];
                this.renderMessages(messages);
            } else {
                console.error('Failed to load messages');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('chatMessages');

        if (messages.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #666;">
                    <i class="fas fa-comment-dots" style="font-size: 3rem; margin-bottom: 15px; color: #ddd;"></i>
                    <h3>Cuộc trò chuyện trống</h3>
                    <p>Hãy bắt đầu câu hỏi đầu tiên!</p>
                </div>
            `;
            return;
        }

        const messagesHTML = messages.map(msg => this.createMessageHTML(msg)).join('');
        container.innerHTML = messagesHTML;
        
        console.log('📝 Messages rendered, now processing citations...');
        
        // Đảm bảo DOM đã được render trước khi xử lý citations
        // Dùng setTimeout để browser có thời gian update DOM
        setTimeout(() => {
            console.log('⏰ Timeout triggered, processing citations now...');
            this.processCitationsInDOM();
            this.scrollToBottom();
        }, 300);
    }

    createMessageHTML(message) {
        const isUser = message.role === 'user';
        const avatar = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        let sourcesHTML = '';
        let sourcesArr = [];
        if (!isUser && message.sources) {
            try {
                sourcesArr = typeof message.sources === 'string'
                    ? JSON.parse(message.sources)
                    : (Array.isArray(message.sources) ? message.sources : []);

                if (Array.isArray(sourcesArr) && sourcesArr.length > 0) {
                    sourcesHTML = `
                        <div class="message-sources">
                            <h4>Nguồn tham khảo:</h4>
                            ${sourcesArr.map(source => `<div class="source-item">${source}</div>`).join('')}
                        </div>
                    `;
                }
            } catch (e) {
                console.error('Error parsing sources:', e);
            }
        }

        let metaHTML = '';
        if (!isUser) {
            metaHTML = `
                <div class="message-meta">
                    <span>${this.formatDateTime(message.createdAt)}</span>
                </div>
            `;
        }

        // Render nội dung rồi chuyển citations thành link ngay tại đây
        let contentHtml = this.formatMessageContent(message.content);
        contentHtml = this.convertCitationsInHTML(contentHtml);

        return `
            <div class="message ${isUser ? 'user-message' : 'bot-message'}">
                <div class="message-row">
                    <div class="message-avatar">${avatar}</div>
                    <div class="message-content">
                        <div class="message-bubble">${contentHtml}</div>
                        ${sourcesHTML}
                        ${metaHTML}
                    </div>
                </div>
            </div>
        `;
    }

    // Biến các chuỗi [Nguồn X - ...] trong HTML đã render thành <a> ngay khi render
    convertCitationsInHTML(html) {
        if (!html || typeof html !== 'string') return html;
        return html.replace(/\[Nguồn\s*(\d+)\s*[-–]([^\]]*)\]/gi, (match, sourceNum, citationText) => {
            const cleanText = (citationText || '').trim();

            // Map theo tên chương, KHÔNG theo số nguồn
            let chapterSlug = 'chuong1';
            if (cleanText.includes('Chương VI')) chapterSlug = 'chuong6';
            else if (cleanText.includes('Chương V')) chapterSlug = 'chuong5';
            else if (cleanText.includes('Chương IV')) chapterSlug = 'chuong4';
            else if (cleanText.includes('Chương III')) chapterSlug = 'chuong3';
            else if (cleanText.includes('Chương II')) chapterSlug = 'chuong2';
            else if (cleanText.includes('Chương I')) chapterSlug = 'chuong1';

            // Lấy text để highlight
            let highlightText = '';
            const quoteMatch1 = cleanText.match(/:\s*"([^"]+)"/); // "..."
            const quoteMatch2 = cleanText.match(/:\s*[“”]([^”]+)[“”]/); // tiếng Việt ngoặc kép
            if (quoteMatch1) highlightText = quoteMatch1[1].trim();
            else if (quoteMatch2) highlightText = quoteMatch2[1].trim();
            else {
                highlightText = cleanText.replace(/^.*?[-–]\s*/, '').trim();
                if (/^Chương\s+[IVX]+$/i.test(highlightText)) highlightText = '';
            }

            const bookUrl = highlightText
                ? `http://localhost:3000/book/tu-tuong-ho-chi-minh.html#${chapterSlug}?hl=${encodeURIComponent(highlightText)}`
                : `http://localhost:3000/book/tu-tuong-ho-chi-minh.html#${chapterSlug}`;

            return `<a class="citation-link" href="${bookUrl}" target="_blank" style="color: #007bff !important; text-decoration: underline !important; font-weight: bold !important; cursor: pointer !important;">${match}</a>`;
        });
    }

    formatMessageContent(content) {
        // Nếu content chứa HTML (có tag <div> hoặc <button>), trả về nguyên văn
        if (content && (content.includes('<div') || content.includes('<button'))) {
            return content;
        }
        // Ngược lại render markdown đơn giản
        return renderMarkdownLite(content);
    }

    /**
     * Kiểm tra nếu tin nhắn yêu cầu tìm ảnh
     */
    checkImageSearchRequest(message) {
        const imagePatterns = [
            /tìm.*ảnh/i,
            /tấm ảnh/i,
            /hình.*bác hồ/i,
            /ảnh.*hồ chí minh/i,
            /tìm.*hình/i,
            /photo.*ho chi minh/i
        ];

        return imagePatterns.some(pattern => pattern.test(message));
    }

    /**
     * Xử lý yêu cầu tìm ảnh
     */
    async handleImageSearchRequest(message) {
        try {
            // Extract search query từ message
            let query = message.toLowerCase()
                .replace(/tìm.*?ảnh/i, '')
                .replace(/tấm ảnh/i, '')
                .replace(/hình.*?về/i, '')
                .replace(/ảnh.*?về/i, '')
                .trim();
                
            if (!query) {
                query = 'Hồ Chí Minh';
            }

            console.log('🔍 Searching images for:', query);
            console.log('🔧 Calling image search API...');

            // Gọi API tìm ảnh
            const response = await fetch('http://localhost:8000/images/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    num_results: 6
                })
            });

            console.log('📡 Image API Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Image API Error:', errorText);
                throw new Error(`Không thể tìm ảnh: ${response.status} - ${errorText}`);
            }

            console.log('🔧 Parsing image response...');
            const result = await response.json();
            console.log('✅ Image search result:', result);
            
            // Tạo HTML grid ảnh
            let imagesHTML = '';
            if (result.images && result.images.length > 0) {
                imagesHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                        ${result.images.map(img => `
                            <div style="border: 1px solid rgba(255,255,255,0.2); border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); transition: all 0.3s ease;" 
                                 onclick="window.open('${img.original}', '_blank')"
                                 onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.3)'"
                                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)'">
                                <img src="${img.thumbnail}" 
                                     alt="${img.title}" 
                                     style="width: 100%; height: 150px; object-fit: cover;"
                                     onerror="this.style.display='none'">
                                <div style="padding: 15px; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px);">
                                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #ffffff; line-height: 1.4; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                                        ${img.title.substring(0, 80)}${img.title.length > 80 ? '...' : ''}
                                    </div>
                                    <div style="font-size: 11px; color: #cccccc; font-weight: 500; opacity: 0.9;">
                                        <i class="fas fa-link" style="margin-right: 5px; color: #4facfe;"></i>Nguồn: ${img.source}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                imagesHTML = `
                    <div style="padding: 20px; text-align: center; color: #666;">
                        <i class="fas fa-image" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>Không tìm thấy ảnh nào phù hợp</p>
                    </div>
                `;
            }

            return {
                answer: `Tôi đã tìm được ${result.total} ảnh về "${query}" từ các trang báo uy tín:\n\n${imagesHTML}`,
                sources: [],
                confidence: 100
            };

        } catch (error) {
            console.error('Error searching images:', error);
            return {
                answer: 'Xin lỗi, tôi không thể tìm ảnh lúc này. Vui lòng thử lại sau.',
                sources: [],
                confidence: 0
            };
        }
    }

    /**
     * Kiểm tra nếu tin nhắn yêu cầu tạo quiz
     */
    checkQuizRequest(message) {
        // Kiểm tra các pattern yêu cầu tạo quiz
        const quizPatterns = [
            /tạo.*(\d+).*câu hỏi/i,
            /tạo.*bài kiểm tra/i,
            /tạo.*quiz/i,
            /kiểm tra.*kiến thức/i,
            /(\d+).*câu hỏi.*chương/i
        ];

        for (const pattern of quizPatterns) {
            if (pattern.test(message)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Xử lý yêu cầu tạo quiz
     */
    async handleQuizRequest(message) {
        // Parse thông tin từ message
        let numQuestions = 10;
        let chapter = '';

        // Tìm số câu hỏi
        const numMatch = message.match(/(\d+)\s*câu/i);
        if (numMatch) {
            numQuestions = parseInt(numMatch[1]);
            numQuestions = Math.max(5, Math.min(30, numQuestions));
        }

        // Tìm chương - hỗ trợ nhiều cách viết
        const chapterPatterns = [
            { pattern: /chương\s*(I\b|1|một)/i, value: 'Chương I' },
            { pattern: /chương\s*(II\b|2|hai)/i, value: 'Chương II' },
            { pattern: /chương\s*(III\b|3|ba)/i, value: 'Chương III' },
            { pattern: /chương\s*(IV\b|4|bốn|tư)/i, value: 'Chương IV' },
            { pattern: /chương\s*(V\b|5|năm)/i, value: 'Chương V' },
            { pattern: /chương\s*(VI\b|6|sáu)/i, value: 'Chương VI' }
        ];

        for (const { pattern, value } of chapterPatterns) {
            if (pattern.test(message)) {
                chapter = value;
                break;
            }
        }

        if (!chapter) {
            chapter = 'Tất cả';
        }

        // Gọi API tạo quiz
        try {
            console.log('🚀 Đang gọi API tạo quiz:', { chapter, numQuestions });
            
            const response = await fetch(`${window.PYTHON_AI_API}/quiz/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapter: chapter,
                    num_questions: numQuestions,
                    difficulty: 'medium'
                })
            });

            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error:', errorText);
                throw new Error(`Không thể tạo quiz: ${response.status} - ${errorText}`);
            }

            const quiz = await response.json();
            console.log('✅ Quiz created successfully:', quiz.id);

            // Tạo response với nút làm bài
            const quizResponse = `
                <div style="background: linear-gradient(135deg, #e3f2fd, #f3e5f5); padding: 1.5rem; border-radius: 15px; margin-top: 1rem;">
                    <h3 style="color: #333; margin-bottom: 1rem;">
                        ✅ Đã tạo bài kiểm tra thành công!
                    </h3>
                    <p style="color: #666; margin-bottom: 1rem;">
                        <strong>${quiz.title}</strong><br>
                        Số câu hỏi: ${quiz.num_questions}<br>
                        Độ khó: ${quiz.difficulty === 'easy' ? 'Dễ' : quiz.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                    </p>
                    <button onclick="window.open('quiz.html?quiz_id=${quiz.id}', '_blank')" 
                            style="background: linear-gradient(135deg, #667eea, #764ba2); 
                                   color: white; 
                                   border: none; 
                                   padding: 0.75rem 1.5rem; 
                                   border-radius: 10px; 
                                   cursor: pointer; 
                                   font-size: 1rem;
                                   display: inline-flex;
                                   align-items: center;
                                   gap: 0.5rem;">
                        <i class="fas fa-play"></i>
                        Làm bài kiểm tra ngay
                    </button>
                </div>
            `;

            return {
                answer: `Tôi đã tạo cho bạn bộ ${numQuestions} câu hỏi kiểm tra về ${chapter} tư tưởng Hồ Chí Minh.\n\n${quizResponse}`,
                sources: [],
                confidence: 100
            };

        } catch (error) {
            console.error('Error creating quiz:', error);
            return {
                answer: 'Xin lỗi, tôi không thể tạo bài kiểm tra lúc này. Vui lòng thử lại sau.',
                sources: [],
                confidence: 0
            };
        }
    }

    /**
     * 1. Validate input và update UI
     * 2. Gửi request đến .NET API
     * 3. API gọi Python AI và trả về response
     * 4. Hiển thị phản hồi AI trên giao diện
     */
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();

        // Không gửi nếu tin nhắn trống
        if (!message) return;

        // ===== BƯỚC 1: CHUẨN BỊ UI =====
        // Xóa input và disable form để tránh spam
        input.value = '';
        input.style.height = 'auto';
        this.setInputDisabled(true);
        this.showTypingIndicator(); // Hiển thị "AI đang trả lời..."

        try {
            // ===== BƯỚC 2: HIỂN THỊ TIN NHẮN NGƯỜI DÙNG NGAY LẬP TỨC =====
            this.addMessageToUI({
                content: message,
                role: 'user',
                createdAt: new Date().toISOString()
            });

            // ===== KIỂM TRA NẾU LÀ YÊU CẦU TÌM ẢNH =====
            if (this.checkImageSearchRequest(message)) {
                const imageResult = await this.handleImageSearchRequest(message);
                
                // Hiển thị kết quả tìm ảnh
                this.addMessageToUI({
                    content: imageResult.answer,
                    role: 'assistant',
                    sources: [],
                    confidence: 100,
                    createdAt: new Date().toISOString()
                });

                // Cleanup và return
                this.setInputDisabled(false);
                this.hideTypingIndicator();
                document.getElementById('messageInput').focus();
                return;
            }

            // ===== KIỂM TRA NẾU LÀ YÊU CẦU TẠO QUIZ =====
            if (this.checkQuizRequest(message)) {
                const quizResult = await this.handleQuizRequest(message);
                
                // Hiển thị kết quả quiz
                this.addMessageToUI({
                    content: quizResult.answer,
                    role: 'assistant',
                    sources: quizResult.sources,
                    confidence: quizResult.confidence,
                    createdAt: new Date().toISOString()
                });

                // Cleanup và return
                this.setInputDisabled(false);
                this.hideTypingIndicator();
                document.getElementById('messageInput').focus();
                return;
            }

            // ===== BƯỚC 3: GỬI REQUEST ĐẾN .NET API =====
            // Tạo AbortController để timeout sau 60 giây
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

            // Gọi Node.js API với authentication
            const response = await this.fetchWithAuth('/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversationId: this.currentConversationId // null nếu cuộc trò chuyện mới
                }),
                signal: controller.signal // Cho phép timeout
            });

            clearTimeout(timeoutId);

            // ===== BƯỚC 4: XỬ LÝ RESPONSE =====
            if (response.ok) {
                const data = await response.json();
                console.log('Message API response:', data);
                
                // Response from Node.js API includes userMessage and aiMessage
                const userMessage = data.userMessage;
                const aiResponse = data.aiResponse;

                // Add user message to UI
                this.addMessageToUI({
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                });

                // Add AI response to UI if available
                if (aiResponse) {
                    this.addMessageToUI({
                        role: 'assistant', 
                        content: aiResponse,
                        timestamp: new Date().toISOString()
                    });
                }

                // Cập nhật danh sách cuộc trò chuyện trong sidebar
                await this.loadConversations();
                this.hideEmptyState();

            } else {
                // Xử lý lỗi từ API
                const errorData = await response.json();
                this.showError(errorData.message || 'Có lỗi xảy ra khi gửi tin nhắn');
            }

        } catch (error) {
            console.error('Send message error:', error);
            // Xử lý các loại lỗi khác nhau
            if (error.name === 'AbortError') {
                this.showError('Timeout: AI đang xử lý quá lâu. Vui lòng thử câu hỏi ngắn hơn.');
            } else {
                this.showError('Lỗi kết nối. Vui lòng thử lại.');
            }
        } finally {
            // ===== BƯỚC 5: CLEANUP =====
            // Luôn enable lại form và ẩn typing indicator
            this.setInputDisabled(false);
            this.hideTypingIndicator();
            document.getElementById('messageInput').focus();
        }
    }

    addMessageToUI(message) {
        const container = document.getElementById('chatMessages');
        const messageHTML = this.createMessageHTML(message);
        container.insertAdjacentHTML('beforeend', messageHTML);
        // Xử lý citations NGAY cho bubble vừa thêm
        try {
            const lastMessage = container.querySelector('.message:last-child .message-bubble');
            if (lastMessage) {
                this.processCitationsForBubble(lastMessage, 'last');
            }
        } catch (e) {
            console.error('Error immediate-processing citations:', e);
        }

        // Dự phòng: quét lại sau một nhịp render ngắn
        setTimeout(() => {
            try {
                this.processCitationsInDOM();
            } catch {}
            this.scrollToBottom();
        }, 50);
    }

    setInputDisabled(disabled) {
        document.getElementById('messageInput').disabled = disabled;
        document.getElementById('sendButton').disabled = disabled;
    }

    showTypingIndicator() {
        document.getElementById('typingIndicator').style.display = 'block';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        document.getElementById('typingIndicator').style.display = 'none';
    }

    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }

    // Xử lý citations cho 1 bubble cụ thể (tránh reflow toàn bộ)
    processCitationsForBubble(bubble, indexHint = '?') {
        if (!bubble || bubble.dataset.citationsProcessed === '1') return;
        let html = bubble.innerHTML;
        const originalHtml = html;
        let matchCount = 0;

        html = html.replace(/\[Nguồn\s*(\d+)\s*[-–]([^\]]*)\]/gi, (match, sourceNum, citationText) => {
            matchCount++;
            const cleanText = citationText.trim();

            // Map theo tên chương, KHÔNG theo số nguồn
            let chapterSlug = 'chuong1';
            if (cleanText.includes('Chương VI')) chapterSlug = 'chuong6';
            else if (cleanText.includes('Chương V')) chapterSlug = 'chuong5';
            else if (cleanText.includes('Chương IV')) chapterSlug = 'chuong4';
            else if (cleanText.includes('Chương III')) chapterSlug = 'chuong3';
            else if (cleanText.includes('Chương II')) chapterSlug = 'chuong2';
            else if (cleanText.includes('Chương I')) chapterSlug = 'chuong1';

            // Lấy text để highlight
            let highlightText = '';
            const quoteMatch = cleanText.match(/:\s*[""]([^""]+)[""]/);
            const normalQuoteMatch = cleanText.match(/:\s*"([^"]+)"/);
            if (quoteMatch) {
                highlightText = quoteMatch[1].trim();
            } else if (normalQuoteMatch) {
                highlightText = normalQuoteMatch[1].trim();
            } else {
                highlightText = cleanText.replace(/^.*?[-–]\s*/, '').trim();
                if (/^Chương\s+[IVX]+$/.test(highlightText)) highlightText = '';
            }

            const bookUrl = highlightText
                ? `http://localhost:3000/book/tu-tuong-ho-chi-minh.html#${chapterSlug}?hl=${encodeURIComponent(highlightText)}`
                : `http://localhost:3000/book/tu-tuong-ho-chi-minh.html#${chapterSlug}`;
            return `<a class="citation-link" href="${bookUrl}" target="_blank" style="color: #007bff !important; text-decoration: underline !important; font-weight: bold !important; cursor: pointer !important;">${match}</a>`;
        });

        if (matchCount > 0 && html !== originalHtml) {
            bubble.innerHTML = html;
            bubble.dataset.citationsProcessed = '1';
            console.log(`✅ Bubble ${indexHint}: processed ${matchCount} citations`);
        }
    }

    // Quét toàn trang và chỉ xử lý các bubble chưa xử lý
    processCitationsInDOM() {
        console.log('🔍 Processing citations in DOM...');
        const bubbles = document.querySelectorAll('.message-bubble:not([data-citations-processed="1"])');
        console.log('Found unprocessed bubbles:', bubbles.length);
        bubbles.forEach((bubble, idx) => this.processCitationsForBubble(bubble, idx));
    }

    // Quan sát thay đổi DOM để không cần reload/triggers thủ công
    setupCitationObserver() {
        const container = document.getElementById('chatMessages');
        if (!container || this._citationObserver) return;
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                m.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    // Nếu node là message mới
                    if (node.matches && node.matches('.message')) {
                        const bubble = node.querySelector('.message-bubble');
                        if (bubble) this.processCitationsForBubble(bubble);
                    }
                    // Hoặc node có chứa nhiều bubble bên trong
                    const nested = node.querySelectorAll ? node.querySelectorAll('.message-bubble') : [];
                    nested.forEach((b) => this.processCitationsForBubble(b));
                });
            }
        });
        observer.observe(container, { childList: true, subtree: true });
        this._citationObserver = observer;
        console.log('👀 Citation observer attached');
    }

    async startNewChat() {
        this.currentConversationId = null;
        document.getElementById('chatMessages').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-dots"></i>
                <h3>Cuộc trò chuyện mới</h3>
                <p>Hãy bắt đầu với câu hỏi đầu tiên về tư tưởng Hồ Chí Minh</p>
            </div>
        `;

        // Clear active conversation
        this.renderConversations();
        this.closeSidebar();
        document.getElementById('messageInput').focus();
    }

    async deleteConversation(conversationId) {
        if (!confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) {
            return;
        }

        try {
            const response = await this.fetchWithAuth(`/conversations/${conversationId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove from local list
                this.conversations = this.conversations.filter(c => c.id !== conversationId);

                // If this was the current conversation, start a new one
                if (this.currentConversationId === conversationId) {
                    this.startNewChat();
                }

                this.renderConversations();
            } else {
                this.showError('Không thể xóa cuộc trò chuyện');
            }
        } catch (error) {
            console.error('Delete conversation error:', error);
            this.showError('Lỗi khi xóa cuộc trò chuyện');
        }
    }

    sendSuggestedMessage(message) {
        document.getElementById('messageInput').value = message;
        this.sendMessage();
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');

        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');

        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    showError(message) {
        // Create a temporary error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    /**
     * FETCH VỚI AUTHENTICATION
     * Wrapper cho fetch API tự động thêm JWT token và xử lý unauthorized
     *
     * @param {string} endpoint - API endpoint (VD: '/chat/send')
     * @param {object} options - Fetch options (method, body, headers, etc.)
     * @returns {Promise<Response>} - Response từ server
     */
    async fetchWithAuth(endpoint, options = {}) {
        const url = this.API_BASE + endpoint; // Tạo URL đầy đủ

        // Thêm Authorization header với JWT token
        const headers = {
            'Authorization': `Bearer ${this.token}`, // Bearer token format
            ...options.headers // Merge với headers khác
        };

        // Gọi API với authenticated headers
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Nếu token hết hạn hoặc không hợp lệ, logout
        if (response.status === 401) {
            this.logout(); // Xóa token và về trang đăng nhập
            return;
        }

        return response;
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'auth.html';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Hôm nay';
        } else if (diffDays === 1) {
            return 'Hôm qua';
        } else if (diffDays < 7) {
            return `${diffDays} ngày trước`;
        } else {
            return date.toLocaleDateString('vi-VN');
        }
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    }
}

// ===== GLOBAL FUNCTIONS CHO HTML ONCLICK EVENTS =====
// Các function này được gọi trực tiếp từ HTML onclick attributes

function toggleSidebar() {
    chatApp.toggleSidebar();
}

function startNewChat() {
    chatApp.startNewChat();
}

function logout() {
    chatApp.logout();
}

function sendSuggestedMessage(message) {
    chatApp.sendSuggestedMessage(message);
}

// ===== USER PROFILE FUNCTIONS =====
/**
 * Mở modal chỉnh sửa profile cho user
 */
function openUserProfile() {
    const modal = document.getElementById('profileModal');

    // Lấy thông tin user từ localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        alert('Không tìm thấy thông tin người dùng!');
        return;
    }

    try {
        const user = JSON.parse(userStr);

        // Điền thông tin vào form
        document.getElementById('profileUsername').value = user.username || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profileFullName').value = user.fullName || '';
        document.getElementById('profileRole').value = user.role || 'user';

        // Clear password fields
        document.getElementById('userCurrentPassword').value = '';
        document.getElementById('userNewPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';

        // Hiển thị modal
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error parsing user data:', error);
        alert('Lỗi khi tải thông tin người dùng!');
    }
}

/**
 * Đóng modal profile
 */
function closeUserProfile() {
    const modal = document.getElementById('profileModal');
    modal.style.display = 'none';
}

/**
 * Cập nhật profile user
 */
async function updateUserProfile() {
    try {
        const email = document.getElementById('profileEmail').value.trim();
        const fullName = document.getElementById('profileFullName').value.trim();

        if (!email) {
            alert('Vui lòng nhập email!');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Phiên đăng nhập đã hết hạn!');
            window.location.href = 'auth.html';
            return;
        }

        const response = await fetch(`${chatApp.API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, fullName })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Cập nhật localStorage và UI
                const userStr = localStorage.getItem('user');
                const user = userStr ? JSON.parse(userStr) : {};
                user.email = email;
                user.fullName = fullName;
                localStorage.setItem('user', JSON.stringify(user));
                document.getElementById('userName').textContent = fullName || user.username || '';
                alert('Cập nhật profile thành công!');
                closeUserProfile();
            } else {
                alert('Lỗi cập nhật profile: ' + (data.message || 'Không xác định'));
            }
        } else {
            alert('Lỗi kết nối server khi cập nhật profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Lỗi cập nhật profile: ' + error.message);
    }
}

/**
 * Đổi mật khẩu user
 */
async function changeUserPassword() {
    try {
        const currentPassword = document.getElementById('userCurrentPassword').value;
        const newPassword = document.getElementById('userNewPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Vui lòng điền đầy đủ thông tin mật khẩu!');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('Mật khẩu mới và xác nhận mật khẩu không khớp!');
            return;
        }
        if (newPassword.length < 6) {
            alert('Mật khẩu mới phải có ít nhất 6 ký tự!');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Phiên đăng nhập đã hết hạn!');
            window.location.href = 'auth.html';
            return;
        }

        const response = await fetch(`${chatApp.API_BASE}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                alert('Đổi mật khẩu thành công!');
                document.getElementById('userCurrentPassword').value = '';
                document.getElementById('userNewPassword').value = '';
                document.getElementById('userConfirmPassword').value = '';
            } else {
                alert('Lỗi đổi mật khẩu: ' + (data.message || 'Không xác định'));
            }
        } else {
            alert('Lỗi kết nối server khi đổi mật khẩu');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('Lỗi đổi mật khẩu: ' + error.message);
    }
}

// ===== KHỞI TẠO ỨNG DỤNG =====
let chatApp;
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo chatbot khi DOM đã load xong
    chatApp = new HCMChatApp();

    // Setup modal click outside to close
    const profileModal = document.getElementById('profileModal');
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            closeUserProfile();
        }
    });
});

// ===== DYNAMIC CSS =====
// Thêm CSS animation cho error notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Function để mở trang book với highlight text
function openBookWithHighlight(chapterNum, text) {
    const bookUrl = `http://localhost:3000/book/tu-tuong-ho-chi-minh.html#chuong${chapterNum}?hl=${encodeURIComponent(text)}`;
    window.open(bookUrl, '_blank', 'noopener,noreferrer');
    return false;
}