using Microsoft.AspNetCore.Mvc;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure pipeline
app.UseCors();
app.MapControllers();

// Root endpoint
app.MapGet("/", () => new { 
    message = "HCM Database Test API", 
    timestamp = DateTime.UtcNow 
});

// Health endpoint
app.MapGet("/health", () => new { 
    status = "healthy", 
    timestamp = DateTime.UtcNow 
});

// Database test endpoint
app.MapGet("/test-database", async (IConfiguration config) =>
{
    try
    {
        var connectionString = "Host=aws-1-ap-southeast-1.pooler.supabase.com;Database=postgres;Username=postgres.vdikmrnnvqomdacvyskb;Password=12345;Port=5432;SSL Mode=Require;Trust Server Certificate=true";
        
        using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        
        var command = new NpgsqlCommand("SELECT version();", connection);
        var version = await command.ExecuteScalarAsync();
        
        await connection.CloseAsync();

        return Results.Ok(new {
            status = "success",
            message = "Supabase connection successful! ✅",
            postgresVersion = version?.ToString(),
            connectionInfo = new {
                host = connection.Host,
                port = connection.Port,
                database = connection.Database
            },
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new {
            status = "error", 
            message = "Database connection failed ❌",
            error = ex.Message,
            timestamp = DateTime.UtcNow
        }, statusCode: 500);
    }
});

// List tables endpoint
app.MapGet("/list-tables", async () =>
{
    try
    {
        var connectionString = "Host=aws-1-ap-southeast-1.pooler.supabase.com;Database=postgres;Username=postgres.vdikmrnnvqomdacvyskb;Password=12345;Port=5432;SSL Mode=Require;Trust Server Certificate=true";
        
        using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        
        var command = new NpgsqlCommand(@"
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;", connection);
        
        var tables = new List<string>();
        using var reader = await command.ExecuteReaderAsync();
        
        while (await reader.ReadAsync())
        {
            tables.Add(reader.GetString(0));
        }
        
        await connection.CloseAsync();

        return Results.Ok(new {
            status = "success",
            message = $"Found {tables.Count} tables",
            tables = tables,
            timestamp = DateTime.UtcNow
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new {
            status = "error",
            message = "Failed to list tables",  
            error = ex.Message,
            timestamp = DateTime.UtcNow
        }, statusCode: 500);
    }
});

app.Run();
