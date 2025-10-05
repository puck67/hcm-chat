using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Models.DTOs;
using Services.Interfaces;

namespace Web_API;

[Authorize(Roles = "admin")]
public class DashboardController : BaseController
{
    private readonly IDashboardService _dashboardService;
    private readonly IUserService _userService;
    private readonly IConversationService _conversationService;
    private readonly IMessageService _messageService;

    public DashboardController(
        IDashboardService dashboardService,
        IUserService userService,
        IConversationService conversationService,
        IMessageService messageService)
    {
        _dashboardService = dashboardService;
        _userService = userService;
        _conversationService = conversationService;
        _messageService = messageService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        try
        {
            // Lấy thống kê thực từ database
            var allUsers = await _userService.GetAllUsersAsync();
            var usersList = allUsers.ToList();

            var allConversations = await _conversationService.GetRecentConversationsAsync(int.MaxValue);
            var conversationsList = allConversations.ToList();

            var totalMessages = await _messageService.GetTotalMessagesCountAsync();
            var recentMessages = await _messageService.GetRecentMessagesAsync(int.MaxValue);
            var messagesList = recentMessages.ToList();

            var today = DateTime.Today;
            var todayUtc = DateTime.UtcNow.Date;

            var dashboardStats = new DashboardStatsDto
            {
                TotalUsers = usersList.Count,
                ActiveUsers = usersList.Count(u => u.status == "enable"),
                NewUsersToday = usersList.Count(u => u.created_at?.Date == today),
                TotalConversations = conversationsList.Count,
                TotalMessages = totalMessages,
                MessagesToday = messagesList.Count(m => m.created_at?.Date == today),
                ConversationsToday = conversationsList.Count(c => c.created_at?.Date == today),
                RecentStats = (await _dashboardService.GetStatsForDateRangeAsync(
                    DateOnly.FromDateTime(DateTime.Today.AddDays(-7)),
                    DateOnly.FromDateTime(DateTime.Today)
                )).Select(s => new DailyStatDto
                {
                    Id = s.id,
                    Date = s.date,
                    TotalUsers = s.total_users ?? 0,
                    NewUsers = s.new_users ?? 0,
                    ActiveUsers = s.active_users ?? 0,
                    TotalMessages = s.total_messages ?? 0,
                    TotalConversations = s.total_conversations ?? 0,
                    CreatedAt = s.created_at ?? DateTime.UtcNow
                }).ToList()
            };

            return SuccessResponse(dashboardStats, "Dashboard stats retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve dashboard stats: {ex.Message}", 500);
        }
    }

    [HttpGet("users/stats")]
    public async Task<IActionResult> GetUserStats()
    {
        try
        {
            var allUsers = await _userService.GetAllUsersAsync();
            var usersList = allUsers.ToList();

            var userStats = new UserStatsDto
            {
                TotalCount = usersList.Count,
                ActiveCount = usersList.Count(u => u.status == "enable"),
                DisabledCount = usersList.Count(u => u.status == "disable"),
                AdminCount = usersList.Count(u => u.role == "admin"),
                NewToday = usersList.Count(u => u.created_at?.Date == DateTime.Today),
                RecentUsers = usersList
                    .OrderByDescending(u => u.created_at)
                    .Take(10)
                    .Select(u => new UserDto
                    {
                        Id = u.id,
                        Username = u.username,
                        Email = u.email,
                        FullName = u.full_name,
                        Role = u.role ?? "user",
                        Status = u.status ?? "enable",
                        TotalMessages = u.total_messages ?? 0,
                        TotalConversations = u.total_conversations ?? 0,
                        CreatedAt = u.created_at ?? DateTime.UtcNow
                    }).ToList()
            };

            return SuccessResponse(userStats, "User stats retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve user stats: {ex.Message}", 500);
        }
    }

