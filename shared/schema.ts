import { pgTable, text, serial, integer, decimal, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Watches (orologi) tabella
export const watches = pgTable("watches", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  reference: text("reference").notNull(),
  serialNumber: text("serial_number"),
  year: integer("year"),
  condition: text("condition").default("Nuovo"),
  caseMaterial: text("case_material").default("Acciaio"),
  braceletMaterial: text("bracelet_material").default("Acciaio"),
  caseSize: integer("case_size").default(40),
  dialColor: text("dial_color").default("Nero"),
  movement: text("movement").default("Automatico"),
  purchaseDate: timestamp("purchase_date").defaultNow(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  sold: integer("sold").default(0),
  isSold: boolean("is_sold").default(false),
  productCode: text("product_code").default(""),
  accessories: text("accessories").default(""),
  supplierId: integer("supplier_id"),
  addedAt: timestamp("added_at").defaultNow(),
});

// Customers (clienti) tabella
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  address: text("address").notNull(),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0"),
});

// Sales (vendite) tabella
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  watchId: integer("watch_id").notNull(),
  saleDate: timestamp("sale_date").notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
});

// Suppliers (fornitori) tabella
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  surname: text("surname").notNull(),
  document: text("document").default(""),
  phone: text("phone").default(""),
  email: text("email").default(""),
  notes: text("notes").default(""),
});

// Price History (storico prezzi) tabella
export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  watchId: integer("watch_id").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  changeDate: timestamp("change_date").defaultNow(),
});

// Categorie di prodotto
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly name
  icon: text("icon").default("Package"), // Nome dell'icona Lucide
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Campi personalizzati per categoria
export const categoryFields = pgTable("category_fields", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(), // URL-friendly name
  label: text("label").notNull(), // Label visibile all'utente
  type: text("type").notNull().default("text"), // text, number, date, select, etc.
  isRequired: boolean("is_required").default(false),
  options: text("options").default(""), // Per campi di tipo select (JSON serializzato)
  displayOrder: integer("display_order").default(0),
  showInTable: boolean("show_in_table").default(true), // Mostra questo campo nella tabella prodotti
  showInGraph: boolean("show_in_graph").default(false), // Usa questo campo per i grafici
}, (table) => {
  return {
    categoryFieldUnique: unique().on(table.categoryId, table.slug),
  }
});

// Prodotti generici
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  productCode: text("product_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").default(""),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  condition: text("condition").default("Nuovo"),
  isSold: boolean("is_sold").default(false),
  sold: integer("sold").default(0),
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  supplierId: integer("supplier_id"),
});

// Valori dei campi personalizzati
export const productFieldValues = pgTable("product_field_values", {
  id: serial("id").primaryKey(), 
  productId: integer("product_id").notNull(),
  fieldId: integer("field_id").notNull(),
  value: text("value").default(""), // Memorizza tutti i valori come testo
}, (table) => {
  return {
    productFieldUnique: unique().on(table.productId, table.fieldId),
  }
});

// Sales per i prodotti generici
export const productSales = pgTable("product_sales", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  customerId: integer("customer_id").notNull(),
  saleDate: timestamp("sale_date").notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes").default(""),
});

// Schema di validazione per Watch
export const watchSchema = z.object({
  brand: z.string().min(1, "Brand è richiesto"),
  model: z.string().min(1, "Modello è richiesto"),
  reference: z.string().min(1, "Riferimento è richiesto"),
  serialNumber: z.string().optional(),
  year: z.number().optional(),
  condition: z.string().default("Nuovo"),
  caseMaterial: z.string().default("Acciaio"),
  braceletMaterial: z.string().default("Acciaio"),
  caseSize: z.number().default(40),
  dialColor: z.string().default("Nero"),
  movement: z.string().default("Automatico"),
  purchaseDate: z.string().or(z.date()).transform(val => new Date(val)),
  purchasePrice: z.string().or(z.number()).transform(val => val.toString()),
  sellingPrice: z.string().or(z.number()).transform(val => val.toString()),
  supplierId: z.number().optional().nullable(),
  accessories: z.string().optional(),
});

