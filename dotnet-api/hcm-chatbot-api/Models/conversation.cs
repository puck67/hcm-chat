using System;
using System.Collections.Generic;

namespace Data;

public partial class conversation
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public string title { get; set; } = null!;

    public int? message_count { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public virtual ICollection<message> messages { get; set; } = new List<message>();

    public virtual user user { get; set; } = null!;
}
