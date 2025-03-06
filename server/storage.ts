import {
  type Customer,
  type Watch,
  type Sale,
  type PriceHistory,
  type InsertCustomer,
  type InsertWatch,
  type InsertSale,
  type InsertPriceHistory,
} from "@shared/schema";

export interface IStorage {
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomerTotalSpent(id: number, amount: number): Promise<Customer>;

  // Watches
  getWatches(): Promise<Watch[]>;
  getWatch(id: number): Promise<Watch | undefined>;
  createWatch(watch: InsertWatch): Promise<Watch>;
  updateWatchPrice(id: number, newPrice: number): Promise<Watch>;
  incrementWatchSold(id: number): Promise<Watch>;

  // Sales
  getSales(): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  getSalesByCustomer(customerId: number): Promise<Sale[]>;

  // Price History
  getPriceHistory(watchId: number): Promise<PriceHistory[]>;
  createPriceHistory(priceHistory: InsertPriceHistory): Promise<PriceHistory>;
}

export class MemStorage implements IStorage {
  private customers: Map<number, Customer>;
  private watches: Map<number, Watch>;
  private sales: Map<number, Sale>;
  private priceHistory: Map<number, PriceHistory>;
  private customerIdCounter: number;
  private watchIdCounter: number;
  private saleIdCounter: number;
  private priceHistoryIdCounter: number;

  constructor() {
    this.customers = new Map();
    this.watches = new Map();
    this.sales = new Map();
    this.priceHistory = new Map();
    this.customerIdCounter = 1;
    this.watchIdCounter = 1;
    this.saleIdCounter = 1;
    this.priceHistoryIdCounter = 1;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerIdCounter++;
    const newCustomer: Customer = { ...customer, id, totalSpent: "0" };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomerTotalSpent(id: number, amount: number): Promise<Customer> {
    const customer = await this.getCustomer(id);
    if (!customer) throw new Error("Customer not found");

    const updatedCustomer = {
      ...customer,
      totalSpent: (Number(customer.totalSpent) + amount).toString(),
    };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  // Watches
  async getWatches(): Promise<Watch[]> {
    return Array.from(this.watches.values());
  }

  async getWatch(id: number): Promise<Watch | undefined> {
    return this.watches.get(id);
  }

  async createWatch(watch: InsertWatch): Promise<Watch> {
    const id = this.watchIdCounter++;
    const newWatch: Watch = { ...watch, id, sold: 0 };
    this.watches.set(id, newWatch);
    return newWatch;
  }

  async updateWatchPrice(id: number, newPrice: number): Promise<Watch> {
    const watch = await this.getWatch(id);
    if (!watch) throw new Error("Watch not found");

    const updatedWatch = {
      ...watch,
      sellingPrice: newPrice,
    };
    this.watches.set(id, updatedWatch);
    return updatedWatch;
  }

  async incrementWatchSold(id: number): Promise<Watch> {
    const watch = await this.getWatch(id);
    if (!watch) throw new Error("Watch not found");

    const updatedWatch = {
      ...watch,
      sold: watch.sold + 1,
    };
    this.watches.set(id, updatedWatch);
    return updatedWatch;
  }

  // Sales
  async getSales(): Promise<Sale[]> {
    return Array.from(this.sales.values());
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const id = this.saleIdCounter++;
    const newSale: Sale = { ...sale, id };
    this.sales.set(id, newSale);
    return newSale;
  }

  async getSalesByCustomer(customerId: number): Promise<Sale[]> {
    return Array.from(this.sales.values()).filter(
      (sale) => sale.customerId === customerId
    );
  }

  // Price History
  async getPriceHistory(watchId: number): Promise<PriceHistory[]> {
    return Array.from(this.priceHistory.values()).filter(
      (history) => history.watchId === watchId
    );
  }

  async createPriceHistory(
    priceHistory: InsertPriceHistory
  ): Promise<PriceHistory> {
    const id = this.priceHistoryIdCounter++;
    const newPriceHistory: PriceHistory = { ...priceHistory, id };
    this.priceHistory.set(id, newPriceHistory);
    return newPriceHistory;
  }
}

export const storage = new MemStorage();