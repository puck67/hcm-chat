using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data;

namespace Repositories.Interfaces;

public interface IGenericRepository <T> where T : class
{
    Task<IEnumerable<T>> GetAllAsync();
    Task<T> GetByIdAsync(Guid id);
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task<bool> DeleteAsync(Guid id);
    AppDbContext GetDbContext();
}