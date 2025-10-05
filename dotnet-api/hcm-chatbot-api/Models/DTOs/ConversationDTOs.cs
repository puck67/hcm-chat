using System.ComponentModel.DataAnnotations;

namespace Models.DTOs;

public class CreateConversationRequest
{
    [Required]
    [StringLength(255, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public Guid UserId { get; set; }
}

public class UpdateConversationRequest
{
    [Required]
    [StringLength(255, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;
}

public class ConversationDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int MessageCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string Username { get; set; } = string.Empty;
    public UserDto? User { get; set; }
    public List<MessageDto> Messages { get; set; } = new();
}

public class ConversationSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int MessageCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}