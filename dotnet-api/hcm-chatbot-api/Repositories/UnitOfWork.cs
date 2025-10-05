using System;
using System.Threading.Tasks;
using Data;
using Microsoft.EntityFrameworkCore;

namespace Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    
    public AppDbContext Context => _context; 
    
    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }
    
    public async Task<int> CompleteAsync()
    {
        try
        {
            return await _context.SaveChangesAsync();
        }
        catch (DbUpdateException dbEx) // Bắt lỗi DbUpdateException cụ thể
        {
            Console.WriteLine("--- DbUpdateException in CompleteAsync ---");
            Console.WriteLine($"Message: {dbEx.Message}");
            if (dbEx.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {dbEx.InnerException.Message}");
                // Log chi tiết hơn nếu InnerException là PostgresException
                if (dbEx.InnerException is Npgsql.PostgresException pgEx)
                {
                    Console.WriteLine($"Postgres Error Code: {pgEx.SqlState}");
                    Console.WriteLine($"Postgres Detail: {pgEx.Detail}");
                    Console.WriteLine($"Postgres Hint: {pgEx.Hint}");
                }
            }
            //_logger?.LogError(dbEx, "Error saving changes in UnitOfWork.CompleteAsync."); // Sử dụng logger nếu có
            Console.WriteLine("-------------------------------------");
            throw; // Re-throw để lỗi được lan truyền lên service và API
        }
        catch (Exception ex) // Bắt các lỗi tổng quát khác
        {
            Console.WriteLine("--- General Exception in CompleteAsync ---");
            Console.WriteLine($"Message: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }
            //_logger?.LogError(ex, "Unexpected error in UnitOfWork.CompleteAsync."); // Sử dụng logger nếu có
            Console.WriteLine("-------------------------------------");
            throw; // Re-throw
        }
    }
    
    public void Dispose()
    {
        _context.Dispose();
    }
}