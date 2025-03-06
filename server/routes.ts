import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertWatchSchema, insertSaleSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Customers
  app.get("/api/customers", async (_req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.post("/api/customers", async (req, res) => {
    const result = insertCustomerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const customer = await storage.createCustomer(result.data);
    res.json(customer);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const customer = await storage.getCustomer(parseInt(req.params.id));
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  });

  // Watches
  app.get("/api/watches", async (_req, res) => {
    const watches = await storage.getWatches();
    res.json(watches);
  });

  app.post("/api/watches", async (req, res) => {
    const result = insertWatchSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const watch = await storage.createWatch(result.data);
    
    // Create initial price history
    await storage.createPriceHistory({
      watchId: watch.id,
      price: watch.sellingPrice,
      changeDate: new Date(),
    });
    
    res.json(watch);
  });

  app.patch("/api/watches/:id/price", async (req, res) => {
    const id = parseInt(req.params.id);
    const { price } = req.body;
    
    if (typeof price !== "number") {
      return res.status(400).json({ error: "Invalid price" });
    }

    const watch = await storage.updateWatchPrice(id, price);
    
    // Record price change
    await storage.createPriceHistory({
      watchId: id,
      price,
      changeDate: new Date(),
    });
    
    res.json(watch);
  });

  // Sales
  app.get("/api/sales", async (_req, res) => {
    const sales = await storage.getSales();
    res.json(sales);
  });

  app.post("/api/sales", async (req, res) => {
    const result = insertSaleSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const watch = await storage.getWatch(result.data.watchId);
    if (!watch) {
      return res.status(404).json({ error: "Watch not found" });
    }

    const customer = await storage.getCustomer(result.data.customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const sale = await storage.createSale(result.data);
    await storage.updateCustomerTotalSpent(customer.id, result.data.salePrice);
    await storage.incrementWatchSold(watch.id);
    
    res.json(sale);
  });

  // Price History
  app.get("/api/watches/:id/price-history", async (req, res) => {
    const priceHistory = await storage.getPriceHistory(parseInt(req.params.id));
    res.json(priceHistory);
  });

  const httpServer = createServer(app);
  return httpServer;
}
