/**
 * User Service
 * 
 * ✓ PATTERN: Business logic separated from routes
 * ✓ PATTERN: Consistent async methods
 * ✓ PATTERN: Type-safe return values
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

class UserService {
  private users: User[] = [
    {
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      role: 'user',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'user-2',
      email: 'jane@example.com',
      name: 'Jane Smith',
      role: 'admin',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  async findAll(page: number, limit: number): Promise<{ users: User[]; total: number }> {
    const start = (page - 1) * limit;
    const users = this.users.slice(start, start + limit);
    return { users, total: this.users.length };
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: `user-${Date.now()}`,
      email: input.email,
      name: input.name,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    this.users[index] = {
      ...this.users[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.users[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    this.users.splice(index, 1);
    return true;
  }
}

export const userService = new UserService();
