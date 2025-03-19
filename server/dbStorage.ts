import { db } from "../shared/db";
import { customers, watches, sales, priceHistory, suppliers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { type IStorage, type InsertCustomer, type InsertSale, type InsertPriceHistory, type InsertSupplier } from "./storage";
import { type Customer } from "@shared/schema";

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

  async updateCustomer(id: number, data: Partial<Customer>) {
    const customer = await this.getCustomer(id);
    if (!customer) throw new Error("Customer not found");

    const updatedCustomer = await db
      .update(customers)
      .set(data)
      .where(eq(customers.id, id))
      .returning();

    return updatedCustomer[0];
  }

  async deleteCustomer(id: number) {
    const customer = await this.getCustomer(id);
    if (!customer) throw new Error("Customer not found");

    // Verifica se ci sono vendite associate al cliente
    const sales = await this.getSalesByCustomer(id);
    if (sales.length > 0) {
      throw new Error("Cannot delete customer with associated sales");
    }

    await db.delete(customers).where(eq(customers.id, id));
    return true;
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

  // Suppliers
  async getSuppliers() {
    return await db.select().from(suppliers);
  }

  async getSupplier(id: number) {
    const result = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return result[0] || undefined;
  }

  async createSupplier(supplier: InsertSupplier) {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  // Watches
  async getWatches() {
    return await db.select().from(watches);
  }

  async getWatch(id: number) {
    const result = await db.select().from(watches).where(eq(watches.id, id));
    return result[0] || undefined;
  }

  async createWatch(watch: any) {
    const [newWatch] = await db.insert(watches).values(watch).returning();
    return newWatch;
  }

  // Metodo per aggiornare un campo qualsiasi dell'orologio
  async updateWatch(id: number, data: any) {
    const watch = await this.getWatch(id);
    if (!watch) throw new Error("Watch not found");

    const updatedWatch = await db
      .update(watches)
      .set(data)
      .where(eq(watches.id, id))
      .returning();

    return updatedWatch[0];
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

  async markWatchAsSold(id: number) {
    const watch = await this.getWatch(id);
    if (!watch) throw new Error("Watch not found");

    const updatedWatch = await db
      .update(watches)
      .set({ 
        isSold: true,
        sold: watch.sold + 1  // Manteniamo anche il counter incrementato
      })
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

  async deleteWatch(id: number) {
    // Verifichiamo prima se l'orologio esiste
    const watch = await this.getWatch(id);
    if (!watch) throw new Error("Orologio non trovato");
  
    // Eliminiamo l'orologio
    await db.delete(watches).where(eq(watches.id, id));
    return true;
  }
}

export const storage = new DbStorage();