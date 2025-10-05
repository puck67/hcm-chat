using Microsoft.EntityFrameworkCore;
using Data;
using Repositories;
using Repositories.Interfaces;
using Services.Interfaces;

namespace Services.Implementations;

public class DashboardService : IDashboardService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IGenericRepository<user> _userRepository;
    private readonly IGenericRepository<conversation> _conversationRepository;
    private readonly IGenericRepository<message> _messageRepository;
    private readonly IGenericRepository<daily_stat> _dailyStatRepository;

    public DashboardService(
        IUnitOfWork unitOfWork,
        IGenericRepository<user> userRepository,
        IGenericRepository<conversation> conversationRepository,
        IGenericRepository<message> messageRepository,
        IGenericRepository<daily_stat> dailyStatRepository)
    {
        _unitOfWork = unitOfWork;
        _userRepository = userRepository;
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _dailyStatRepository = dailyStatRepository;
    }

    public async Task<DashboardStats> GetDashboardStatsAsync()
    {
        var users = await _userRepository.GetAllAsync();
        var conversations = await _conversationRepository.GetAllAsync();
        var messages = await _messageRepository.GetAllAsync();
        var recentStats = await GetStatsForDateRangeAsync(DateOnly.FromDateTime(DateTime.Today.AddDays(-7)), DateOnly.FromDateTime(DateTime.Today));

        var today = DateOnly.FromDateTime(DateTime.Today);

        return new DashboardStats
        {
            TotalUsers = users.Count(),
            ActiveUsers = users.Count(u => u.status == "enable"),
            NewUsersToday = users.Count(u => u.created_at?.Date == DateTime.Today),
            TotalConversations = conversations.Count(),
            TotalMessages = messages.Count(),
            MessagesToday = messages.Count(m => m.created_at?.Date == DateTime.Today),
            ConversationsToday = conversations.Count(c => c.created_at?.Date == DateTime.Today),
            RecentStats = recentStats
        };
    }

    public async Task<IEnumerable<daily_stat>> GetStatsForDateRangeAsync(DateOnly fromDate, DateOnly toDate)
    {
        var stats = await _dailyStatRepository.GetAllAsync();
        return stats.Where(s => s.date >= fromDate && s.date <= toDate).OrderBy(s => s.date);
    }

    public async Task UpdateDailyStatsAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var existingStat = await GetStatsForDateAsync(today);

        var users = await _userRepository.GetAllAsync();
        var conversations = await _conversationRepository.GetAllAsync();
        var messages = await _messageRepository.GetAllAsync();

        var dailyStat = existingStat ?? new daily_stat
        {
            id = Guid.NewGuid(),
            date = today,
            created_at = DateTime.UtcNow
        };

        dailyStat.total_users = users.Count();
        dailyStat.active_users = users.Count(u => u.status == "enable");
        dailyStat.new_users = users.Count(u => u.created_at?.Date == DateTime.Today);
        dailyStat.total_conversations = conversations.Count();
        dailyStat.total_messages = messages.Count();

        if (existingStat == null)
        {
            await _dailyStatRepository.AddAsync(dailyStat);
        }
        else
        {
            await _dailyStatRepository.UpdateAsync(dailyStat);
        }

        await _unitOfWork.CompleteAsync();
    }

    public async Task<daily_stat?> GetStatsForDateAsync(DateOnly date)
    {
        var stats = await _dailyStatRepository.GetAllAsync();
        return stats.FirstOrDefault(s => s.date == date);
    }
}