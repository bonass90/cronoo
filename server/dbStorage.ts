import { db } from "../shared/db";
import { customers, watches, sales, priceHistory } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  type IStorage,
  type InsertCustomer,
  type InsertWatch,
  type InsertSale,
  type InsertPriceHistory,
} from "./storage";

export class DbStorage implements IStorage {
  // Customers
  async getCustomers() {
    return await db.select().from(customers);
  }

  async getCustomer(id: number) {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0] || undefined;
  }

  async createCustomer(customer: InsertCustomer) {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomerTotalSpent(id: number, amount: number) {
    const customer = await this.getCustomer(id);
    if (!customer) throw new Error("Customer not found");

    const updatedCustomer = await db
      .update(customers)
      .set({ totalSpent: (Number(customer.totalSpent) + amount).toString() })
      .where(eq(customers.id, id))
      .returning();
    
    return updatedCustomer[0];
  }

  // Watches
  async getWatches() {
    return await db.select().from(watches);
  }

  async getWatch(id: number) {
    const result = await db.select().from(watches).where(eq(watches.id, id));
    return result[0] || undefined;
  }

  async createWatch(watch: InsertWatch) {
    const [newWatch] = await db.insert(watches).values(watch).returning();
    return newWatch;
  }

  async updateWatchPrice(id: number, newPrice: number) {
    const watch = await this.getWatch(id);
    if (!watch) throw new Error("Watch not found");

    const updatedWatch = await db
      .update(watches)
      .set({ sellingPrice: newPrice })
      .where(eq(watches.id, id))
      .returning();

    return updatedWatch[0];
  }

  async incrementWatchSold(id: number) {
    const watch = await this.getWatch(id);
    if (!watch) throw new Error("Watch not found");

    const updatedWatch = await db
      .update(watches)
      .set({ sold: watch.sold + 1 })
      .where(eq(watches.id, id))
      .returning();

    return updatedWatch[0];
  }

  // Sales
  async getSales() {
    return await db.select().from(sales);
  }

  async createSale(sale: InsertSale) {
    const [newSale] = await db.insert(sales).values(sale).returning();
    return newSale;
  }

  async getSalesByCustomer(customerId: number) {
    return await db.select().from(sales).where(eq(sales.customerId, customerId));
  }

  // Price History
  async getPriceHistory(watchId: number) {
    return await db.select().from(priceHistory).where(eq(priceHistory.watchId, watchId));
  }

  async createPriceHistory(price: InsertPriceHistory) {
    const [newPriceHistory] = await db.insert(priceHistory).values(price).returning();
    return newPriceHistory;
  }
}

export const storage = new DbStorage();
