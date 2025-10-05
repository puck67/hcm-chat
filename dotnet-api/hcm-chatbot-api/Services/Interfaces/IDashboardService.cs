using Data;

namespace Services.Interfaces;

public class DashboardStats
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int NewUsersToday { get; set; }
    public int TotalConversations { get; set; }
    public int TotalMessages { get; set; }
    public int MessagesToday { get; set; }
    public int ConversationsToday { get; set; }
    public IEnumerable<daily_stat> RecentStats { get; set; } = new List<daily_stat>();
}

public interface IDashboardService
{
    Task<DashboardStats> GetDashboardStatsAsync();
    Task<IEnumerable<daily_stat>> GetStatsForDateRangeAsync(DateOnly fromDate, DateOnly toDate);
    Task UpdateDailyStatsAsync();
    Task<daily_stat?> GetStatsForDateAsync(DateOnly date);
}