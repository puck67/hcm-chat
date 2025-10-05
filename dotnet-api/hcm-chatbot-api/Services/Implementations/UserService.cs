using Microsoft.EntityFrameworkCore;
using Data;
using Repositories;
using Repositories.Interfaces;
using Services.Interfaces;

namespace Services.Implementations;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IGenericRepository<user> _userRepository;

    public UserService(IUnitOfWork unitOfWork, IGenericRepository<user> userRepository)
    {
        _unitOfWork = unitOfWork;
        _userRepository = userRepository;
    }

    public async Task<IEnumerable<user>> GetAllUsersAsync()
    {
        return await _userRepository.GetAllAsync();
    }

    public async Task<user?> GetUserByIdAsync(Guid id)
    {
        return await _userRepository.GetByIdAsync(id);
    }

    public async Task<user> CreateUserAsync(user user)
    {
        user.id = Guid.NewGuid();
        user.created_at = DateTime.UtcNow;
        user.updated_at = DateTime.UtcNow;
        user.total_messages ??= 0;
        user.total_conversations ??= 0;
        user.role ??= "user";
        user.status ??= "enable";

        var result = await _userRepository.AddAsync(user);
        await _unitOfWork.CompleteAsync();
        return result;
    }

    public async Task<user> UpdateUserAsync(user user)
    {
        user.updated_at = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);
        await _unitOfWork.CompleteAsync();
        return user;
    }

    public async Task<bool> DeleteUserAsync(Guid id)
    {
        var result = await _userRepository.DeleteAsync(id);
        if (result)
        {
            await _unitOfWork.CompleteAsync();
        }
        return result;
    }

    public async Task<bool> ToggleUserStatusAsync(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) return false;

        user.status = user.status == "enable" ? "disable" : "enable";
        user.updated_at = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<IEnumerable<user>> GetUsersByRoleAsync(string role)
    {
        var users = await _userRepository.GetAllAsync();
        return users.Where(u => u.role == role);
    }

    public async Task<int> GetTotalUsersCountAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return users.Count();
    }

    public async Task<int> GetActiveUsersCountAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return users.Count(u => u.status == "enable");
    }

    public async Task UpdateUserStatsAsync(Guid userId, int messageIncrement = 0, int conversationIncrement = 0)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return;

        user.total_messages = (user.total_messages ?? 0) + messageIncrement;
        user.total_conversations = (user.total_conversations ?? 0) + conversationIncrement;
        user.updated_at = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.CompleteAsync();
    }

    /// <summary>
    /// Cập nhật trạng thái người dùng (enable/disable)
    /// </summary>
    public async Task<bool> UpdateUserStatusAsync(Guid userId, string status)
    {
        if (status != "enable" && status != "disable")
        {
            throw new ArgumentException("Status must be 'enable' or 'disable'");
        }

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return false;

        user.status = status;
        user.updated_at = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    /// <summary>
    /// Cập nhật vai trò người dùng (user/admin)
    /// </summary>
    public async Task<bool> UpdateUserRoleAsync(Guid userId, string role)
    {
        if (role != "user" && role != "admin")
        {
            throw new ArgumentException("Role must be 'user' or 'admin'");
        }

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return false;

        user.role = role;
        user.updated_at = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }
}