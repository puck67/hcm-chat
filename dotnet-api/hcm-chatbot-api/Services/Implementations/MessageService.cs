using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Data;
using Models.DTOs;
using Repositories;
using Repositories.Interfaces;
using Services.Interfaces;

namespace Services.Implementations;

public class MessageService : IMessageService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IGenericRepository<message> _messageRepository;

    public MessageService(IUnitOfWork unitOfWork, IGenericRepository<message> messageRepository)
    {
        _unitOfWork = unitOfWork;
        _messageRepository = messageRepository;
    }

    public async Task<IEnumerable<message>> GetConversationMessagesAsync(Guid conversationId)
    {
        var messages = await _messageRepository.GetAllAsync();
        return messages.Where(m => m.conversation_id == conversationId).OrderBy(m => m.created_at);
    }

    public async Task<message?> GetMessageByIdAsync(Guid id)
    {
        return await _messageRepository.GetByIdAsync(id);
    }

    public async Task<message> CreateMessageAsync(message message)
    {
        message.id = Guid.NewGuid();
        message.created_at = DateTime.UtcNow;

        var result = await _messageRepository.AddAsync(message);
        await _unitOfWork.CompleteAsync();
        return result;
    }

    public async Task<message> UpdateMessageAsync(message message)
    {
        await _messageRepository.UpdateAsync(message);
        await _unitOfWork.CompleteAsync();
        return message;
    }

    public async Task<bool> DeleteMessageAsync(Guid id)
    {
        var result = await _messageRepository.DeleteAsync(id);
        if (result)
        {
            await _unitOfWork.CompleteAsync();
        }
        return result;
    }

    public async Task<IEnumerable<message>> GetRecentMessagesAsync(int count = 50)
    {
        var messages = await _messageRepository.GetAllAsync();
        return messages.OrderByDescending(m => m.created_at).Take(count);
    }

    public async Task<int> GetTotalMessagesCountAsync()
    {
        var messages = await _messageRepository.GetAllAsync();
        return messages.Count();
    }

    // Additional methods for ChatController compatibility
    public async Task<IEnumerable<message>> GetByConversationIdAsync(Guid conversationId)
    {
        return await GetConversationMessagesAsync(conversationId);
    }

    public async Task<message> CreateAsync(CreateMessageRequest request)
    {
        var message = new message
        {
            id = Guid.NewGuid(),
            conversation_id = request.ConversationId,
            content = request.Content,
            role = request.Role,
            sources = request.Sources != null ? JsonSerializer.Serialize(request.Sources) : null,
            confidence_score = request.ConfidenceScore,
            created_at = DateTime.UtcNow
        };

        return await CreateMessageAsync(message);
    }

    public async Task<IEnumerable<message>> GetRecentMessagesWithUsersAsync(int count = 50)
    {
        var dbContext = _messageRepository.GetDbContext();

        var messages = await dbContext.messages
            .Include(m => m.conversation)
            .ThenInclude(c => c.user)
            .OrderByDescending(m => m.created_at)
            .Take(count)
            .ToListAsync();

        return messages;
    }
}