    [HttpGet("conversations/stats")]
    public async Task<IActionResult> GetConversationStats()
    {
        try
        {
            // Lấy tất cả conversations để tính thống kê chính xác
            var allConversations = await _conversationService.GetRecentConversationsAsync(int.MaxValue);
            var conversationsList = allConversations.ToList();

            var today = DateTime.Today;
            var thisWeek = DateTime.Today.AddDays(-7);
            var thisMonth = DateTime.Today.AddDays(-30);

            var conversationStats = new ConversationStatsDto
            {
                TotalCount = conversationsList.Count,
                TodayCount = conversationsList.Count(c => c.created_at?.Date == today),
                ThisWeekCount = conversationsList.Count(c => c.created_at >= thisWeek),
                ThisMonthCount = conversationsList.Count(c => c.created_at >= thisMonth),
                RecentConversations = conversationsList.OrderByDescending(c => c.created_at).Take(10).Select(c => new ConversationSummaryDto
                {
                    Id = c.id,
                    Title = c.title,
                    MessageCount = c.message_count ?? 0,
                    CreatedAt = c.created_at ?? DateTime.UtcNow,
                    UpdatedAt = c.updated_at ?? DateTime.UtcNow
                }).ToList()
            };

            return SuccessResponse(conversationStats, "Conversation stats retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve conversation stats: {ex.Message}", 500);
        }
    }

