using System;
using System.Threading.Tasks;
using Data;

namespace Repositories;

public interface IUnitOfWork : IDisposable
{
    AppDbContext Context { get; }
    
    
    Task<int> CompleteAsync();
}