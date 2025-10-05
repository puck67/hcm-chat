namespace Models.DTOs;

public class DashboardStatsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int NewUsersToday { get; set; }
    public int TotalConversations { get; set; }
    public int TotalMessages { get; set; }
    public int MessagesToday { get; set; }
    public int ConversationsToday { get; set; }
    public List<DailyStatDto> RecentStats { get; set; } = new();
}

public class DailyStatDto
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public int TotalUsers { get; set; }
    public int NewUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int TotalMessages { get; set; }
    public int TotalConversations { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UserStatsDto
{
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
    public int DisabledCount { get; set; }
    public int AdminCount { get; set; }
    public int NewToday { get; set; }
    public List<UserDto> RecentUsers { get; set; } = new();
}

public class ConversationStatsDto
{
    public int TotalCount { get; set; }
    public int TodayCount { get; set; }
    public int ThisWeekCount { get; set; }
    public int ThisMonthCount { get; set; }
    public List<ConversationSummaryDto> RecentConversations { get; set; } = new();
}

public class MessageStatsDto
{
    public int TotalCount { get; set; }
    public int TodayCount { get; set; }
    public int ThisWeekCount { get; set; }
    public int ThisMonthCount { get; set; }
    public double AveragePerConversation { get; set; }
}

/// <summary>
/// DTO for updating user status (enable/disable)
/// </summary>
public class UpdateUserStatusDto
{
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// DTO for updating user role (admin promotion)
/// </summary>
public class UpdateUserRoleDto
{
    public string Role { get; set; } = string.Empty;
}