    [HttpGet("messages/stats")]
    public async Task<IActionResult> GetMessageStats()
    {
        try
        {
            var totalMessages = await _messageService.GetTotalMessagesCountAsync();
            var allMessages = await _messageService.GetRecentMessagesAsync(int.MaxValue);
            var messagesList = allMessages.ToList();

            var today = DateTime.Today;
            var thisWeek = DateTime.Today.AddDays(-7);
            var thisMonth = DateTime.Today.AddDays(-30);

            var allConversations = await _conversationService.GetRecentConversationsAsync(int.MaxValue);
            var conversationCount = allConversations.Count();

            var messageStats = new MessageStatsDto
            {
                TotalCount = totalMessages,
                TodayCount = messagesList.Count(m => m.created_at?.Date == today),
                ThisWeekCount = messagesList.Count(m => m.created_at >= thisWeek),
                ThisMonthCount = messagesList.Count(m => m.created_at >= thisMonth),
                AveragePerConversation = conversationCount > 0 ? (double)totalMessages / conversationCount : 0
            };

            return SuccessResponse(messageStats, "Message stats retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve message stats: {ex.Message}", 500);
        }
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            var users = await _userService.GetAllUsersAsync();
            var userDtos = users.Select(u => new UserDto
            {
                Id = u.id,
                Username = u.username,
                Email = u.email,
                FullName = u.full_name,
                Role = u.role ?? "user",
                Status = u.status ?? "enable",
                TotalMessages = u.total_messages ?? 0,
                TotalConversations = u.total_conversations ?? 0,
                CreatedAt = u.created_at ?? DateTime.UtcNow
            }).ToList();

            return SuccessResponse(userDtos, "Users retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve users: {ex.Message}", 500);
        }
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        try
        {
            var conversations = await _conversationService.GetRecentConversationsWithUsersAsync(50);
            var conversationDtos = conversations.Select(c => new ConversationDto
            {
                Id = c.id,
                Title = c.title,
                MessageCount = c.message_count ?? 0,
                CreatedAt = c.created_at ?? DateTime.UtcNow,
                UpdatedAt = c.updated_at ?? DateTime.UtcNow,
                Username = c.user?.username ?? "N/A"
            }).ToList();

            return SuccessResponse(conversationDtos, "Conversations retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve conversations: {ex.Message}", 500);
        }
    }

    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages()
    {
        try
        {
            var messages = await _messageService.GetRecentMessagesWithUsersAsync(50);
            var messageDtos = messages.Select(m => new MessageDto
            {
                Id = m.id,
                Content = m.content,
                Role = m.role,
                ConfidenceScore = m.confidence_score,
                CreatedAt = m.created_at ?? DateTime.UtcNow,
                Username = m.conversation?.user?.username ?? "N/A"
            }).ToList();

            return SuccessResponse(messageDtos, "Messages retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve messages: {ex.Message}", 500);
        }
    }

    [HttpPost("update-daily-stats")]
    public async Task<IActionResult> UpdateDailyStats()
    {
        try
        {
            await _dashboardService.UpdateDailyStatsAsync();
            return SuccessResponse("Daily stats updated successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to update daily stats: {ex.Message}", 500);
        }
    }

    [HttpGet("stats/date-range")]
    public async Task<IActionResult> GetStatsForDateRange([FromQuery] DateOnly fromDate, [FromQuery] DateOnly toDate)
    {
        try
        {
            var stats = await _dashboardService.GetStatsForDateRangeAsync(fromDate, toDate);

            var statsDto = stats.Select(s => new DailyStatDto
            {
                Id = s.id,
                Date = s.date,
                TotalUsers = s.total_users ?? 0,
                NewUsers = s.new_users ?? 0,
                ActiveUsers = s.active_users ?? 0,
                TotalMessages = s.total_messages ?? 0,
                TotalConversations = s.total_conversations ?? 0,
                CreatedAt = s.created_at ?? DateTime.UtcNow
            }).ToList();

            return SuccessResponse(statsDto, "Stats for date range retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve stats for date range: {ex.Message}", 500);
        }
    }

    /// <summary>
    /// QUẢN LÝ NGƯỜI DÙNG - Cập nhật trạng thái người dùng (khóa/mở khóa)
    /// </summary>
    [HttpPut("users/{userId}/status")]
    public async Task<IActionResult> UpdateUserStatus(Guid userId, [FromBody] UpdateUserStatusDto request)
    {
        try
        {
            // Kiểm tra user tồn tại
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
            {
                return ErrorResponse("Người dùng không tồn tại", 404);
            }

            // Không cho phép khóa admin
            if (user.role == "admin")
            {
                return ErrorResponse("Không thể khóa tài khoản admin", 403);
            }

            // Cập nhật trạng thái
            await _userService.UpdateUserStatusAsync(userId, request.Status);

            return SuccessResponse($"Đã cập nhật trạng thái người dùng thành {request.Status}");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Lỗi cập nhật trạng thái người dùng: {ex.Message}", 500);
        }
    }

    /// <summary>
    /// QUẢN LÝ NGƯỜI DÙNG - Cập nhật vai trò người dùng (phân quyền admin)
    /// </summary>
    [HttpPut("users/{userId}/role")]
    public async Task<IActionResult> UpdateUserRole(Guid userId, [FromBody] UpdateUserRoleDto request)
    {
        try
        {
            // Kiểm tra user tồn tại
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
            {
                return ErrorResponse("Người dùng không tồn tại", 404);
            }

            // Chỉ cho phép phân quyền admin
            if (request.Role != "admin")
            {
                return ErrorResponse("Chỉ được phép phân quyền admin", 400);
            }

            // Cập nhật vai trò
            await _userService.UpdateUserRoleAsync(userId, request.Role);

            return SuccessResponse($"Đã phân quyền {request.Role} cho người dùng {user.username}");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Lỗi phân quyền người dùng: {ex.Message}", 500);
        }
    }

    /// <summary>
    /// QUẢN LÝ NGƯỜI DÙNG - Xóa người dùng (cẩn thận sử dụng)
    /// </summary>
    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        try
        {
            // Kiểm tra user tồn tại
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null)
            {
                return ErrorResponse("Người dùng không tồn tại", 404);
            }

            // Không cho phép xóa admin
            if (user.role == "admin")
            {
                return ErrorResponse("Không thể xóa tài khoản admin", 403);
            }

            // Xóa người dùng (soft delete)
            await _userService.DeleteUserAsync(userId);

            return SuccessResponse($"Đã xóa người dùng {user.username}");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Lỗi xóa người dùng: {ex.Message}", 500);
        }
    }
}