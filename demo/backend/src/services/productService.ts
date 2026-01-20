/**
 * Product Service
 * 
 * ✓ PATTERN: Business logic separated from routes
 * ✓ PATTERN: Consistent async methods
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  createdAt: Date;
}

class ProductService {
  private products: Product[] = [
    {
      id: 'prod-1',
      name: 'Wireless Headphones',
      description: 'High-quality wireless headphones',
      price: 99.99,
      category: 'electronics',
      inStock: true,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'prod-2',
      name: 'USB-C Cable',
      description: 'Fast charging cable',
      price: 19.99,
      category: 'electronics',
      inStock: true,
      createdAt: new Date('2024-01-02'),
    },
  ];

  async findAll(options: { page: number; limit: number; category?: string }): Promise<{ products: Product[]; total: number }> {
    let filtered = this.products;
    
    if (options.category) {
      filtered = filtered.filter(p => p.category === options.category);
    }
    
    const start = (options.page - 1) * options.limit;
    const products = filtered.slice(start, start + options.limit);
    
    return { products, total: filtered.length };
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.find(p => p.id === id) || null;
  }

  async create(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    const product: Product = {
      id: `prod-${Date.now()}`,
      ...data,
      createdAt: new Date(),
    };
    this.products.push(product);
    return product;
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.products[index] = { ...this.products[index], ...data };
    return this.products[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.products.splice(index, 1);
    return true;
  }
}

export const productService = new ProductService();
