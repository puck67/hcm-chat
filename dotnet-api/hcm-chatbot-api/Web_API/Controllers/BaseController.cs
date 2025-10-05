using Microsoft.AspNetCore.Mvc;
using Models.DTOs;

namespace Web_API;

[ApiController]
[Route("api/[controller]")]
public abstract class BaseController : ControllerBase
{
    protected IActionResult SuccessResponse<T>(T data, string message = "Operation successful")
    {
        return Ok(ApiResponse<T>.SuccessResponse(data, message));
    }

    protected IActionResult SuccessResponse(string message = "Operation successful")
    {
        return Ok(ApiResponse.SuccessResponse(message));
    }

    protected IActionResult ErrorResponse(string message, int statusCode = 400)
    {
        var response = ApiResponse.ErrorResponse(message);
        return StatusCode(statusCode, response);
    }

    protected IActionResult ErrorResponse<T>(string message, int statusCode = 400)
    {
        var response = ApiResponse<T>.ErrorResponse(message);
        return StatusCode(statusCode, response);
    }

    protected Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return userId;
        }
        throw new UnauthorizedAccessException("User ID not found in token");
    }

    protected string GetCurrentUserRole()
    {
        var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role);
        return roleClaim?.Value ?? "user";
    }

    protected bool IsAdmin()
    {
        return GetCurrentUserRole() == "admin";
    }
}