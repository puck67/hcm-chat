class HCMChatbot {
    constructor() {
        this.apiUrl = window.PYTHON_AI_API || 'http://localhost:8000';
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatForm = document.getElementById('chatForm');
        // Update form selector to match new HTML
        if (!this.chatForm) {
            this.chatForm = document.querySelector('.chat-input-form');
        }
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.statusBadge = document.getElementById('statusBadge');

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkServerStatus();
        this.focusInput();
    }

    bindEvents() {
        // Form submission
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Topic buttons (updated selector)
        document.querySelectorAll('.topic-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.getAttribute('data-question');
                this.messageInput.value = question;
                this.sendMessage();
            });
        });

        // Enter key handling
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                this.updateStatus('connected', 'Đã kết nối');
            } else {
                this.updateStatus('error', 'Lỗi kết nối');
            }
        } catch (error) {
            console.error('Server status check failed:', error);
            this.updateStatus('error', 'Không thể kết nối');
        }
    }
    updateStatus(status, text) {
        this.statusDot.className = `fas fa-circle status-dot ${status}`;
        this.statusText.textContent = text;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Chuyển qua trang chat ngay lập tức với message
        const encodedMessage = encodeURIComponent(message);
        window.location.href = `chat.html?message=${encodedMessage}`;
        return;

        try {
            const response = await fetch(`${this.apiUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.addMessage(data.answer, 'bot', {
                sources: data.sources || [],
                confidence: data.confidence || 0,
                lastUpdated: data.last_updated
            });

        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage(
                'Xin lỗi, có lỗi xảy ra khi kết nối với server. Vui lòng thử lại sau.',
                'bot',
                { isError: true }
            );
        } finally {
            this.showLoading(false);
            this.setInputState(true);
            this.focusInput();
        }
    }

    addMessage(text, sender, metadata = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.innerHTML = this.formatMessage(text);

        contentDiv.appendChild(textDiv);

        // Add sources if available
        if (metadata.sources && metadata.sources.length > 0) {
            const sourcesDiv = this.createSourcesDiv(metadata.sources);
            contentDiv.appendChild(sourcesDiv);
        }

        // Add metadata for bot messages
        if (sender === 'bot' && !metadata.isError) {
            const metaDiv = this.createMetadataDiv(metadata);
            contentDiv.appendChild(metaDiv);
        }

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    createSourcesDiv(sources) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'message-sources';

        const titleElement = document.createElement('h4');
        titleElement.textContent = 'Nguồn tham khảo:';
        sourcesDiv.appendChild(titleElement);

        sources.forEach(source => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.textContent = source;
            sourcesDiv.appendChild(sourceItem);
        });

        return sourcesDiv;
    }

    createMetadataDiv(metadata) {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';

        const leftSpan = document.createElement('span');
        if (metadata.lastUpdated) {
            leftSpan.textContent = `Cập nhật: ${metadata.lastUpdated}`;
        }

        const rightSpan = document.createElement('span');
        if (metadata.confidence) {
            rightSpan.className = 'confidence-badge';
            rightSpan.textContent = `Độ tin cậy: ${metadata.confidence}%`;
        }

        metaDiv.appendChild(leftSpan);
        metaDiv.appendChild(rightSpan);

        return metaDiv;
    }

    formatMessage(text) {
        // Convert line breaks to HTML
        return text.replace(/\n/g, '<br>');
    }

    setInputState(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendButton.disabled = !enabled;
    }

    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.add('show');
        } else {
            this.loadingOverlay.classList.remove('show');
        }
    }

    focusInput() {
        setTimeout(() => {
            this.messageInput.focus();
        }, 100);
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HCMChatbot();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page became visible, check server status
        if (window.chatbot) {
            window.chatbot.checkServerStatus();
        }
    }
});

// Auto-resize for mobile
window.addEventListener('resize', () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

// Set initial viewport height
const vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', `${vh}px`);