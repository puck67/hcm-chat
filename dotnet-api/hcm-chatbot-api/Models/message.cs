using System;
using System.Collections.Generic;

namespace Data;

public partial class message
{
    public Guid id { get; set; }

    public Guid conversation_id { get; set; }

    public string content { get; set; } = null!;

    public string role { get; set; } = null!;

    public string? sources { get; set; }

    public int? confidence_score { get; set; }

    public DateTime? created_at { get; set; }

    public virtual conversation conversation { get; set; } = null!;
}
