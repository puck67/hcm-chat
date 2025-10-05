// Import các thư viện cần thiết cho .NET Web API
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Data;
using Repositories;
using Repositories.Interfaces;
using Repositories.Implementations;
using Services.Interfaces;
using Services.Implementations;

// Tạo builder để cấu hình ứng dụng web
var builder = WebApplication.CreateBuilder(args);

// ===== CẤU HÌNH CÁC DỊCH VỤ CHO API =====

// Thêm controller và API documentation
builder.Services.AddControllers(); // Thêm hỗ trợ cho các Controller
builder.Services.AddEndpointsApiExplorer(); // Cho phép API Explorer khám phá endpoints

// Cấu hình Swagger UI để test API
builder.Services.AddSwaggerGen(c =>
{
    // Thông tin cơ bản về API
    c.SwaggerDoc("v1", new() { Title = "HCM Chatbot Web_API API", Version = "v1" });

    // Cấu hình xác thực JWT trong Swagger
    c.AddSecurityDefinition("Bearer", new()
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    // Yêu cầu JWT token cho tất cả endpoints trong Swagger
    c.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ===== CẤU HÌNH DATABASE =====
// Kết nối với PostgreSQL database sử dụng Entity Framework Core
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ===== CẤU HÌNH XÁC THỰC JWT =====
// Lấy thông tin cấu hình JWT từ appsettings.json
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"];

// Cấu hình xác thực JWT Bearer token
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true, // Xác thực chữ ký token
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secretKey!)), // Khóa bí mật
            ValidateIssuer = true, // Xác thực nhà phát hành token
            ValidIssuer = jwtSettings["Issuer"], // Nhà phát hành hợp lệ
            ValidateAudience = true, // Xác thực đối tượng sử dụng token
            ValidAudience = jwtSettings["Audience"], // Đối tượng hợp lệ
            ValidateLifetime = true, // Xác thực thời gian hết hạn
            ClockSkew = TimeSpan.Zero // Không cho phép sai lệch thời gian
        };
    });

// Thêm hỗ trợ ủy quyền (authorization)
builder.Services.AddAuthorization();

// ===== CẤU HÌNH CORS (Cross-Origin Resource Sharing) =====
// Cho phép frontend gọi API từ domain khác
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        // Lấy danh sách các domain được phép từ appsettings.json
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        policy.WithOrigins(allowedOrigins) // Chỉ cho phép các origin này
              .AllowAnyMethod() // Cho phép tất cả HTTP methods (GET, POST, PUT, DELETE...)
              .AllowAnyHeader() // Cho phép tất cả headers
              .AllowCredentials(); // Cho phép gửi cookies và credentials
    });
});

// ===== DEPENDENCY INJECTION =====
// Đăng ký các repository và service để sử dụng trong toàn bộ ứng dụng

// Repository pattern và Unit of Work pattern
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>(); // Quản lý transaction database
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>)); // Repository generic

// Business logic services
builder.Services.AddScoped<IAuthService, AuthService>(); // Xử lý xác thực và đăng ký
builder.Services.AddScoped<IUserService, UserService>(); // Quản lý người dùng
builder.Services.AddScoped<IConversationService, ConversationService>(); // Quản lý cuộc trò chuyện
builder.Services.AddScoped<IMessageService, MessageService>(); // Quản lý tin nhắn
builder.Services.AddScoped<IDashboardService, DashboardService>(); // Thống kê dashboard

// ===== CẤU HÌNH HTTP CLIENT CHO AI SERVICE =====
// HttpClient để gọi Python AI backend với timeout 2 phút
builder.Services.AddHttpClient("AiService", client =>
{
    client.Timeout = TimeSpan.FromMinutes(2); // Timeout 2 phút cho AI requests (AI cần thời gian xử lý)
});

// ===== XÂY DỰNG ỨNG DỤNG =====
var app = builder.Build();

// ===== CẤU HÌNH PIPELINE XỬ LÝ REQUEST =====
// Pipeline này xử lý mọi HTTP request theo thứ tự

// Chỉ hiển thị Swagger trong môi trường Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger(); // Tạo API documentation
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "HCM Chatbot Web_API API V1");
        c.RoutePrefix = "swagger"; // Swagger UI có thể truy cập tại /swagger
    });
}

// app.UseHttpsRedirection(); // Tắt HTTPS redirect cho development

// Áp dụng CORS policy (phải đặt trước Authentication)
app.UseCors("AllowSpecificOrigins");

// Middleware xác thực và ủy quyền (thứ tự quan trọng)
app.UseAuthentication(); // Xác thực người dùng (đọc JWT token)
app.UseAuthorization(); // Kiểm tra quyền truy cập

// Map các controller endpoints
app.MapControllers();

// ===== HEALTH CHECK ENDPOINT =====
// Endpoint để kiểm tra tình trạng sức khỏe của API
app.MapGet("/health", () => Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow, Service = "Web_API" }))
    .WithName("HealthCheck")
    .WithOpenApi();

// ===== KHỞI TẠO DATABASE VÀ DỮ LIỆU BAN ĐẦU =====
using (var scope = app.Services.CreateScope())
{
    try
    {
        // Lấy database context từ DI container
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Tạo database nếu chưa tồn tại (chỉ cho development)
        await context.Database.EnsureCreatedAsync();

        // Tạo tài khoản admin mặc định nếu chưa có
        var userService = scope.ServiceProvider.GetRequiredService<IUserService>();
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();

        // Kiểm tra xem admin đã tồn tại chưa
        var adminUser = await authService.GetUserByUsernameAsync("admin");
        if (adminUser == null)
        {
            // Tạo tài khoản admin với thông tin mặc định
            await authService.RegisterAsync("admin", "admin@hcmchatbot.com", "admin123", "System Administrator");

            // Lấy lại user vừa tạo và cập nhật role thành admin
            adminUser = await authService.GetUserByUsernameAsync("admin");
            if (adminUser != null)
            {
                adminUser.role = "admin";
                await userService.UpdateUserAsync(adminUser);
                Console.WriteLine("Admin user created successfully via Web_API");
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error during Web_API startup: {ex.Message}");
    }
}

// ===== KHỞI CHẠY ỨNG DỤNG =====
app.Run();