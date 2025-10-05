using System;
using System.Collections.Generic;

namespace Data;

public partial class user
{
    public Guid id { get; set; }

    public string username { get; set; } = null!;

    public string email { get; set; } = null!;

    public string password_hash { get; set; } = null!;

    public string? full_name { get; set; }

    public string? avatar_url { get; set; }

    public string? role { get; set; }

    public string? status { get; set; }

    public int? total_messages { get; set; }

    public int? total_conversations { get; set; }

    public DateTime? created_at { get; set; }

    public DateTime? updated_at { get; set; }

    public virtual ICollection<conversation> conversations { get; set; } = new List<conversation>();
}
