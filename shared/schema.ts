import { pgTable, text, serial, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  address: text("address").notNull(),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0").notNull(),
});

export const watches = pgTable("watches", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  reference: text("reference").notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  caseMaterial: text("case_material").notNull(),
  braceletMaterial: text("bracelet_material").notNull(),
  caseSize: integer("case_size").notNull(),
  dialColor: text("dial_color").notNull(),
  sold: integer("sold").default(0).notNull(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  watchId: integer("watch_id").notNull(),
  saleDate: timestamp("sale_date").notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
});

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  watchId: integer("watch_id").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  changeDate: timestamp("change_date").notNull(),
});

// Schema personalizzato per la validazione del form
const baseWatchSchema = {
  brand: z.string().min(1, "Brand is required"),
  reference: z.string().min(1, "Reference is required"),
  purchaseDate: z.string().transform((str) => new Date(str)),
  purchasePrice: z.string().or(z.number()).transform(val => val.toString()),
  sellingPrice: z.string().or(z.number()).transform(val => val.toString()),
  caseMaterial: z.string().min(1, "Case material is required"),
  braceletMaterial: z.string().min(1, "Bracelet material is required"),
  caseSize: z.number().min(20, "Case size must be at least 20mm"),
  dialColor: z.string().min(1, "Dial color is required"),
};

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, totalSpent: true });
export const insertWatchSchema = z.object(baseWatchSchema);
export const insertSaleSchema = z.object({
  customerId: z.string().or(z.number()).transform(val => Number(val)),
  watchId: z.string().or(z.number()).transform(val => Number(val)),
  saleDate: z.string().transform(str => new Date(str)),
  salePrice: z.string().or(z.number()).transform(val => Number(val)),
});
export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({ id: true });

export type Customer = typeof customers.$inferSelect;
export type Watch = typeof watches.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertWatch = z.infer<typeof insertWatchSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;