// Import các thư viện cần thiết
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Data;
using Models.DTOs;
using Services.Interfaces;
using System.Text.Json;

namespace Web_API;

/// <summary>
/// ChatController - Controller chính xử lý tất cả các chức năng chat
/// Bao gồm: gửi tin nhắn, lấy cuộc trò chuyện, lấy tin nhắn, xóa cuộc trò chuyện
/// Tích hợp với Python AI backend để tạo response thông minh
/// </summary>
[Authorize] // Yêu cầu người dùng phải đăng nhập (có JWT token hợp lệ)
public class ChatController : BaseController
{
    // ===== DEPENDENCY INJECTION =====
    private readonly IConversationService _conversationService; // Service quản lý cuộc trò chuyện
    private readonly IMessageService _messageService; // Service quản lý tin nhắn
    private readonly IHttpClientFactory _httpClientFactory; // Factory tạo HTTP client để gọi AI
    private readonly IConfiguration _configuration; // Đọc cấu hình từ appsettings.json

    /// <summary>
    /// Constructor - Dependency Injection các service cần thiết
    /// </summary>
    public ChatController(
        IConversationService conversationService,
        IMessageService messageService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _conversationService = conversationService;
        _messageService = messageService;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    /// <summary>
    /// API gửi tin nhắn và nhận phản hồi từ AI
    /// Quy trình: 1) Lưu tin nhắn người dùng -> 2) Gọi Python AI -> 3) Lưu phản hồi AI -> 4) Trả về kết quả
    /// </summary>
    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
    {
        try
        {
            // Lấy ID người dùng hiện tại từ JWT token
            var userId = GetCurrentUserId();

            // ===== BƯỚC 1: XỬ LÝ CUỘC TRÒ CHUYỆN =====
            conversation? conv = null;
            if (request.ConversationId.HasValue)
            {
                // Nếu có ConversationId, lấy cuộc trò chuyện hiện tại
                conv = await _conversationService.GetByIdAsync(request.ConversationId.Value);
                // Kiểm tra quyền sở hữu cuộc trò chuyện
                if (conv == null || conv.user_id != userId)
                    return ErrorResponse("Conversation not found", 404);
            }
            else
            {
                // Nếu không có ConversationId, tạo cuộc trò chuyện mới
                conv = await _conversationService.CreateAsync(new CreateConversationRequest
                {
                    // Tạo title từ 50 ký tự đầu của tin nhắn
                    Title = request.Message.Length > 50 ? request.Message.Substring(0, 50) + "..." : request.Message
                }, userId);
            }

            // ===== BƯỚC 2: LƯU TIN NHẮN NGƯỜI DÙNG =====
            var userMessage = await _messageService.CreateAsync(new CreateMessageRequest
            {
                ConversationId = conv.id,
                Content = request.Message,
                Role = "user" // Đánh dấu đây là tin nhắn từ người dùng
            });

            // ===== BƯỚC 3: GỌI PYTHON AI SERVICE =====
            // Tạo HTTP client với timeout 2 phút
            var httpClient = _httpClientFactory.CreateClient("AiService");
            // Lấy URL của AI service từ cấu hình
            var aiApiUrl = _configuration["AiService:BaseUrl"] ?? "http://localhost:8000";

            // Tạo request cho AI service
            var aiRequest = new { question = request.Message };
            // Gọi AI service (có thể mất 15-30 giây)
            var aiResponse = await httpClient.PostAsJsonAsync($"{aiApiUrl}/chat", aiRequest);

            // Kiểm tra AI service có phản hồi thành công không
            if (!aiResponse.IsSuccessStatusCode)
                return ErrorResponse("AI service unavailable", 503);

            // Parse JSON response từ AI service
            var aiResult = await aiResponse.Content.ReadFromJsonAsync<AiResponseDto>();

            // ===== BƯỚC 4: LƯU PHẢN HỒI AI =====
            // Chuyển đổi sources từ object thành array string để lưu database
            var sources = aiResult?.Sources?.Select(s => s.Source).ToList();
            var assistantMessage = await _messageService.CreateAsync(new CreateMessageRequest
            {
                ConversationId = conv.id,
                Content = aiResult?.Answer ?? "Sorry, I couldn't generate a response.",
                Role = "assistant", // Đánh dấu đây là phản hồi từ AI
                Sources = sources, // Nguồn tham khảo từ AI
                ConfidenceScore = aiResult?.Confidence // Độ tin cậy của AI
            });

            // ===== BƯỚC 5: TRẢ VỀ KẾT QUẢ CHO FRONTEND =====
            var response = new ChatApiResponse
            {
                ConversationId = conv.id,
                // Thông tin tin nhắn người dùng
                UserMessage = new MessageDto
                {
                    Id = userMessage.id,
                    Content = userMessage.content,
                    Role = userMessage.role,
                    CreatedAt = userMessage.created_at ?? DateTime.UtcNow
                },
                // Thông tin phản hồi AI
                AssistantMessage = new MessageDto
                {
                    Id = assistantMessage.id,
                    Content = assistantMessage.content,
                    Role = assistantMessage.role,
                    Sources = assistantMessage.sources, // Nguồn tham khảo
                    ConfidenceScore = assistantMessage.confidence_score ?? 0, // Độ tin cậy
                    CreatedAt = assistantMessage.created_at ?? DateTime.UtcNow
                }
            };

            return SuccessResponse(response, "Message sent successfully");
        }
        catch (Exception ex)
        {
            // Log lỗi và trả về thông báo lỗi cho frontend
            return ErrorResponse($"Failed to send message: {ex.Message}", 500);
        }
    }

    /// <summary>
    /// API lấy danh sách tất cả cuộc trò chuyện của người dùng hiện tại
    /// Sử dụng cho sidebar hiển thị lịch sử chat
    /// </summary>
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        try
        {
            // Lấy ID người dùng từ JWT token
            var userId = GetCurrentUserId();

            // Lấy tất cả cuộc trò chuyện của user này
            var conversations = await _conversationService.GetByUserIdAsync(userId);

            // Chuyển đổi sang DTO để trả về frontend
            var conversationDtos = conversations.Select(c => new ConversationDto
            {
                Id = c.id,
                Title = c.title, // Tiêu đề cuộc trò chuyện
                MessageCount = c.message_count ?? 0, // Số lượng tin nhắn
                CreatedAt = c.created_at ?? DateTime.UtcNow,
                UpdatedAt = c.updated_at ?? DateTime.UtcNow // Thời gian cập nhật cuối
            }).ToList();

            return SuccessResponse(conversationDtos, "Conversations retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to get conversations: {ex.Message}", 500);
        }
    }

