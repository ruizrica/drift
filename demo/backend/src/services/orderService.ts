/**
 * Order Service
 * 
 * ✓ PATTERN: Business logic separated from routes
 */

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

class OrderService {
  private orders: Order[] = [];

  async findByUser(
    userId: string,
    options: { page: number; limit: number; status?: string }
  ): Promise<{ orders: Order[]; total: number }> {
    let filtered = this.orders.filter(o => o.userId === userId);
    
    if (options.status) {
      filtered = filtered.filter(o => o.status === options.status);
    }
    
    const start = (options.page - 1) * options.limit;
    const orders = filtered.slice(start, start + options.limit);
    
    return { orders, total: filtered.length };
  }

  async findById(id: string, userId: string): Promise<Order | null> {
    return this.orders.find(o => o.id === id && o.userId === userId) || null;
  }

  async create(data: { userId: string; items: OrderItem[]; shippingAddress: string }): Promise<Order> {
    const total = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    const order: Order = {
      id: `order-${Date.now()}`,
      userId: data.userId,
      items: data.items,
      total,
      status: 'pending',
      shippingAddress: data.shippingAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.orders.push(order);
    return order;
  }

  async cancel(id: string, userId: string): Promise<Order | null> {
    const order = this.orders.find(o => o.id === id && o.userId === userId);
    if (!order) return null;
    
    order.status = 'cancelled';
    order.updatedAt = new Date();
    return order;
  }
}

export const orderService = new OrderService();
