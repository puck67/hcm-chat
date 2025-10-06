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

// Simple health endpoint
app.MapGet("/", () => "HCM Chatbot .NET API is running!");
app.MapGet("/health", () => new { status = "OK", timestamp = DateTime.UtcNow });

app.Run();
