import {
  type Customer,
  type Watch,
  type Sale,
  type PriceHistory,
  type Supplier,
  type InsertCustomer,
  type InsertWatch,
  type InsertSale,
  type InsertPriceHistory,
  type InsertSupplier,
} from "@shared/schema";

export interface IStorage {
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<Customer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<boolean>;
  updateCustomerTotalSpent(id: number, amount: number): Promise<Customer>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;

  // Watches
  getWatches(): Promise<Watch[]>;
  getWatch(id: number): Promise<Watch | undefined>;
  createWatch(watch: any): Promise<Watch>;
  updateWatch(id: number, data: any): Promise<Watch>; // Per aggiornare qualsiasi campo
  updateWatchPrice(id: number, newPrice: number): Promise<Watch>;
  incrementWatchSold(id: number): Promise<Watch>;
  markWatchAsSold(id: number): Promise<Watch>; // Nuovo metodo
  deleteWatch(id: number): Promise<boolean>;

  // Sales
  getSales(): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  getSalesByCustomer(customerId: number): Promise<Sale[]>;

  // Price History
  getPriceHistory(watchId: number): Promise<PriceHistory[]>;
  createPriceHistory(priceHistory: InsertPriceHistory): Promise<PriceHistory>;
}

export type { InsertCustomer, InsertWatch, InsertSale, InsertPriceHistory, InsertSupplier };