import { pgTable, text, serial, integer, decimal, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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