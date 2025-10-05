using Data;

namespace Services.Interfaces;

public interface IUserService
{
    Task<IEnumerable<user>> GetAllUsersAsync();
    Task<user?> GetUserByIdAsync(Guid id);
    Task<user> CreateUserAsync(user user);
    Task<user> UpdateUserAsync(user user);
    Task<bool> DeleteUserAsync(Guid id);
    Task<bool> ToggleUserStatusAsync(Guid id);
    Task<IEnumerable<user>> GetUsersByRoleAsync(string role);
    Task<int> GetTotalUsersCountAsync();
    Task<int> GetActiveUsersCountAsync();
    Task UpdateUserStatsAsync(Guid userId, int messageIncrement = 0, int conversationIncrement = 0);

    // User management methods for admin dashboard
    Task<bool> UpdateUserStatusAsync(Guid userId, string status);
    Task<bool> UpdateUserRoleAsync(Guid userId, string role);
}