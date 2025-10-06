using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Web_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class TestController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public TestController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { 
                message = "HCM Chatbot API is running!", 
                timestamp = DateTime.UtcNow,
                version = "2.0.0"
            });
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new { 
                status = "healthy", 
                timestamp = DateTime.UtcNow 
            });
        }

        [HttpGet("database")]
        public async Task<IActionResult> TestDatabase()
        {
            try
        {
                var connectionString = _configuration.GetConnectionString("DefaultConnection");
                
                using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();
                
                var command = new NpgsqlCommand("SELECT version();", connection);
                var version = await command.ExecuteScalarAsync();
                
                await connection.CloseAsync();

                return Ok(new {
                    status = "success",
                    message = "Database connection successful",
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
                return StatusCode(500, new {
                    status = "error",
                    message = "Database connection failed",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        [HttpGet("tables")]
        public async Task<IActionResult> ListTables()
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("DefaultConnection");
                
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

                return Ok(new {
                    status = "success",
                    tablesCount = tables.Count,
                    tables = tables,
                    timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new {
                    status = "error",
                    message = "Failed to list tables",
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                });
            }
        }
    }
}
