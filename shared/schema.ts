import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  address: text("address").notNull(),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0").notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  surname: text("surname").notNull(),
  document: text("document").default(""),
  phone: text("phone").default(""),
  email: text("email").default(""),
  notes: text("notes").default(""),
});

export const watches = pgTable("watches", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").default("").notNull(),
  reference: text("reference").notNull(),
  serialNumber: text("serial_number").default(""),
  year: integer("year"),
  condition: text("condition").default("Nuovo").notNull(),
  caseMaterial: text("case_material").notNull(),
  braceletMaterial: text("bracelet_material").notNull(),
  caseSize: integer("case_size").notNull(),
  dialColor: text("dial_color").notNull(),
  movement: text("movement").default("Automatico").notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  productCode: text("product_code").default(""),
  sold: integer("sold").default(0).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  purchaseFromCustomer: text("purchase_from_customer").default(""),
  // Nuovo campo corredo
  accessories: text("accessories").default(""),
  // Riferimento al fornitore
  supplierId: integer("supplier_id"),
  // Nuovo campo per indicare se l'orologio è stato venduto
  isSold: boolean("is_sold").default(false),
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

// Schema per i fornitori
export const supplierSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  surname: z.string().min(1, "Cognome richiesto"),
  document: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().email("Email non valida").optional().default(""),
  notes: z.string().optional().default(""),
});

// Schema personalizzato per la validazione del form
export const extendedWatchSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().default(""),
  reference: z.string().min(1, "Reference is required"),
  serialNumber: z.string().optional().default(""),
  year: z.number().nullable().optional(),
  condition: z.string().default("Nuovo"),
  caseMaterial: z.string().min(1, "Case material is required"),
  braceletMaterial: z.string().min(1, "Bracelet material is required"),
  caseSize: z.number().min(20, "Case size must be at least 20mm"),
  dialColor: z.string().min(1, "Dial color is required"),
  movement: z.string().default("Automatico"),
  purchaseDate: z.string().or(z.date()).transform(val => new Date(val)),
  purchasePrice: z.string().or(z.number()).transform(val => val.toString()),
  sellingPrice: z.string().or(z.number()).transform(val => val.toString()),
  productCode: z.string().optional().default(""),
  purchaseFromCustomer: z.string().optional().default(""),
  accessories: z.string().optional().default(""),
  supplierId: z.number().optional().nullable(),
  isSold: z.boolean().optional().default(false),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, totalSpent: true });
export const insertSupplierSchema = supplierSchema;
export const insertSaleSchema = z.object({
  customerId: z.string().or(z.number()).transform(val => Number(val)),
  watchId: z.string().or(z.number()).transform(val => Number(val)),
  saleDate: z.string().or(z.date()).transform(val => new Date(val)),
  salePrice: z.string().or(z.number()).transform(val => Number(val)),
});

export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({ id: true });

export type Customer = typeof customers.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Watch = typeof watches.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertWatch = z.infer<typeof extendedWatchSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;