// Schema esteso per Watch (include productCode e altri campi)
export const extendedWatchSchema = watchSchema.extend({
  productCode: z.string().optional(),
});

// Schema di validazione per Customer
export const insertCustomerSchema = z.object({
  firstName: z.string().min(1, "Il nome è richiesto"),
  lastName: z.string().min(1, "Il cognome è richiesto"),
  address: z.string().min(1, "L'indirizzo è richiesto"),
});

// Schema di validazione per Sale
export const insertSaleSchema = z.object({
  customerId: z.number(),
  watchId: z.number(),
  saleDate: z.string().or(z.date()).transform(val => new Date(val)),
  salePrice: z.number(),
});

// Schema di validazione per Supplier
export const insertSupplierSchema = z.object({
  name: z.string().min(1, "Il nome è richiesto"),
  surname: z.string().min(1, "Il cognome è richiesto"),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
});

// Schema di validazione per PriceHistory
export const insertPriceHistorySchema = z.object({
  watchId: z.number(),
  price: z.number(),
  changeDate: z.date(),
});

// Schema per la validazione
export const productCategorySchema = z.object({
  name: z.string().min(1, "Il nome della categoria è richiesto"),
  icon: z.string().default("Package"),
});

export const categoryFieldSchema = z.object({
  name: z.string().min(1, "Il nome del campo è richiesto"),
  label: z.string().min(1, "L'etichetta del campo è richiesta"),
  type: z.enum(["text", "number", "date", "select", "textarea", "boolean"]),
  isRequired: z.boolean().default(false),
  options: z.string().default(""),
  displayOrder: z.number().default(0),
  showInTable: z.boolean().default(true),
  showInGraph: z.boolean().default(false),
});

export const productSchema = z.object({
  categoryId: z.number(),
  name: z.string().min(1, "Il nome del prodotto è richiesto"),
  description: z.string().default(""),
  purchasePrice: z.string().or(z.number()).transform(val => val.toString()),
  sellingPrice: z.string().or(z.number()).transform(val => val.toString()),
  purchaseDate: z.string().or(z.date()).transform(val => new Date(val)),
  condition: z.string().default("Nuovo"),
  supplierId: z.number().nullable().optional(),
  // I campi customizzati verranno validati separatamente
});

export const productFieldValueSchema = z.object({
  fieldId: z.number(),
  value: z.string().default(""),
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ 
  id: true, createdAt: true, updatedAt: true, slug: true 
});

export const insertCategoryFieldSchema = createInsertSchema(categoryFields).omit({ 
  id: true, slug: true 
});

export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, productCode: true, addedAt: true, updatedAt: true, isSold: true, sold: true 
});

export const insertProductFieldValueSchema = createInsertSchema(productFieldValues).omit({ 
  id: true 
});

export const insertProductSaleSchema = createInsertSchema(productSales).omit({ 
  id: true 
});

// Definizione dei tipi
export type Watch = typeof watches.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;

export type InsertWatch = z.infer<typeof watchSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;

export type ProductCategory = typeof productCategories.$inferSelect;
export type CategoryField = typeof categoryFields.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductFieldValue = typeof productFieldValues.$inferSelect;
export type ProductSale = typeof productSales.$inferSelect;

export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type InsertCategoryField = z.infer<typeof insertCategoryFieldSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertProductFieldValue = z.infer<typeof insertProductFieldValueSchema>;
export type InsertProductSale = z.infer<typeof insertProductSaleSchema>;

// Tipo per prodotto completo con valori personalizzati
export type ProductWithCustomFields = Product & {
  customFields: Record<string, string>;
  category?: ProductCategory;
  fieldDefinitions?: CategoryField[];
};