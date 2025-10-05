using Data;
using Models.DTOs;

namespace Services.Interfaces;

public interface IMessageService
{
    Task<IEnumerable<message>> GetConversationMessagesAsync(Guid conversationId);
    Task<IEnumerable<message>> GetByConversationIdAsync(Guid conversationId);
    Task<message?> GetMessageByIdAsync(Guid id);
    Task<message> CreateMessageAsync(message message);
    Task<message> CreateAsync(CreateMessageRequest request);
    Task<message> UpdateMessageAsync(message message);
    Task<bool> DeleteMessageAsync(Guid id);
    Task<IEnumerable<message>> GetRecentMessagesAsync(int count = 50);
    Task<IEnumerable<message>> GetRecentMessagesWithUsersAsync(int count = 50);
    Task<int> GetTotalMessagesCountAsync();
}