using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<conversation> conversations { get; set; }

    public virtual DbSet<daily_stat> daily_stats { get; set; }

    public virtual DbSet<message> messages { get; set; }

    public virtual DbSet<user> users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("pgcrypto");

        modelBuilder.Entity<conversation>(entity =>
        {
            entity.HasKey(e => e.id).HasName("conversations_pkey");

            entity
                .HasAnnotation("Npgsql:StorageParameter:autovacuum_vacuum_scale_factor", "0.1")
                .HasAnnotation("Npgsql:StorageParameter:fillfactor", "90");

            entity.HasIndex(e => e.created_at, "idx_conversations_created_at");

            entity.HasIndex(e => new { e.user_id, e.created_at }, "idx_conversations_user_created").IsDescending(false, true);

            entity.HasIndex(e => e.user_id, "idx_conversations_user_id");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.message_count).HasDefaultValue(0);
            entity.Property(e => e.title).HasMaxLength(255);
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.user).WithMany(p => p.conversations)
                .HasForeignKey(d => d.user_id)
                .HasConstraintName("fk_conversations_user_id");
        });

        modelBuilder.Entity<daily_stat>(entity =>
        {
            entity.HasKey(e => e.id).HasName("daily_stats_pkey");

            entity.HasAnnotation("Npgsql:StorageParameter:fillfactor", "100");

            entity.HasIndex(e => e.date, "daily_stats_date_key").IsUnique();

            entity.HasIndex(e => e.created_at, "idx_daily_stats_created_at").IsDescending();

            entity.HasIndex(e => e.date, "idx_daily_stats_date").IsUnique();

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.active_users).HasDefaultValue(0);
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.new_users).HasDefaultValue(0);
            entity.Property(e => e.total_conversations).HasDefaultValue(0);
            entity.Property(e => e.total_messages).HasDefaultValue(0);
            entity.Property(e => e.total_users).HasDefaultValue(0);
        });

        modelBuilder.Entity<message>(entity =>
        {
            entity.HasKey(e => e.id).HasName("messages_pkey");

            entity.HasAnnotation("Npgsql:StorageParameter:autovacuum_vacuum_scale_factor", "0.05");

            entity.HasIndex(e => new { e.conversation_id, e.created_at }, "idx_messages_conversation_created").IsDescending(false, true);

            entity.HasIndex(e => e.conversation_id, "idx_messages_conversation_id");

            entity.HasIndex(e => e.created_at, "idx_messages_created_at");

            entity.HasIndex(e => e.role, "idx_messages_role");

            entity.HasIndex(e => e.sources, "idx_messages_sources")
                .HasFilter("(sources IS NOT NULL)")
                .HasMethod("gin");

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.role).HasMaxLength(20);
            entity.Property(e => e.sources).HasColumnType("jsonb");

            entity.HasOne(d => d.conversation).WithMany(p => p.messages)
                .HasForeignKey(d => d.conversation_id)
                .HasConstraintName("fk_messages_conversation_id");
        });

        modelBuilder.Entity<user>(entity =>
        {
            entity.HasKey(e => e.id).HasName("users_pkey");

            entity
                .HasAnnotation("Npgsql:StorageParameter:autovacuum_vacuum_scale_factor", "0.1")
                .HasAnnotation("Npgsql:StorageParameter:fillfactor", "90");

            entity.HasIndex(e => e.created_at, "idx_users_created_at");

            entity.HasIndex(e => e.email, "idx_users_email").IsUnique();

            entity.HasIndex(e => e.role, "idx_users_role").HasFilter("((role)::text = 'admin'::text)");

            entity.HasIndex(e => e.status, "idx_users_status").HasFilter("((status)::text = 'disable'::text)");

            entity.HasIndex(e => e.username, "idx_users_username").IsUnique();

            entity.HasIndex(e => e.email, "users_email_key").IsUnique();

            entity.HasIndex(e => e.username, "users_username_key").IsUnique();

            entity.Property(e => e.id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.email).HasMaxLength(255);
            entity.Property(e => e.full_name).HasMaxLength(255);
            entity.Property(e => e.password_hash).HasMaxLength(255);
            entity.Property(e => e.role)
                .HasMaxLength(20)
                .HasDefaultValueSql("'user'::character varying");
            entity.Property(e => e.status)
                .HasMaxLength(20)
                .HasDefaultValueSql("'enable'::character varying");
            entity.Property(e => e.total_conversations).HasDefaultValue(0);
            entity.Property(e => e.total_messages).HasDefaultValue(0);
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.username).HasMaxLength(50);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
