using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Data;
using Microsoft.EntityFrameworkCore;
using Repositories.Interfaces;

namespace Repositories.Implementations;

public class UserRepository : GenericRepository<user>, IUserRepository
{

    public UserRepository(AppDbContext context) : base(context)
    {
        
    }

    public async Task<IEnumerable<user>> GetAllAsync()
    {
        return await _dbSet.Include(c => c.conversations).ToListAsync();
    }

    public async Task<user> GetByIdAsync(Guid id)
    {
        return await _dbSet.Include(c => c.conversations).FirstOrDefaultAsync(c => c.id == id);
    }
}