    /// <summary>
    /// API lấy tất cả tin nhắn trong một cuộc trò chuyện cụ thể
    /// Sử dụng khi người dùng click vào một cuộc trò chuyện trong sidebar
    /// </summary>
    [HttpGet("conversations/{conversationId}/messages")]
    public async Task<IActionResult> GetMessages(Guid conversationId)
    {
        try
        {
            var userId = GetCurrentUserId();

            // Kiểm tra quyền sở hữu cuộc trò chuyện
            var conversation = await _conversationService.GetByIdAsync(conversationId);
            if (conversation == null || conversation.user_id != userId)
                return ErrorResponse("Conversation not found", 404);

            // Lấy tất cả tin nhắn trong cuộc trò chuyện này
            var messages = await _messageService.GetByConversationIdAsync(conversationId);

            // Chuyển đổi sang DTO
            var messageDtos = messages.Select(m => new MessageDto
            {
                Id = m.id,
                Content = m.content, // Nội dung tin nhắn
                Role = m.role, // "user" hoặc "assistant"
                Sources = m.sources, // Nguồn tham khảo (chỉ có với AI response)
                ConfidenceScore = m.confidence_score, // Độ tin cậy (chỉ có với AI)
                CreatedAt = m.created_at ?? DateTime.UtcNow
            }).ToList();

            return SuccessResponse(messageDtos, "Messages retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to get messages: {ex.Message}", 500);
        }
    }

    /// <summary>
    /// API xóa một cuộc trò chuyện và tất cả tin nhắn bên trong
    /// Sử dụng khi người dùng click nút xóa trong sidebar
    /// </summary>
    [HttpDelete("conversations/{conversationId}")]
    public async Task<IActionResult> DeleteConversation(Guid conversationId)
    {
        try
        {
            var userId = GetCurrentUserId();

            // Kiểm tra quyền sở hữu trước khi xóa
            var conversation = await _conversationService.GetByIdAsync(conversationId);
            if (conversation == null || conversation.user_id != userId)
                return ErrorResponse("Conversation not found", 404);

            // Xóa cuộc trò chuyện (cascade delete sẽ tự động xóa messages)
            await _conversationService.DeleteAsync(conversationId);
            return SuccessResponse<object>(null, "Conversation deleted successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to delete conversation: {ex.Message}", 500);
        }
    }
}

// ===== DATA TRANSFER OBJECTS (DTOs) CHO CHAT =====

/// <summary>
/// DTO để nhận request gửi tin nhắn từ frontend
/// </summary>
public class SendMessageRequest
{
    public Guid? ConversationId { get; set; } // Null nếu tạo cuộc trò chuyện mới
    public string Message { get; set; } = string.Empty; // Nội dung tin nhắn từ user
}

/// <summary>
/// DTO để trả về response sau khi gửi tin nhắn thành công
/// Bao gồm cả tin nhắn người dùng và phản hồi AI
/// </summary>
public class ChatApiResponse
{
    public Guid ConversationId { get; set; } // ID cuộc trò chuyện
    public MessageDto UserMessage { get; set; } = null!; // Tin nhắn của người dùng
    public MessageDto AssistantMessage { get; set; } = null!; // Phản hồi của AI
}

/// <summary>
/// DTO để nhận response từ Python AI service
/// Cấu trúc này phải khớp với response format của Python backend
/// </summary>
public class AiResponseDto
{
    public string Answer { get; set; } = string.Empty; // Câu trả lời từ AI
    public List<SourceDto> Sources { get; set; } = new(); // Danh sách nguồn tham khảo
    public int Confidence { get; set; } // Độ tin cậy (0-100)
    public string? LastUpdated { get; set; } // Thời gian cập nhật knowledge base
}

/// <summary>
/// DTO cho từng nguồn tham khảo trong AI response
/// </summary>
public class SourceDto
{
    public string Source { get; set; } = string.Empty; // Tên nguồn (VD: "Toàn tập HCM, tập 1")
    public int Credibility { get; set; } // Độ tin cậy nguồn (0-100)
    public string Type { get; set; } = string.Empty; // Loại nguồn (official, academic, etc.)
    public string Url { get; set; } = string.Empty; // URL nguồn (nếu có)
    public string Document { get; set; } = string.Empty; // Tên tài liệu cụ thể
}