using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using BCrypt.Net;
using Data;
using Repositories;
using Repositories.Interfaces;
using Services.Interfaces;

namespace Services.Implementations;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IGenericRepository<user> _userRepository;
    private readonly IConfiguration _configuration;

    public AuthService(IUnitOfWork unitOfWork, IGenericRepository<user> userRepository, IConfiguration configuration)
    {
        _unitOfWork = unitOfWork;
        _userRepository = userRepository;
        _configuration = configuration;
    }

    public async Task<string> RegisterAsync(string username, string email, string password, string? fullName = null)
    {
        var existingUser = await GetUserByUsernameAsync(username);
        if (existingUser != null)
            throw new InvalidOperationException("Username already exists");

        var existingEmail = await GetUserByEmailAsync(email);
        if (existingEmail != null)
            throw new InvalidOperationException("Email already exists");

        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);

        var newUser = new user
        {
            id = Guid.NewGuid(),
            username = username,
            email = email,
            password_hash = hashedPassword,
            full_name = fullName,
            role = "user",
            status = "enable",
            total_messages = 0,
            total_conversations = 0,
            created_at = DateTime.UtcNow,
            updated_at = DateTime.UtcNow
        };

        await _userRepository.AddAsync(newUser);
        await _unitOfWork.CompleteAsync();

        return GenerateJwtToken(newUser);
    }

    public async Task<string> LoginAsync(string username, string password)
    {
        var user = await GetUserByUsernameAsync(username);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid credentials");

        if (user.status == "disable")
            throw new UnauthorizedAccessException("Account is disabled");

        if (!BCrypt.Net.BCrypt.Verify(password, user.password_hash))
            throw new UnauthorizedAccessException("Invalid credentials");

        return GenerateJwtToken(user);
    }

    public async Task<user?> GetUserByUsernameAsync(string username)
    {
        var users = await _userRepository.GetAllAsync();
        return users.FirstOrDefault(u => u.username == username);
    }

    public async Task<user?> GetUserByEmailAsync(string email)
    {
        var users = await _userRepository.GetAllAsync();
        return users.FirstOrDefault(u => u.email == email);
    }

    public async Task<bool> ValidateTokenAsync(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["JwtSettings:SecretKey"]!);

            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _configuration["JwtSettings:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["JwtSettings:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            return true;
        }
        catch
        {
            return false;
        }
    }

    public string GenerateJwtToken(user user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_configuration["JwtSettings:SecretKey"]!);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.id.ToString()),
            new Claim(ClaimTypes.Name, user.username),
            new Claim(ClaimTypes.Email, user.email),
            new Claim(ClaimTypes.Role, user.role ?? "user")
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(int.Parse(_configuration["JwtSettings:ExpirationMinutes"]!)),
            Issuer = _configuration["JwtSettings:Issuer"],
            Audience = _configuration["JwtSettings:Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    /// <summary>
    /// Cập nhật thông tin profile của user
    /// Chỉ cập nhật những field được cung cấp (không null)
    /// </summary>
    public async Task<user> UpdateUserProfileAsync(string username, string? email = null, string? fullName = null, string? avatarUrl = null)
    {
        var user = await GetUserByUsernameAsync(username);
        if (user == null)
            throw new InvalidOperationException("User not found");

        // Kiểm tra email mới có trùng với user khác không
        if (!string.IsNullOrEmpty(email) && email != user.email)
        {
            var existingEmailUser = await GetUserByEmailAsync(email);
            if (existingEmailUser != null && existingEmailUser.id != user.id)
                throw new InvalidOperationException("Email already exists");
        }

        // Cập nhật chỉ những field được cung cấp
        if (!string.IsNullOrEmpty(email))
            user.email = email;

        if (fullName != null) // Cho phép set empty string
            user.full_name = fullName;

        if (avatarUrl != null) // Cho phép set empty string
            user.avatar_url = avatarUrl;

        user.updated_at = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.CompleteAsync();

        return user;
    }

    /// <summary>
    /// Đổi mật khẩu user
    /// Xác thực mật khẩu cũ trước khi cập nhật
    /// </summary>
    public async Task<bool> ChangePasswordAsync(string username, string currentPassword, string newPassword)
    {
        var user = await GetUserByUsernameAsync(username);
        if (user == null)
            throw new InvalidOperationException("User not found");

        // Xác thực mật khẩu hiện tại
        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.password_hash))
            throw new UnauthorizedAccessException("Current password is incorrect");

        // Hash mật khẩu mới
        var hashedNewPassword = BCrypt.Net.BCrypt.HashPassword(newPassword);

        user.password_hash = hashedNewPassword;
        user.updated_at = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.CompleteAsync();

        return true;
    }
}