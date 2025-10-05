using Data;
using Models.DTOs;

namespace Services.Interfaces;

public interface IConversationService
{
    Task<IEnumerable<conversation>> GetUserConversationsAsync(Guid userId);
    Task<IEnumerable<conversation>> GetByUserIdAsync(Guid userId);
    Task<conversation?> GetConversationByIdAsync(Guid id);
    Task<conversation?> GetByIdAsync(Guid id);
    Task<conversation> CreateConversationAsync(conversation conversation);
    Task<conversation> CreateAsync(CreateConversationRequest request, Guid userId);
    Task<conversation> UpdateConversationAsync(conversation conversation);
    Task<bool> DeleteConversationAsync(Guid id);
    Task<bool> DeleteAsync(Guid id);
    Task<IEnumerable<conversation>> GetRecentConversationsAsync(int count = 10);
    Task<IEnumerable<conversation>> GetRecentConversationsWithUsersAsync(int count = 10);
    Task UpdateConversationMessageCountAsync(Guid conversationId);
}