using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Data;
using Models.DTOs;
using Services.Interfaces;

namespace Web_API;

[Authorize]
public class ConversationsController : BaseController
{
    private readonly IConversationService _conversationService;
    private readonly IUserService _userService;

    public ConversationsController(IConversationService conversationService, IUserService userService)
    {
        _conversationService = conversationService;
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUserConversations()
    {
        try
        {
            var userId = GetCurrentUserId();
            var conversations = await _conversationService.GetUserConversationsAsync(userId);

            var conversationDtos = conversations.Select(c => new ConversationSummaryDto
            {
                Id = c.id,
                Title = c.title,
                MessageCount = c.message_count ?? 0,
                CreatedAt = c.created_at ?? DateTime.UtcNow,
                UpdatedAt = c.updated_at ?? DateTime.UtcNow
            }).ToList();

            return SuccessResponse(conversationDtos, "Conversations retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve conversations: {ex.Message}", 500);
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetConversation(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var conversation = await _conversationService.GetConversationByIdAsync(id);

            if (conversation == null)
                return ErrorResponse("Conversation not found", 404);

            if (conversation.user_id != userId && !IsAdmin())
                return ErrorResponse("Access denied", 403);

            var conversationDto = new ConversationDto
            {
                Id = conversation.id,
                UserId = conversation.user_id,
                Title = conversation.title,
                MessageCount = conversation.message_count ?? 0,
                CreatedAt = conversation.created_at ?? DateTime.UtcNow,
                UpdatedAt = conversation.updated_at ?? DateTime.UtcNow
            };

            return SuccessResponse(conversationDto, "Conversation retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve conversation: {ex.Message}", 500);
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();

            if (request.UserId != userId && !IsAdmin())
                return ErrorResponse("Cannot create conversation for another user", 403);

            var conversation = new conversation
            {
                user_id = request.UserId,
                title = request.Title
            };

            var createdConversation = await _conversationService.CreateConversationAsync(conversation);

            await _userService.UpdateUserStatsAsync(request.UserId, 0, 1);

            var conversationDto = new ConversationDto
            {
                Id = createdConversation.id,
                UserId = createdConversation.user_id,
                Title = createdConversation.title,
                MessageCount = createdConversation.message_count ?? 0,
                CreatedAt = createdConversation.created_at ?? DateTime.UtcNow,
                UpdatedAt = createdConversation.updated_at ?? DateTime.UtcNow
            };

            return SuccessResponse(conversationDto, "Conversation created successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to create conversation: {ex.Message}", 500);
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateConversation(Guid id, [FromBody] UpdateConversationRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var conversation = await _conversationService.GetConversationByIdAsync(id);

            if (conversation == null)
                return ErrorResponse("Conversation not found", 404);

            if (conversation.user_id != userId && !IsAdmin())
                return ErrorResponse("Access denied", 403);

            conversation.title = request.Title;

            var updatedConversation = await _conversationService.UpdateConversationAsync(conversation);

            var conversationDto = new ConversationDto
            {
                Id = updatedConversation.id,
                UserId = updatedConversation.user_id,
                Title = updatedConversation.title,
                MessageCount = updatedConversation.message_count ?? 0,
                CreatedAt = updatedConversation.created_at ?? DateTime.UtcNow,
                UpdatedAt = updatedConversation.updated_at ?? DateTime.UtcNow
            };

            return SuccessResponse(conversationDto, "Conversation updated successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to update conversation: {ex.Message}", 500);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteConversation(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var conversation = await _conversationService.GetConversationByIdAsync(id);

            if (conversation == null)
                return ErrorResponse("Conversation not found", 404);

            if (conversation.user_id != userId && !IsAdmin())
                return ErrorResponse("Access denied", 403);

            var deleted = await _conversationService.DeleteConversationAsync(id);

            if (!deleted)
                return ErrorResponse("Failed to delete conversation", 500);

            await _userService.UpdateUserStatsAsync(conversation.user_id, 0, -1);

            return SuccessResponse("Conversation deleted successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to delete conversation: {ex.Message}", 500);
        }
    }
}