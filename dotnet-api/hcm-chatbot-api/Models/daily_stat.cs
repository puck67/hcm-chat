using System;
using System.Collections.Generic;

namespace Data;

public partial class daily_stat
{
    public Guid id { get; set; }

    public DateOnly date { get; set; }

    public int? total_users { get; set; }

    public int? new_users { get; set; }

    public int? active_users { get; set; }

    public int? total_messages { get; set; }

    public int? total_conversations { get; set; }

    public DateTime? created_at { get; set; }
}
