import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./dbStorage";
import { insertCustomerSchema, extendedWatchSchema, insertSaleSchema, insertSupplierSchema, watches, sales, priceHistory, customers, suppliers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { watches } from "@shared/schema";
import { db } from "../shared/db";
import { registerDynamicProductRoutes } from "./dynamic-product-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Registra le rotte per i prodotti dinamici
  registerDynamicProductRoutes(app);
  
  // Endpoint di diagnostica per il database
  app.get("/api/database-debug", async (_req, res) => {
    try {
      // Ottieni tutti gli orologi
      const watches = await storage.getWatches();
      
      // Ottieni tutte le vendite
      const sales = await storage.getSales();
      
      // Prepara un report di diagnostica
      const diagnosticReport = {
        totalWatches: watches.length,
        watchesSamples: watches.slice(0, 5), // Primi 5 orologi
        watchesWithSold: watches.filter(w => w.sold > 0).map(w => ({id: w.id, brand: w.brand, model: w.model, sold: w.sold, isSold: w.isSold})),
        totalSales: sales.length,
        salesSamples: sales.slice(0, 5), // Prime 5 vendite
        watchIdsInSales: sales.map(s => s.watchId),
      };
      
      res.json(diagnosticReport);
    } catch (error) {
      console.error("Errore nella diagnostica del database:", error);
      res.status(500).json({ error: "Errore nella diagnostica del database" });
    }
  });

  // Endpoint per correggere manualmente gli orologi venduti
  app.post("/api/manual-fix-watches", async (_req, res) => {
    try {
      const sales = await storage.getSales();
      const watchIdsInSales = [...new Set(sales.map(s => s.watchId))]; // Array di ID unici
      
      let updatedCount = 0;
      
      for (const watchId of watchIdsInSales) {
        try {
          await db.update(watches)
            .set({ isSold: true })
            .where(eq(watches.id, watchId));
          updatedCount++;
        } catch (error) {
          console.error(`Errore aggiornando l'orologio ${watchId}:`, error);
        }
      }
      
      res.json({ 
        success: true, 
        message: `Aggiornati ${updatedCount} orologi di ${watchIdsInSales.length} orologi venduti`
      });
    } catch (error) {
      console.error("Errore nell'aggiornamento manuale:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento manuale" });
    }
  });

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
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    res.json(customer);
  });

  // PUT per aggiornare un cliente
  app.put("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      
      const updates = req.body;
      const updatedCustomer = await storage.updateCustomer(id, updates);
      
      res.json(updatedCustomer);
    } catch (error) {
      console.error("Errore nell'aggiornamento del cliente:", error);
      res.status(400).json({ error: "Impossibile aggiornare il cliente" });
    }
  });

  // DELETE per eliminare un cliente
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      
      // Verifica se il cliente ha delle vendite associate
      const customerSales = await storage.getSalesByCustomer(id);
      if (customerSales.length > 0) {
        return res.status(400).json({ 
          error: "Impossibile eliminare il cliente perché ha vendite associate" 
        });
      }
      
      await storage.deleteCustomer(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Errore nell'eliminazione del cliente:", error);
      res.status(400).json({ error: "Impossibile eliminare il cliente" });
    }
  });

  // Suppliers
  app.get("/api/suppliers", async (_req, res) => {
    const suppliers = await storage.getSuppliers();
    res.json(suppliers);
  });

  app.post("/api/suppliers", async (req, res) => {
    const result = insertSupplierSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const supplier = await storage.createSupplier(result.data);
    res.json(supplier);
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    const supplier = await storage.getSupplier(parseInt(req.params.id));
    if (!supplier) {
      return res.status(404).json({ error: "Fornitore non trovato" });
    }
    res.json(supplier);
  });

  // Watches
  app.get("/api/watches", async (_req, res) => {
    try {
      const watches = await storage.getWatches();
      // Filtra gli orologi che potrebbero causare problemi
      const safeWatches = watches.map(watch => ({
        ...watch,
        // Assicurati che questi campi abbiano sempre valori predefiniti
        model: watch.model || watch.brand || "Modello Sconosciuto",
        condition: watch.condition || "Buone",
        movement: watch.movement || "Automatico",
        productCode: watch.productCode || `MIG-${watch.id}`,
        accessories: watch.accessories || "",
        // Converti i valori numerici in formato corretto
        sellingPrice: watch.sellingPrice || 0,
        purchasePrice: watch.purchasePrice || 0,
        isSold: watch.isSold || false,
      }));
      res.json(safeWatches);
    } catch (error) {
      console.error("Errore nel recupero degli orologi:", error);
      res.status(500).json({ error: "Errore del server nel recupero degli orologi" });
    }
  });

  app.post("/api/watches", async (req, res) => {
    try {
      const result = extendedWatchSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      // Impostazione data aggiunta (per calcolare giorni in giacenza)
      const watchData = {
        ...result.data,
        addedAt: new Date(),
        isSold: false, // Assicuriamoci che un nuovo orologio non sia venduto
      };
      
      const watch = await storage.createWatch(watchData);
      
      // Create initial price history
      await storage.createPriceHistory({
        watchId: watch.id,
        price: watch.sellingPrice,
        changeDate: new Date(),
      });
      
      res.json(watch);
    } catch (error) {
      console.error("Errore nella creazione dell'orologio:", error);
      res.status(500).json({ error: "Impossibile creare l'orologio" });
    }
  });

  // Aggiunta del metodo PUT per aggiornare orologi (per il problema di edit)
  app.put("/api/watches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const watch = await storage.updateWatch(id, updateData);
      
      // Se è stato aggiornato il prezzo di vendita, registralo nella cronologia
      if (updateData.sellingPrice !== undefined) {
        await storage.createPriceHistory({
          watchId: id,
          price: updateData.sellingPrice,
          changeDate: new Date(),
        });
      }
      
      res.json(watch);
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'orologio:", error);
      res.status(400).json({ error: "Impossibile aggiornare l'orologio" });
    }
  });

  // Aggiornamento generico watch (per qualsiasi campo)
  app.patch("/api/watches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const watch = await storage.updateWatch(id, updateData);
      
      // Se è stato aggiornato il prezzo di vendita, registralo nella cronologia
      if (updateData.sellingPrice !== undefined) {
        await storage.createPriceHistory({
          watchId: id,
          price: updateData.sellingPrice,
          changeDate: new Date(),
        });
      }
      
      res.json(watch);
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'orologio:", error);
      res.status(400).json({ error: "Impossibile aggiornare l'orologio" });
    }
  });

  // Aggiornamento specifico per il prezzo (mantenuto per retrocompatibilità)
  app.patch("/api/watches/:id/price", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { price } = req.body;
      
      if (typeof price !== "number") {
        return res.status(400).json({ error: "Prezzo non valido" });
      }

      const watch = await storage.updateWatchPrice(id, price);
      
      // Record price change
      await storage.createPriceHistory({
        watchId: id,
        price,
        changeDate: new Date(),
      });
      
      res.json(watch);
    } catch (error) {
      console.error("Errore nell'aggiornamento del prezzo:", error);
      res.status(400).json({ error: "Impossibile aggiornare il prezzo" });
    }
  });

  // Endpoint per eliminare un orologio
  app.delete("/api/watches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWatch(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Errore nell'eliminazione dell'orologio:", error);
      res.status(400).json({ error: "Impossibile eliminare l'orologio" });
    }
  });

  // Endpoint per duplicare un orologio
  app.post("/api/watches/:id/duplicate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const watch = await storage.getWatch(id);
      
      if (!watch) {
        return res.status(404).json({ error: "Orologio non trovato" });
      }
      
      // Genera un nuovo codice prodotto
      const prefix = watch.brand.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().substring(7);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const productCode = `${prefix}-${timestamp}${random}-D`;
      
      // Crea una copia dell'orologio senza l'ID
      const { id: _, ...watchData } = watch;
      
      // Aggiungi il nuovo codice prodotto e assicurati che non sia venduto
      const newWatch = await storage.createWatch({
        ...watchData,
        productCode,
        addedAt: new Date(),
        isSold: false,
      });
      
      res.json(newWatch);
    } catch (error) {
      console.error("Errore nella duplicazione dell'orologio:", error);
      res.status(400).json({ error: "Impossibile duplicare l'orologio" });
    }
  });

  // Sales
  app.get("/api/sales", async (_req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      console.error("Errore nel recupero delle vendite:", error);
      res.status(500).json({ error: "Errore del server nel recupero delle vendite" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const result = insertSaleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const watch = await storage.getWatch(result.data.watchId);
      if (!watch) {
        return res.status(404).json({ error: "Orologio non trovato" });
      }
      
      // Verifica se l'orologio è già stato venduto
      if (watch.isSold) {
        return res.status(400).json({ 
          error: "Questo orologio è già stato venduto" 
        });
      }

      const customer = await storage.getCustomer(result.data.customerId);
      if (!customer) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }

      const sale = await storage.createSale(result.data);
      await storage.updateCustomerTotalSpent(customer.id, result.data.salePrice);
      
      // Marca l'orologio come venduto invece di incrementare il contatore
      await storage.markWatchAsSold(watch.id);
      
      res.json(sale);
    } catch (error) {
      console.error("Errore nella creazione della vendita:", error);
      res.status(500).json({ error: "Impossibile creare la vendita" });
    }
  });

  // Price History
  app.get("/api/watches/:id/price-history", async (req, res) => {
    try {
      const priceHistory = await storage.getPriceHistory(parseInt(req.params.id));
      res.json(priceHistory);
    } catch (error) {
      console.error("Errore nel recupero della cronologia prezzi:", error);
      res.status(500).json({ error: "Errore del server nel recupero della cronologia prezzi" });
    }
  });

  // Utility endpoint per aggiornare orologi esistenti
  app.post("/api/admin/fix-watches", async (_req, res) => {
    try {
      const watches = await storage.getWatches();
      
      for (const watch of watches) {
        if (!watch.model || !watch.condition || !watch.movement || !watch.productCode) {
          await storage.updateWatch(watch.id, {
            model: watch.model || watch.brand || "Modello Sconosciuto",
            condition: watch.condition || "Buone",
            movement: watch.movement || "Automatico",
            productCode: watch.productCode || `MIG-${watch.id}`,
            addedAt: watch.addedAt || watch.purchaseDate || new Date(),
            accessories: watch.accessories || ""
          });
        }
      }
      
      res.json({ success: true, message: "Orologi aggiornati con successo" });
    } catch (error) {
      console.error("Errore nella correzione degli orologi:", error);
      res.status(500).json({ error: "Impossibile correggere gli orologi" });
    }
  });

  // Endpoint per correggere lo stato degli orologi venduti
  app.post("/api/admin/fix-sold-watches", async (_req, res) => {
    try {
      const allSales = await storage.getSales();
      const watchesSold = new Set(allSales.map(sale => sale.watchId));
      let updatedCount = 0;
      
      for (const watchId of watchesSold) {
        // Ottieni l'orologio
        const watch = await storage.getWatch(watchId);
        
        // Se l'orologio esiste e non è già marcato come venduto
        if (watch && !watch.isSold) {
          await storage.updateWatch(watchId, { isSold: true });
          updatedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `${updatedCount} orologi marcati come venduti su ${watchesSold.size} totali`
      });
    } catch (error) {
      console.error("Errore nell'aggiornamento dello stato degli orologi:", error);
      res.status(500).json({ error: "Impossibile aggiornare lo stato degli orologi" });
    }
  });

  // Endpoint per visualizzare tutti i dati del database
  app.get("/api/admin/database-view", async (_req, res) => {
    try {
      const allData = {
        watches: await storage.getWatches(),
        customers: await storage.getCustomers(),
        suppliers: await storage.getSuppliers(),
        sales: await storage.getSales()
      };
      
      res.json(allData);
    } catch (error) {
      console.error("Errore nel recupero dei dati:", error);
      res.status(500).json({ error: "Impossibile recuperare i dati del database" });
    }
  });

  // Endpoint per resettare il database
  app.post("/api/admin/reset-database", async (_req, res) => {
    try {
      // Elimina i dati nell'ordine corretto per rispettare le dipendenze
      await db.delete(sales);
      await db.delete(priceHistory);
      await db.delete(watches);
      await db.delete(customers);
      await db.delete(suppliers);
      
      res.json({ 
        success: true, 
        message: "Database resettato con successo. Tutte le tabelle sono state svuotate."
      });
    } catch (error) {
      console.error("Errore nel reset del database:", error);
      res.status(500).json({ error: "Impossibile resettare il database" });
    }
  });

  // Endpoint per importare clienti
  app.post("/api/admin/import-customers", async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "I dati devono essere un array" });
      }
      
      const results = {
        total: data.length,
        success: 0,
        errors: [],
      };
      
      // Importa i clienti uno per uno
      for (let i = 0; i < data.length; i++) {
        const customer = data[i];
        
        try {
          // Valida i dati usando lo schema
          const result = insertCustomerSchema.safeParse(customer);
          
          if (!result.success) {
            results.errors.push({
              row: i + 1,
              message: `Validazione fallita: ${result.error.message}`,
            });
            continue;
          }
          
          // Crea il cliente
          await storage.createCustomer(result.data);
          results.success++;
        } catch (error) {
          console.error(`Errore importando cliente alla riga ${i + 1}:`, error);
          results.errors.push({
            row: i + 1,
            message: `Errore: ${error.message || "Errore sconosciuto"}`,
          });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Errore nell'importazione dei clienti:", error);
      res.status(500).json({ error: "Impossibile importare i clienti" });
    }
  });

  // Endpoint per importare orologi
  app.post("/api/admin/import-watches", async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "I dati devono essere un array" });
      }
      
      const results = {
        total: data.length,
        success: 0,
        errors: [],
      };
      
      // Importa gli orologi uno per uno
      for (let i = 0; i < data.length; i++) {
        const watch = data[i];
        
        try {
          // Valida i dati usando lo schema
          const result = extendedWatchSchema.safeParse(watch);
          
          if (!result.success) {
            results.errors.push({
              row: i + 1,
              message: `Validazione fallita: ${result.error.message}`,
            });
            continue;
          }
          
          // Crea l'orologio
          await storage.createWatch(result.data);
          results.success++;
        } catch (error) {
          console.error(`Errore importando orologio alla riga ${i + 1}:`, error);
          results.errors.push({
            row: i + 1,
            message: `Errore: ${error.message || "Errore sconosciuto"}`,
          });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Errore nell'importazione degli orologi:", error);
      res.status(500).json({ error: "Impossibile importare gli orologi" });
    }
  });

  // Endpoint per importare fornitori
  app.post("/api/admin/import-suppliers", async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "I dati devono essere un array" });
      }
      
      const results = {
        total: data.length,
        success: 0,
        errors: [],
      };
      
      // Importa i fornitori uno per uno
      for (let i = 0; i < data.length; i++) {
        const supplier = data[i];
        
        try {
          // Valida i dati usando lo schema
          const result = insertSupplierSchema.safeParse(supplier);
          
          if (!result.success) {
            results.errors.push({
              row: i + 1,
              message: `Validazione fallita: ${result.error.message}`,
            });
            continue;
          }
          
          // Crea il fornitore
          await storage.createSupplier(result.data);
          results.success++;
        } catch (error) {
          console.error(`Errore importando fornitore alla riga ${i + 1}:`, error);
          results.errors.push({
            row: i + 1,
            message: `Errore: ${error.message || "Errore sconosciuto"}`,
          });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Errore nell'importazione dei fornitori:", error);
      res.status(500).json({ error: "Impossibile importare i fornitori" });
    }
  });

  // Endpoint per importare vendite
  app.post("/api/admin/import-sales", async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "I dati devono essere un array" });
      }
      
      const results = {
        total: data.length,
        success: 0,
        errors: [],
      };
      
      // Importa le vendite una per una
      for (let i = 0; i < data.length; i++) {
        const sale = data[i];
        
        try {
          // Valida i dati usando lo schema
          const result = insertSaleSchema.safeParse(sale);
          
          if (!result.success) {
            results.errors.push({
              row: i + 1,
              message: `Validazione fallita: ${result.error.message}`,
            });
            continue;
          }
          
          // Verifica se il cliente esiste
          const customer = await storage.getCustomer(result.data.customerId);
          if (!customer) {
            results.errors.push({
              row: i + 1,
              message: `Cliente non trovato con ID: ${result.data.customerId}`,
            });
            continue;
          }
          
          // Verifica se l'orologio esiste
          const watch = await storage.getWatch(result.data.watchId);
          if (!watch) {
            results.errors.push({
              row: i + 1,
              message: `Orologio non trovato con ID: ${result.data.watchId}`,
            });
            continue;
          }
          
          // Verifica se l'orologio è già stato venduto
          if (watch.isSold) {
            results.errors.push({
              row: i + 1,
              message: `L'orologio con ID ${result.data.watchId} è già stato venduto`,
            });
            continue;
          }
          
          // Crea la vendita
          await storage.createSale(result.data);
          
          // Aggiorna la spesa totale del cliente
          await storage.updateCustomerTotalSpent(customer.id, result.data.salePrice);
          
          // Marca l'orologio come venduto
          await storage.markWatchAsSold(watch.id);
          
          results.success++;
        } catch (error) {
          console.error(`Errore importando vendita alla riga ${i + 1}:`, error);
          results.errors.push({
            row: i + 1,
            message: `Errore: ${error.message || "Errore sconosciuto"}`,
          });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Errore nell'importazione delle vendite:", error);
      res.status(500).json({ error: "Impossibile importare le vendite" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}