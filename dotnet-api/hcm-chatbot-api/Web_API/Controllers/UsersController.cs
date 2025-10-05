using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Data;
using Models.DTOs;
using Services.Interfaces;

namespace Web_API;

[Authorize]
public class UsersController : BaseController
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAllUsers()
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
                AvatarUrl = u.avatar_url,
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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var isAdmin = IsAdmin();

            if (id != currentUserId && !isAdmin)
                return ErrorResponse("Access denied", 403);

            var user = await _userService.GetUserByIdAsync(id);

            if (user == null)
                return ErrorResponse("User not found", 404);

            var userDto = new UserDto
            {
                Id = user.id,
                Username = user.username,
                Email = user.email,
                FullName = user.full_name,
                AvatarUrl = user.avatar_url,
                Role = user.role ?? "user",
                Status = user.status ?? "enable",
                TotalMessages = user.total_messages ?? 0,
                TotalConversations = user.total_conversations ?? 0,
                CreatedAt = user.created_at ?? DateTime.UtcNow
            };

            return SuccessResponse(userDto, "User retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve user: {ex.Message}", 500);
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var isAdmin = IsAdmin();

            if (id != currentUserId && !isAdmin)
                return ErrorResponse("Access denied", 403);

            var user = await _userService.GetUserByIdAsync(id);

            if (user == null)
                return ErrorResponse("User not found", 404);

            user.full_name = request.FullName;
            user.avatar_url = request.AvatarUrl;

            if (isAdmin && !string.IsNullOrEmpty(request.Role))
            {
                user.role = request.Role;
            }

            if (isAdmin && !string.IsNullOrEmpty(request.Status))
            {
                user.status = request.Status;
            }

            var updatedUser = await _userService.UpdateUserAsync(user);

            var userDto = new UserDto
            {
                Id = updatedUser.id,
                Username = updatedUser.username,
                Email = updatedUser.email,
                FullName = updatedUser.full_name,
                AvatarUrl = updatedUser.avatar_url,
                Role = updatedUser.role ?? "user",
                Status = updatedUser.status ?? "enable",
                TotalMessages = updatedUser.total_messages ?? 0,
                TotalConversations = updatedUser.total_conversations ?? 0,
                CreatedAt = updatedUser.created_at ?? DateTime.UtcNow
            };

            return SuccessResponse(userDto, "User updated successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to update user: {ex.Message}", 500);
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            if (id == currentUserId)
                return ErrorResponse("Cannot delete your own account", 400);

            var deleted = await _userService.DeleteUserAsync(id);

            if (!deleted)
                return ErrorResponse("User not found or failed to delete", 404);

            return SuccessResponse("User deleted successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to delete user: {ex.Message}", 500);
        }
    }

    [HttpPost("{id}/toggle-status")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ToggleUserStatus(Guid id)
    {
        try
        {
            var currentUserId = GetCurrentUserId();

            if (id == currentUserId)
                return ErrorResponse("Cannot change your own status", 400);

            var success = await _userService.ToggleUserStatusAsync(id);

            if (!success)
                return ErrorResponse("User not found or failed to update status", 404);

            var user = await _userService.GetUserByIdAsync(id);
            return SuccessResponse($"User status changed to {user?.status}", "User status updated successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to toggle user status: {ex.Message}", 500);
        }
    }

    [HttpGet("role/{role}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetUsersByRole(string role)
    {
        try
        {
            var users = await _userService.GetUsersByRoleAsync(role);

            var userDtos = users.Select(u => new UserDto
            {
                Id = u.id,
                Username = u.username,
                Email = u.email,
                FullName = u.full_name,
                AvatarUrl = u.avatar_url,
                Role = u.role ?? "user",
                Status = u.status ?? "enable",
                TotalMessages = u.total_messages ?? 0,
                TotalConversations = u.total_conversations ?? 0,
                CreatedAt = u.created_at ?? DateTime.UtcNow
            }).ToList();

            return SuccessResponse(userDtos, $"Users with role '{role}' retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve users by role: {ex.Message}", 500);
        }
    }
}

public class UpdateUserRequest
{
    public string? FullName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Role { get; set; }
    public string? Status { get; set; }
}