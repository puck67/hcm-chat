/**
 * HCM CHATBOT ADMIN DASHBOARD
 * Giao diện quản trị cho admin theo dõi người dùng và hoạt động hệ thống
 * LAST UPDATED: 2025-09-29 04:37:00 - Added detailed debugging for totalMessages
 */

class AdminDashboard {
    constructor() {
        console.log('🚀 AdminDashboard constructor called - Script loaded successfully!');
        // ===== CẤU HÌNH API =====
        this.API_BASE = 'http://localhost:9000/api';

        // ===== STATE MANAGEMENT =====
        this.user = null;
        this.token = null;
        this.currentSection = 'dashboard';

        this.init();
    }

    /**
     * KHỞI TẠO DASHBOARD
     * Kiểm tra quyền admin và setup giao diện
     */
    async init() {
        // Kiểm tra authentication
        this.token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!this.token || !userStr) {
            alert('Vui lòng đăng nhập để truy cập trang này!');
            window.location.href = 'auth.html';
            return;
        }

        try {
            this.user = JSON.parse(userStr);

            // Kiểm tra quyền admin - bắt buộc phải có role admin
            if (!this.user || this.user.role !== 'admin') {
                alert('Bạn không có quyền truy cập trang quản trị!');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'auth.html';
                return;
            }

            // Xác thực token với server
            const validationResponse = await this.fetchWithAuth('/auth/me');
            if (!validationResponse || !validationResponse.ok) {
                alert('Phiên đăng nhập đã hết hạn!');
                this.logout();
                return;
            }

            this.setupUI();
            this.bindEvents();
            await this.loadDashboardData();
        } catch (error) {
            console.error('Init error:', error);
            alert('Lỗi khởi tạo trang quản trị. Vui lòng đăng nhập lại.');
            this.logout();
        }
    }

    /**
     * SETUP GIAO DIỆN
     */
    setupUI() {
        // Hiển thị tên admin
        document.getElementById('adminName').textContent = this.user.fullName || this.user.username;
    }

    /**
     * BIND EVENTS
     */
    bindEvents() {
        // Navigation events
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('.nav-link').dataset.section;
                this.showSection(section);
            });
        });
    }

    /**
     * HIỂN THỊ SECTION
     */
    async showSection(sectionName) {
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show target section
        document.getElementById(`${sectionName}-section`).style.display = 'block';
        this.currentSection = sectionName;

        // Load section data
        switch (sectionName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'conversations':
                await this.loadConversations();
                break;
            case 'messages':
                await this.loadMessages();
                break;
            case 'profile':
                await this.loadProfile();
                break;
        }
    }

    /**
     * TẢI DỮ LIỆU DASHBOARD
     */
    async loadDashboardData() {
        try {
            // Load basic stats
            const response = await this.fetchWithAuth('/dashboard/stats');
            if (response && response.ok) {
                const data = await response.json();
                const stats = data.data;

                console.log('Dashboard stats API response:', data);
                console.log('Stats object:', stats);
                console.log('stats.totalMessages value:', stats.totalMessages);
                console.log('typeof stats.totalMessages:', typeof stats.totalMessages);

                // Cập nhật thống kê cơ bản
                document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
                document.getElementById('totalConversations').textContent = stats.totalConversations || 0;

                // Detailed logging for totalMessages element
                const messagesElement = document.getElementById('totalMessages');
                console.log('totalMessages element found:', messagesElement);
                console.log('Current textContent before update:', messagesElement.textContent);
                messagesElement.textContent = stats.totalMessages || 0;
                console.log('textContent after update:', messagesElement.textContent);
                console.log('Final value set:', stats.totalMessages || 0);

                // AI responses = messages from assistant role
                const aiCount = Math.floor((stats.totalMessages || 0) / 2); // Estimate
                document.getElementById('aiResponses').textContent = aiCount;
            }

            // Load detailed chat statistics
            await this.loadDetailedChatStats();
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    /**
     * TẢI THỐNG KÊ CHAT CHI TIẾT
     */
    async loadDetailedChatStats() {
        try {
            // Load message stats
            const messageResponse = await this.fetchWithAuth('/dashboard/messages/stats');
            if (messageResponse && messageResponse.ok) {
                const messageData = await messageResponse.json();
                const messageStats = messageData.data;

                // Cập nhật thống kê tin nhắn
                document.getElementById('messagesThisWeek').textContent = messageStats.thisWeekCount || 0;
                document.getElementById('avgMessagesPerConversation').textContent =
                    Math.round(messageStats.averagePerConversation || 0);
            }

            // Load user activity stats
            const userResponse = await this.fetchWithAuth('/dashboard/users/stats');
            if (userResponse && userResponse.ok) {
                const userData = await userResponse.json();
                const userStats = userData.data;

                // Estimate active users this week (users who sent messages)
                const activeThisWeek = Math.floor((userStats.activeCount || 0) * 0.3); // Estimate
                document.getElementById('activeUsersThisWeek').textContent = activeThisWeek;
            }

            // Load recent messages to calculate average confidence
            const recentMessagesResponse = await this.fetchWithAuth('/dashboard/messages');
            if (recentMessagesResponse && recentMessagesResponse.ok) {
                const recentData = await recentMessagesResponse.json();
                const recentMessages = recentData.data || [];

                // Calculate average confidence score for AI messages
                const aiMessages = recentMessages.filter(msg => msg.role === 'assistant' && msg.confidenceScore);
                if (aiMessages.length > 0) {
                    const avgConfidence = aiMessages.reduce((sum, msg) => sum + (msg.confidenceScore || 0), 0) / aiMessages.length;
                    document.getElementById('avgConfidenceScore').textContent = Math.round(avgConfidence) + '%';
                } else {
                    document.getElementById('avgConfidenceScore').textContent = 'N/A';
                }
            }
        } catch (error) {
            console.error('Error loading detailed chat stats:', error);
            // Set default values on error
            document.getElementById('messagesThisWeek').textContent = 'N/A';
            document.getElementById('avgMessagesPerConversation').textContent = 'N/A';
            document.getElementById('activeUsersThisWeek').textContent = 'N/A';
            document.getElementById('avgConfidenceScore').textContent = 'N/A';
        }
    }

    /**
     * TẢI DANH SÁCH NGƯỜI DÙNG
     */
    async loadUsers() {
        const container = document.getElementById('usersContent');

        try {
            const response = await this.fetchWithAuth('/dashboard/users');
            if (response.ok) {
                const data = await response.json();
                const users = data.data || [];

                if (users.length === 0) {
                    container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Không có dữ liệu người dùng</p>';
                    return;
                }

                const tableHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Tên đăng nhập</th>
                                <th>Email</th>
                                <th>Họ tên</th>
                                <th>Vai trò</th>
                                <th>Trạng thái</th>
                                <th>Số cuộc trò chuyện</th>
                                <th>Số tin nhắn</th>
                                <th>Ngày tạo</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>${user.username}</td>
                                    <td>${user.email}</td>
                                    <td>${user.fullName || ''}</td>
                                    <td><span style="padding: 4px 8px; border-radius: 4px; background: ${user.role === 'admin' ? '#f44336' : '#4CAF50'}; color: white; font-size: 0.8rem;">${user.role}</span></td>
                                    <td><span style="padding: 4px 8px; border-radius: 4px; background: ${user.status === 'enable' ? '#4CAF50' : '#f44336'}; color: white; font-size: 0.8rem;">${user.status === 'enable' ? 'Hoạt động' : 'Bị khóa'}</span></td>
                                    <td>${user.totalConversations}</td>
                                    <td>${user.totalMessages}</td>
                                    <td>${this.formatDate(user.createdAt)}</td>
                                    <td>
                                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                            ${user.role !== 'admin' ? `
                                                <button onclick="adminDashboard.toggleUserStatus('${user.id}', '${user.status}')"
                                                        style="padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; background: ${user.status === 'enable' ? '#f44336' : '#4CAF50'}; color: white;">
                                                    ${user.status === 'enable' ? 'Khóa' : 'Mở khóa'}
                                                </button>
                                                <button onclick="adminDashboard.promoteUser('${user.id}')"
                                                        style="padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; background: #FF9800; color: white;">
                                                    Phân quyền Admin
                                                </button>
                                            ` : '<span style="color: #666; font-size: 0.8rem;">Admin chính</span>'}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;

                container.innerHTML = tableHTML;
            } else {
                container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Lỗi tải dữ liệu người dùng</p>';
            }
        } catch (error) {
            console.error('Error loading users:', error);
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Lỗi kết nối</p>';
        }
    }

    /**
     * TẢI DANH SÁCH CUỘC TRÒ CHUYỆN
     */
    async loadConversations() {
        const container = document.getElementById('conversationsContent');

        try {
            const response = await this.fetchWithAuth('/dashboard/conversations');
            if (response.ok) {
                const data = await response.json();
                const conversations = data.data || [];

                if (conversations.length === 0) {
                    container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Không có cuộc trò chuyện</p>';
                    return;
                }

                const tableHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Tiêu đề</th>
                                <th>Người dùng</th>
                                <th>Số tin nhắn</th>
                                <th>Ngày tạo</th>
                                <th>Cập nhật cuối</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${conversations.map(conv => `
                                <tr>
                                    <td>${conv.title}</td>
                                    <td>${conv.username || 'N/A'}</td>
                                    <td>${conv.messageCount}</td>
                                    <td>${this.formatDate(conv.createdAt)}</td>
                                    <td>${this.formatDate(conv.updatedAt)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;

                container.innerHTML = tableHTML;
            } else {
                container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Lỗi tải dữ liệu cuộc trò chuyện</p>';
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Lỗi kết nối</p>';
        }
    }

    /**
     * TẢI DANH SÁCH TIN NHẮN
     */
    async loadMessages() {
        const container = document.getElementById('messagesContent');

        try {
            const response = await this.fetchWithAuth('/dashboard/messages');
            if (response.ok) {
                const data = await response.json();
                const messages = data.data || [];

                console.log('Messages API response:', data);
                console.log('Messages array length:', messages.length);

                if (messages.length === 0) {
                    container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Không có tin nhắn</p>';
                    return;
                }

                const tableHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nội dung</th>
                                <th>Vai trò</th>
                                <th>Người dùng</th>
                                <th>Độ tin cậy</th>
                                <th>Thời gian</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${messages.map(msg => `
                                <tr>
                                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${msg.content}</td>
                                    <td><span style="padding: 4px 8px; border-radius: 4px; background: ${msg.role === 'user' ? '#2196F3' : '#FF9800'}; color: white; font-size: 0.8rem;">${msg.role}</span></td>
                                    <td>${msg.username || 'N/A'}</td>
                                    <td>${msg.confidenceScore ? msg.confidenceScore + '%' : 'N/A'}</td>
                                    <td>${this.formatDate(msg.createdAt)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;

                container.innerHTML = tableHTML;
            } else {
                console.error('Messages API response not ok:', response.status, response.statusText);
                container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Lỗi tải dữ liệu tin nhắn: ' + response.status + '</p>';
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Lỗi kết nối: ' + error.message + '</p>';
        }
    }

    /**
     * FETCH VỚI AUTHENTICATION
     * Tự động xử lý lỗi 401 và làm mới token nếu cần
     */
    async fetchWithAuth(endpoint, options = {}) {
        try {
            const url = this.API_BASE + endpoint;
            const headers = {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            };

            const response = await fetch(url, {
                ...options,
                headers
            });

            // Xử lý lỗi authorization
            if (response.status === 401) {
                alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                this.logout();
                return null;
            }

            // Xử lý lỗi forbidden (không có quyền)
            if (response.status === 403) {
                alert('Bạn không có quyền thực hiện thao tác này.');
                return null;
            }

            return response;
        } catch (error) {
            console.error('Network error:', error);
            alert('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.');
            return null;
        }
    }

    /**
     * KIỂM TRA QUYỀN ADMIN
     * Hàm bảo vệ để đảm bảo chỉ admin mới truy cập được
     */
    static validateAdminAccess() {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            window.location.href = 'auth.html';
            return false;
        }

        try {
            const user = JSON.parse(userStr);
            if (!user || user.role !== 'admin') {
                alert('Không có quyền truy cập trang quản trị!');
                localStorage.clear();
                window.location.href = 'auth.html';
                return false;
            }
            return true;
        } catch (error) {
            console.error('User data validation error:', error);
            localStorage.clear();
            window.location.href = 'auth.html';
            return false;
        }
    }

    /**
     * ĐĂNG XUẤT
     */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'auth.html';
    }

    /**
     * CHUYỂN ĐỔI TRẠNG THÁI NGƯỜI DÙNG (KHÓA/MỞ KHÓA)
     */
    async toggleUserStatus(userId, currentStatus) {
        const newStatus = currentStatus === 'enable' ? 'disable' : 'enable';
        const actionText = newStatus === 'enable' ? 'mở khóa' : 'khóa';

        if (!confirm(`Bạn có chắc chắn muốn ${actionText} người dùng này?`)) {
            return;
        }

        try {
            const response = await this.fetchWithAuth(`/dashboard/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });

            if (response && response.ok) {
                alert(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} người dùng thành công!`);
                await this.loadUsers(); // Reload user list
            } else {
                const errorData = await response?.json();
                alert(`Lỗi ${actionText} người dùng: ${errorData?.message || 'Không xác định'}`);
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            alert(`Lỗi ${actionText} người dùng. Vui lòng thử lại.`);
        }
    }

    /**
     * PHÂN QUYỀN ADMIN CHO NGƯỜI DÙNG
     */
    async promoteUser(userId) {
        if (!confirm('Bạn có chắc chắn muốn phân quyền admin cho người dùng này?')) {
            return;
        }

        try {
            const response = await this.fetchWithAuth(`/dashboard/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: 'admin' })
            });

            if (response && response.ok) {
                alert('Phân quyền admin thành công!');
                await this.loadUsers(); // Reload user list
            } else {
                const errorData = await response?.json();
                alert(`Lỗi phân quyền: ${errorData?.message || 'Không xác định'}`);
            }
        } catch (error) {
            console.error('Error promoting user:', error);
            alert('Lỗi phân quyền admin. Vui lòng thử lại.');
        }
    }

    /**
     * XÓA NGƯỜI DÙNG (ADMIN ONLY)
     */
    async deleteUser(userId, username) {
        const confirmText = `Xóa người dùng "${username}"? Thao tác này không thể hoàn tác!`;
        if (!confirm(confirmText)) {
            return;
        }

        // Double confirmation for deletion
        const doubleConfirm = prompt('Nhập "XOA" để xác nhận xóa người dùng:', '');
        if (doubleConfirm !== 'XOA') {
            alert('Hủy thao tác xóa người dùng.');
            return;
        }

        try {
            const response = await this.fetchWithAuth(`/dashboard/users/${userId}`, {
                method: 'DELETE'
            });

            if (response && response.ok) {
                alert('Xóa người dùng thành công!');
                await this.loadUsers(); // Reload user list
            } else {
                const errorData = await response?.json();
                alert(`Lỗi xóa người dùng: ${errorData?.message || 'Không xác định'}`);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Lỗi xóa người dùng. Vui lòng thử lại.');
        }
    }

    /**
     * TẢI PROFILE ADMIN
     */
    async loadProfile() {
        try {
            // Điền thông tin từ localStorage
            document.getElementById('profileUsername').value = this.user.username || '';
            document.getElementById('profileEmail').value = this.user.email || '';
            document.getElementById('profileFullName').value = this.user.fullName || '';

            console.log('Profile loaded for admin:', this.user.username);
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    /**
     * CẬP NHẬT PROFILE
     */
    async updateProfile() {
        try {
            const email = document.getElementById('profileEmail').value.trim();
            const fullName = document.getElementById('profileFullName').value.trim();

            if (!email) {
                alert('Vui lòng nhập email!');
                return;
            }

            const response = await this.fetchWithAuth(`/auth/profile`, {
                method: 'PUT',
                body: JSON.stringify({
                    email: email,
                    fullName: fullName
                })
            });

            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Cập nhật localStorage
                    this.user.email = email;
                    this.user.fullName = fullName;
                    localStorage.setItem('user', JSON.stringify(this.user));

                    // Cập nhật hiển thị tên
                    document.getElementById('adminName').textContent = fullName || this.user.username;

                    alert('Cập nhật profile thành công!');
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
     * ĐỔI MẬT KHẨU
     */
    async changePassword() {
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validation
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

            const response = await this.fetchWithAuth(`/auth/change-password`, {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    alert('Đổi mật khẩu thành công!');
                    // Clear password fields
                    document.getElementById('currentPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmPassword').value = '';
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

    /**
     * FORMAT NGÀY THÁNG
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    }
}

// ===== GLOBAL FUNCTIONS =====
function logout() {
    adminDashboard.logout();
}

// ===== KIỂM TRA QUYỀN TRUY CẬP NGAY KHI TẢI TRANG =====
// Bảo vệ trang admin ngay từ đầu, không chờ DOM load
(function() {
    if (!AdminDashboard.validateAdminAccess()) {
        return; // Đã redirect trong validateAdminAccess
    }
})();

// ===== KHỞI TẠO ỨNG DỤNG =====
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra lại quyền truy cập trước khi khởi tạo dashboard
    if (AdminDashboard.validateAdminAccess()) {
        adminDashboard = new AdminDashboard();
    }
});