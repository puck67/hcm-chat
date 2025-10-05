using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data;
using Microsoft.EntityFrameworkCore;
using Repositories.Interfaces;

namespace Repositories.Implementations;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly AppDbContext _context; 
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(AppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }
    
    public async Task<IEnumerable<T>> GetAllAsync()
    {
        return await _dbSet.ToListAsync();
    }
    
    public async Task<T> GetByIdAsync(Guid id)
    {
        return await _dbSet.FindAsync(id);
    }
    
    public async Task<T> AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
        //await _context.SaveChangesAsync();
        return entity;
    }
    
    public async Task UpdateAsync(T entity)
    {
        _context.Entry(entity).State = EntityState.Modified;
    }
    
    public async Task<bool> DeleteAsync(Guid id)
    {
        var item = await _dbSet.FindAsync(id);

        if (item == null)
        {
            return false;
        }

        _dbSet.Remove(item);
        return true;
    }

    public AppDbContext GetDbContext()
    {
        return _context;
    }
}