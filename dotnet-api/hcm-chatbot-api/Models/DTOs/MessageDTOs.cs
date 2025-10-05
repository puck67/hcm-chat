using System.ComponentModel.DataAnnotations;

namespace Models.DTOs;

public class CreateMessageRequest
{
    [Required]
    public Guid ConversationId { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty; // "user" or "assistant"

    public List<string>? Sources { get; set; }

    public int? ConfidenceScore { get; set; }
}

public class UpdateMessageRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;

    public string? Sources { get; set; }

    public int? ConfidenceScore { get; set; }
}

public class MessageDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public object? Sources { get; set; } // Can be List<string> or JSONB
    public int? ConfidenceScore { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Username { get; set; } = string.Empty;
}

public class ChatRequest
{
    [Required]
    public Guid ConversationId { get; set; }

    [Required]
    public string Message { get; set; } = string.Empty;
}

public class ChatResponse
{
    public MessageDto UserMessage { get; set; } = new();
    public MessageDto BotMessage { get; set; } = new();
}