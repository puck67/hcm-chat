using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using Data;
using Models.DTOs;
using Services.Interfaces;

namespace Web_API;

[Authorize]
public class MessagesController : BaseController
{
    private readonly IMessageService _messageService;
    private readonly IConversationService _conversationService;
    private readonly IUserService _userService;

    public MessagesController(
        IMessageService messageService,
        IConversationService conversationService,
        IUserService userService)
    {
        _messageService = messageService;
        _conversationService = conversationService;
        _userService = userService;
    }

    [HttpGet("conversation/{conversationId}")]
    public async Task<IActionResult> GetConversationMessages(Guid conversationId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var conversation = await _conversationService.GetConversationByIdAsync(conversationId);

            if (conversation == null)
                return ErrorResponse("Conversation not found", 404);

            if (conversation.user_id != userId && !IsAdmin())
                return ErrorResponse("Access denied", 403);

            var messages = await _messageService.GetConversationMessagesAsync(conversationId);

            var messageDtos = messages.Select(m => new MessageDto
            {
                Id = m.id,
                ConversationId = m.conversation_id,
                Content = m.content,
                Role = m.role,
                Sources = m.sources,
                ConfidenceScore = m.confidence_score,
                CreatedAt = m.created_at ?? DateTime.UtcNow
            }).ToList();

            return SuccessResponse(messageDtos, "Messages retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve messages: {ex.Message}", 500);
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetMessage(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var message = await _messageService.GetMessageByIdAsync(id);

            if (message == null)
                return ErrorResponse("Message not found", 404);

            var conversation = await _conversationService.GetConversationByIdAsync(message.conversation_id);
            if (conversation == null || (conversation.user_id != userId && !IsAdmin()))
                return ErrorResponse("Access denied", 403);

            var messageDto = new MessageDto
            {
                Id = message.id,
                ConversationId = message.conversation_id,
                Content = message.content,
                Role = message.role,
                Sources = message.sources,
                ConfidenceScore = message.confidence_score,
                CreatedAt = message.created_at ?? DateTime.UtcNow
            };

            return SuccessResponse(messageDto, "Message retrieved successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to retrieve message: {ex.Message}", 500);
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateMessage([FromBody] CreateMessageRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var conversation = await _conversationService.GetConversationByIdAsync(request.ConversationId);

            if (conversation == null)
                return ErrorResponse("Conversation not found", 404);

            if (conversation.user_id != userId && !IsAdmin())
                return ErrorResponse("Access denied", 403);

            var message = new message
            {
                conversation_id = request.ConversationId,
                content = request.Content,
                role = request.Role,
                sources = request.Sources != null ? JsonSerializer.Serialize(request.Sources) : null,
                confidence_score = request.ConfidenceScore
            };

            var createdMessage = await _messageService.CreateMessageAsync(message);

            await _conversationService.UpdateConversationMessageCountAsync(request.ConversationId);

            if (request.Role == "user")
            {
                await _userService.UpdateUserStatsAsync(conversation.user_id, 1, 0);
            }

            var messageDto = new MessageDto
            {
                Id = createdMessage.id,
                ConversationId = createdMessage.conversation_id,
                Content = createdMessage.content,
                Role = createdMessage.role,
                Sources = createdMessage.sources,
                ConfidenceScore = createdMessage.confidence_score,
                CreatedAt = createdMessage.created_at ?? DateTime.UtcNow
            };

            return SuccessResponse(messageDto, "Message created successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to create message: {ex.Message}", 500);
        }
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var conversation = await _conversationService.GetConversationByIdAsync(request.ConversationId);

            if (conversation == null)
                return ErrorResponse("Conversation not found", 404);

            if (conversation.user_id != userId)
                return ErrorResponse("Access denied", 403);

            var userMessage = new message
            {
                conversation_id = request.ConversationId,
                content = request.Message,
                role = "user"
            };

            var createdUserMessage = await _messageService.CreateMessageAsync(userMessage);

            var botResponseContent = await GenerateBotResponse(request.Message);

            var botMessage = new message
            {
                conversation_id = request.ConversationId,
                content = botResponseContent,
                role = "assistant",
                confidence_score = 95
            };

            var createdBotMessage = await _messageService.CreateMessageAsync(botMessage);

            await _conversationService.UpdateConversationMessageCountAsync(request.ConversationId);
            await _userService.UpdateUserStatsAsync(userId, 1, 0);

            var response = new ChatResponse
            {
                UserMessage = new MessageDto
                {
                    Id = createdUserMessage.id,
                    ConversationId = createdUserMessage.conversation_id,
                    Content = createdUserMessage.content,
                    Role = createdUserMessage.role,
                    CreatedAt = createdUserMessage.created_at ?? DateTime.UtcNow
                },
                BotMessage = new MessageDto
                {
                    Id = createdBotMessage.id,
                    ConversationId = createdBotMessage.conversation_id,
                    Content = createdBotMessage.content,
                    Role = createdBotMessage.role,
                    ConfidenceScore = createdBotMessage.confidence_score,
                    CreatedAt = createdBotMessage.created_at ?? DateTime.UtcNow
                }
            };

            return SuccessResponse(response, "Chat completed successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Chat failed: {ex.Message}", 500);
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMessage(Guid id, [FromBody] UpdateMessageRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var message = await _messageService.GetMessageByIdAsync(id);

            if (message == null)
                return ErrorResponse("Message not found", 404);

            var conversation = await _conversationService.GetConversationByIdAsync(message.conversation_id);
            if (conversation == null || (conversation.user_id != userId && !IsAdmin()))
                return ErrorResponse("Access denied", 403);

            message.content = request.Content;
            message.sources = request.Sources;
            message.confidence_score = request.ConfidenceScore;

            var updatedMessage = await _messageService.UpdateMessageAsync(message);

            var messageDto = new MessageDto
            {
                Id = updatedMessage.id,
                ConversationId = updatedMessage.conversation_id,
                Content = updatedMessage.content,
                Role = updatedMessage.role,
                Sources = updatedMessage.sources,
                ConfidenceScore = updatedMessage.confidence_score,
                CreatedAt = updatedMessage.created_at ?? DateTime.UtcNow
            };

            return SuccessResponse(messageDto, "Message updated successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to update message: {ex.Message}", 500);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMessage(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var message = await _messageService.GetMessageByIdAsync(id);

            if (message == null)
                return ErrorResponse("Message not found", 404);

            var conversation = await _conversationService.GetConversationByIdAsync(message.conversation_id);
            if (conversation == null || (conversation.user_id != userId && !IsAdmin()))
                return ErrorResponse("Access denied", 403);

            var deleted = await _messageService.DeleteMessageAsync(id);

            if (!deleted)
                return ErrorResponse("Failed to delete message", 500);

            return SuccessResponse("Message deleted successfully");
        }
        catch (Exception ex)
        {
            return ErrorResponse($"Failed to delete message: {ex.Message}", 500);
        }
    }

    private async Task<string> GenerateBotResponse(string userMessage)
    {
        await Task.Delay(100);

        var responses = new[]
        {
            "Cảm ơn bạn đã quan tâm đến tư tưởng Hồ Chí Minh. Đây là một chủ đề rất quan trọng và ý nghĩa.",
            "Tư tưởng Hồ Chí Minh là kim chỉ nam cho sự phát triển của đất nước. Bạn có câu hỏi cụ thể nào không?",
            "Chủ tịch Hồ Chí Minh đã để lại cho chúng ta một di sản tư tưởng vô cùng phong phú. Hãy cùng tìm hiểu nhé!",
            "Đó là một câu hỏi rất hay về tư tưởng Hồ Chí Minh. Tôi sẽ cố gắng giải đáp một cách chi tiết.",
            "Tư tưởng Hồ Chí Minh về độc lập dân tộc và chủ nghĩa xã hội có ý nghĩa rất lớn đối với Việt Nam."
        };

        return responses[new Random().Next(responses.Length)];
    }
}