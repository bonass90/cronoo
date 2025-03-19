import { Express } from "express";
import { db } from "../shared/db";
import { 
  productCategories, 
  categoryFields, 
  products, 
  productFieldValues,
  productSales,
  productCategorySchema,
  categoryFieldSchema,
  productSchema
} from "../shared/schema-dynamic";
import { eq, and, inArray } from "drizzle-orm";
import { slugify } from "./utils";

// Utilità per ottenere un prodotto completo con i suoi campi personalizzati
async function getProductWithCustomFields(productId: number) {
  // Ottieni il prodotto base
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  
  if (!product) return null;
  
  // Ottieni la categoria
  const [category] = await db.select().from(productCategories)
    .where(eq(productCategories.id, product.categoryId));
  
  // Ottieni le definizioni dei campi
  const fieldDefinitions = await db.select().from(categoryFields)
    .where(eq(categoryFields.categoryId, product.categoryId))
    .orderBy(categoryFields.displayOrder);
  
  // Ottieni i valori dei campi personalizzati
  const fieldValues = await db.select().from(productFieldValues)
    .where(eq(productFieldValues.productId, productId));
  
  // Costruisci l'oggetto customFields
  const customFields: Record<string, string> = {};
  for (const fieldValue of fieldValues) {
    const fieldDef = fieldDefinitions.find(f => f.id === fieldValue.fieldId);
    if (fieldDef) {
      customFields[fieldDef.slug] = fieldValue.value;
    }
  }
  
  return {
    ...product,
    customFields,
    category,
    fieldDefinitions
  };
}

export function registerDynamicProductRoutes(app: Express) {
  // ----- CATEGORIE PRODOTTI -----
  
  // Ottieni tutte le categorie
  app.get("/api/product-categories", async (_req, res) => {
    try {
      const categories = await db.select().from(productCategories);
      res.json(categories);
    } catch (error) {
      console.error("Errore nel recupero delle categorie:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Crea una nuova categoria
  app.post("/api/product-categories", async (req, res) => {
    try {
      const validationResult = productCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error });
      }
      
      const { name, icon } = validationResult.data;
      
      // Genera lo slug dalla name
      const slug = slugify(name);
      
      // Verifica che lo slug sia unico
      const existing = await db.select()
        .from(productCategories)
        .where(eq(productCategories.slug, slug));
      
      if (existing.length > 0) {
        return res.status(400).json({ error: "Una categoria con questo nome esiste già" });
      }
      
      // Crea la categoria
      const [newCategory] = await db.insert(productCategories)
        .values({
          name,
          slug,
          icon,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      res.json(newCategory);
    } catch (error) {
      console.error("Errore nella creazione della categoria:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Ottieni una singola categoria con i suoi campi
  app.get("/api/product-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Ottieni la categoria
      const [category] = await db.select()
        .from(productCategories)
        .where(eq(productCategories.id, id));
      
      if (!category) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }
      
      // Ottieni i campi della categoria
      const fields = await db.select()
        .from(categoryFields)
        .where(eq(categoryFields.categoryId, id))
        .orderBy(categoryFields.displayOrder);
      
      res.json({ ...category, fields });
    } catch (error) {
      console.error("Errore nel recupero della categoria:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Aggiorna una categoria
  app.put("/api/product-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verifica che la categoria esista
      const [category] = await db.select()
        .from(productCategories)
        .where(eq(productCategories.id, id));
      
      if (!category) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }
      
      const validationResult = productCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error });
      }
      
      const { name, icon } = validationResult.data;
      
      // Genera lo slug dalla name
      const slug = slugify(name);
      
      // Verifica che lo slug sia unico (escludi la categoria corrente)
      const existing = await db.select()
        .from(productCategories)
        .where(and(
          eq(productCategories.slug, slug),
          (b => b.not(eq(productCategories.id, id)))
        ));
      
      if (existing.length > 0) {
        return res.status(400).json({ error: "Una categoria con questo nome esiste già" });
      }
      
      // Aggiorna la categoria
      const [updatedCategory] = await db.update(productCategories)
        .set({
          name,
          slug,
          icon,
          updatedAt: new Date(),
        })
        .where(eq(productCategories.id, id))
        .returning();
      
      res.json(updatedCategory);
    } catch (error) {
      console.error("Errore nell'aggiornamento della categoria:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Elimina una categoria (e tutti i suoi campi)
  app.delete("/api/product-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verifica che la categoria esista
      const [category] = await db.select()
        .from(productCategories)
        .where(eq(productCategories.id, id));
      
      if (!category) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }
      
      // Controlla se ci sono prodotti associati a questa categoria
      const productsCount = await db.select({ count: products.id })
        .from(products)
        .where(eq(products.categoryId, id));
      
      if (productsCount.length > 0 && productsCount[0].count > 0) {
        return res.status(400).json({ 
          error: "Impossibile eliminare la categoria: esistono prodotti associati" 
        });
      }
      
      // Elimina i campi della categoria
      await db.delete(categoryFields)
        .where(eq(categoryFields.categoryId, id));
      
      // Elimina la categoria
      await db.delete(productCategories)
        .where(eq(productCategories.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Errore nell'eliminazione della categoria:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // ----- CAMPI DELLE CATEGORIE -----
  
  // Ottieni tutti i campi per una categoria
  app.get("/api/product-categories/:categoryId/fields", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      // Verifica che la categoria esista
      const [category] = await db.select()
        .from(productCategories)
        .where(eq(productCategories.id, categoryId));
      
      if (!category) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }
      
      // Ottieni i campi della categoria
      const fields = await db.select()
        .from(categoryFields)
        .where(eq(categoryFields.categoryId, categoryId))
        .orderBy(categoryFields.displayOrder);
      
      res.json(fields);
    } catch (error) {
      console.error("Errore nel recupero dei campi:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Crea un nuovo campo per una categoria
  app.post("/api/product-categories/:categoryId/fields", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      // Verifica che la categoria esista
      const [category] = await db.select()
        .from(productCategories)
        .where(eq(productCategories.id, categoryId));
      
      if (!category) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }
      
      const validationResult = categoryFieldSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error });
      }
      
      const { name, label, type, isRequired, options, displayOrder, showInTable, showInGraph } = validationResult.data;
      
      // Genera lo slug dal nome
      const slug = slugify(name);
      
      // Verifica che lo slug sia unico per questa categoria
      const existing = await db.select()
        .from(categoryFields)
        .where(and(
          eq(categoryFields.categoryId, categoryId),
          eq(categoryFields.slug, slug)
        ));
      
      if (existing.length > 0) {
        return res.status(400).json({ 
          error: "Un campo con questo nome esiste già in questa categoria" 
        });
      }
      
      // Ottieni l'ordine più alto attuale per posizionare il nuovo campo in fondo
      const maxOrderResult = await db.select({
        maxOrder: (q => q.fn.max(categoryFields.displayOrder))
      })
      .from(categoryFields)
      .where(eq(categoryFields.categoryId, categoryId));
      
      const maxOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;
      
      // Crea il campo
      const [newField] = await db.insert(categoryFields)
        .values({
          categoryId,
          name,
          slug,
          label,
          type,
          isRequired,
          options,
          displayOrder: displayOrder || maxOrder,
          showInTable,
          showInGraph
        })
        .returning();
      
      res.json(newField);
    } catch (error) {
      console.error("Errore nella creazione del campo:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Aggiorna un campo
  app.put("/api/category-fields/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verifica che il campo esista
      const [field] = await db.select()
        .from(categoryFields)
        .where(eq(categoryFields.id, id));
      
      if (!field) {
        return res.status(404).json({ error: "Campo non trovato" });
      }
      
      const validationResult = categoryFieldSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error });
      }
      
      const { name, label, type, isRequired, options, displayOrder, showInTable, showInGraph } = validationResult.data;
      
      // Genera lo slug dal nome
      const slug = slugify(name);
      
      // Verifica che lo slug sia unico per questa categoria (escludi il campo corrente)
      const existing = await db.select()
        .from(categoryFields)
        .where(and(
          eq(categoryFields.categoryId, field.categoryId),
          eq(categoryFields.slug, slug),
          (b => b.not(eq(categoryFields.id, id)))
        ));
      
      if (existing.length > 0) {
        return res.status(400).json({ 
          error: "Un campo con questo nome esiste già in questa categoria" 
        });
      }
      
      // Aggiorna il campo
      const [updatedField] = await db.update(categoryFields)
        .set({
          name,
          slug,
          label,
          type,
          isRequired,
          options,
          displayOrder,
          showInTable,
          showInGraph
        })
        .where(eq(categoryFields.id, id))
        .returning();
      
      res.json(updatedField);
    } catch (error) {
      console.error("Errore nell'aggiornamento del campo:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Elimina un campo
  app.delete("/api/category-fields/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verifica che il campo esista
      const [field] = await db.select()
        .from(categoryFields)
        .where(eq(categoryFields.id, id));
      
      if (!field) {
        return res.status(404).json({ error: "Campo non trovato" });
      }
      
      // Elimina i valori del campo per tutti i prodotti
      await db.delete(productFieldValues)
        .where(eq(productFieldValues.fieldId, id));
      
      // Elimina il campo
      await db.delete(categoryFields)
        .where(eq(categoryFields.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Errore nell'eliminazione del campo:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Aggiorna l'ordine dei campi
  app.put("/api/product-categories/:categoryId/fields/reorder", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const { fieldIds } = req.body; // array di ID dei campi nell'ordine desiderato
      
      if (!Array.isArray(fieldIds)) {
        return res.status(400).json({ error: "fieldIds deve essere un array" });
      }
      
      // Verifica che la categoria esista
      const [category] = await db.select()
        .from(productCategories)
        .where(eq(productCategories.id, categoryId));
      
      if (!category) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }
      
      // Verifica che tutti i campi esistano e appartengano alla categoria
      const fieldsToUpdate = await db.select()
        .from(categoryFields)
        .where(and(
          eq(categoryFields.categoryId, categoryId),
          inArray(categoryFields.id, fieldIds)
        ));
      
      if (fieldsToUpdate.length !== fieldIds.length) {
        return res.status(400).json({ 
          error: "Alcuni campi non esistono o non appartengono a questa categoria" 
        });
      }
      
      // Aggiorna l'ordine dei campi
      for (let i = 0; i < fieldIds.length; i++) {
        await db.update(categoryFields)
          .set({ displayOrder: i })
          .where(eq(categoryFields.id, fieldIds[i]));
      }
      
      // Restituisci i campi aggiornati
      const updatedFields = await db.select()
        .from(categoryFields)
        .where(eq(categoryFields.categoryId, categoryId))
        .orderBy(categoryFields.displayOrder);
      
      res.json(updatedFields);
    } catch (error) {
      console.error("Errore nell'aggiornamento dell'ordine dei campi:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // ----- PRODOTTI -----
  
  // Ottieni tutti i prodotti (con filtri)
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, sold } = req.query;
      
      // Costruisci la query base
      let query = db.select().from(products);
      
      // Applica i filtri
      if (categoryId) {
        query = query.where(eq(products.categoryId, parseInt(categoryId as string)));
      }
      
      if (sold === 'true') {
        query = query.where(eq(products.isSold, true));
      } else if (sold === 'false') {
        query = query.where(eq(products.isSold, false));
      }
      
      const productsList = await query;
      
      // Per ogni prodotto, ottieni i suoi campi personalizzati
      const productsWithFields = await Promise.all(
        productsList.map(async product => await getProductWithCustomFields(product.id))
      );
      
      res.json(productsWithFields.filter(Boolean)); // Filtra gli undefined/null
    } catch (error) {
      console.error("Errore nel recupero dei prodotti:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Ottieni un singolo prodotto con tutti i suoi campi
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const product = await getProductWithCustomFields(id);
      
      if (!product) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Errore nel recupero del prodotto:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Crea un nuovo prodotto
  app.post("/api/products", async (req, res) => {
    try {
      const { categoryId, customFields, ...productData } = req.body;
      
      // Valida i dati base del prodotto
      const validationResult = productSchema.safeParse({
        categoryId,
        ...productData
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error });
      }
      
      // Verifica che la categoria esista
      const [category] = await db.select()
        .from(productCategories)
        .where(eq(productCategories.id, categoryId));
      
      if (!category) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }
      
      // Ottieni i campi della categoria
      const fields = await db.select()
        .from(categoryFields)
        .where(eq(categoryFields.categoryId, categoryId));
      
      // Valida i campi personalizzati
      for (const field of fields) {
        if (field.isRequired && (!customFields || !customFields[field.slug])) {
          return res.status(400).json({ 
            error: `Il campo ${field.label} è obbligatorio` 
          });
        }
      }
      
      // Genera un codice prodotto unico
      const prefix = category.name.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().substring(7);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const productCode = `${prefix}-${timestamp}${random}`;
      
      // Crea il prodotto base
      const [newProduct] = await db.insert(products)
        .values({
          ...validationResult.data,
          productCode,
          addedAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      // Crea i valori dei campi personalizzati
      if (customFields && Object.keys(customFields).length > 0) {
        const fieldValues = [];
        
        for (const field of fields) {
          if (customFields[field.slug] !== undefined) {
            fieldValues.push({
              productId: newProduct.id,
              fieldId: field.id,
              value: String(customFields[field.slug])
            });
          }
        }
        
        if (fieldValues.length > 0) {
          await db.insert(productFieldValues).values(fieldValues);
        }
      }
      
      // Restituisci il prodotto completo
      const productWithFields = await getProductWithCustomFields(newProduct.id);
      
      res.json(productWithFields);
    } catch (error) {
      console.error("Errore nella creazione del prodotto:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Aggiorna un prodotto
  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { customFields, ...productData } = req.body;
      
      // Verifica che il prodotto esista
      const [existingProduct] = await db.select()
        .from(products)
        .where(eq(products.id, id));
      
      if (!existingProduct) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }
      
      // Se il prodotto è venduto, limita i campi che possono essere aggiornati
      if (existingProduct.isSold) {
        // Forse vuoi permettere solo l'aggiornamento di alcuni campi specifici
        // o restituire un errore
        // return res.status(400).json({ error: "Non è possibile modificare un prodotto venduto" });
      }
      
      // Valida i dati base del prodotto (mantieni la categoria originale)
      const validationResult = productSchema.safeParse({
        categoryId: existingProduct.categoryId, // Non permettere il cambio di categoria
        ...productData
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error });
      }
      
      // Ottieni i campi della categoria
      const fields = await db.select()
        .from(categoryFields)
        .where(eq(categoryFields.categoryId, existingProduct.categoryId));
      
      // Valida i campi personalizzati
      for (const field of fields) {
        if (field.isRequired && (!customFields || !customFields[field.slug])) {
          return res.status(400).json({
            error: `Il campo ${field.label} è obbligatorio`
          });
        }
      }
      
      // Aggiorna il prodotto base
      const [updatedProduct] = await db.update(products)
        .set({
          ...validationResult.data,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();
      
      // Aggiorna i valori dei campi personalizzati
      if (customFields && Object.keys(customFields).length > 0) {
        for (const field of fields) {
          if (customFields[field.slug] !== undefined) {
            // Controlla se il valore esiste già
            const [existingValue] = await db.select()
              .from(productFieldValues)
              .where(and(
                eq(productFieldValues.productId, id),
                eq(productFieldValues.fieldId, field.id)
              ));
            
            if (existingValue) {
              // Aggiorna il valore esistente
              await db.update(productFieldValues)
                .set({ value: String(customFields[field.slug]) })
                .where(eq(productFieldValues.id, existingValue.id));
            } else {
              // Crea un nuovo valore
              await db.insert(productFieldValues)
                .values({
                  productId: id,
                  fieldId: field.id,
                  value: String(customFields[field.slug])
                });
            }
          }
        }
      }
      
      // Restituisci il prodotto aggiornato completo
      const productWithFields = await getProductWithCustomFields(id);
      
      res.json(productWithFields);
    } catch (error) {
      console.error("Errore nell'aggiornamento del prodotto:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Elimina un prodotto
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verifica che il prodotto esista
      const [product] = await db.select()
        .from(products)
        .where(eq(products.id, id));
      
      if (!product) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }
      
      // Controlla se ci sono vendite associate al prodotto
      const salesCheck = await db.select().from(productSales)
        .where(eq(productSales.productId, id));
      
      if (salesCheck.length > 0) {
        return res.status(400).json({
          error: "Impossibile eliminare un prodotto con vendite associate"
        });
      }
      
      // Elimina i valori dei campi personalizzati
      await db.delete(productFieldValues)
        .where(eq(productFieldValues.productId, id));
      
      // Elimina il prodotto
      await db.delete(products)
        .where(eq(products.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Errore nell'eliminazione del prodotto:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Marca un prodotto come venduto
  app.patch("/api/products/:id/sold", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { customerId, salePrice, saleDate, notes } = req.body;
      
      // Verifica che il prodotto esista
      const [product] = await db.select()
        .from(products)
        .where(eq(products.id, id));
      
      if (!product) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }
      
      // Verifica che il prodotto non sia già venduto
      if (product.isSold) {
        return res.status(400).json({ error: "Il prodotto è già stato venduto" });
      }
      
      // Valida i dati di vendita
      if (!customerId || !salePrice) {
        return res.status(400).json({ error: "Cliente e prezzo di vendita sono obbligatori" });
      }
      
      // Crea la registrazione di vendita
      await db.insert(productSales)
        .values({
          productId: id,
          customerId,
          salePrice,
          saleDate: saleDate ? new Date(saleDate) : new Date(),
          notes: notes || ""
        });
      
      // Aggiorna lo stato del prodotto
      const [updatedProduct] = await db.update(products)
        .set({
          isSold: true,
          sold: product.sold + 1,
          updatedAt: new Date()
        })
        .where(eq(products.id, id))
        .returning();
      
      // Restituisci il prodotto aggiornato completo
      const productWithFields = await getProductWithCustomFields(id);
      
      res.json(productWithFields);
    } catch (error) {
      console.error("Errore nel marcare il prodotto come venduto:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Ottieni le vendite di un prodotto
  app.get("/api/products/:id/sales", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verifica che il prodotto esista
      const [product] = await db.select()
        .from(products)
        .where(eq(products.id, id));
      
      if (!product) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }
      
      // Ottieni le vendite del prodotto
      const sales = await db.select()
        .from(productSales)
        .where(eq(productSales.productId, id));
      
      res.json(sales);
    } catch (error) {
      console.error("Errore nel recupero delle vendite:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Endpoint per importazione da CSV
  app.post("/api/products/import", async (req, res) => {
    try {
      const { categoryId, mappings, data } = req.body;
      
      if (!categoryId || !mappings || !data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Dati non validi per l'importazione" });
      }
      
      // Verifica che la categoria esista
      const [category] = await db.select()
        .from(productCategories)
        .where(eq(productCategories.id, categoryId));
      
      if (!category) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }
      
      // Ottieni i campi della categoria
      const fields = await db.select()
        .from(categoryFields)
        .where(eq(categoryFields.categoryId, categoryId));
      
      const results = {
        total: data.length,
        success: 0,
        failures: [],
      };
      
      // Processa ogni riga
      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          const productData: any = {
            categoryId,
            name: "",
            purchasePrice: "0",
            sellingPrice: "0",
            purchaseDate: new Date(),
            condition: "Nuovo",
          };
          
          const customFields: Record<string, string> = {};
          
          // Mappa i campi in base alle mappature fornite
          for (const [fieldSlug, csvColumn] of Object.entries(mappings)) {
            // Ignora le mappature vuote
            if (!csvColumn) continue;
            
            const value = row[csvColumn];
            
            // Gestisci i campi base del prodotto
            if (fieldSlug === "name") productData.name = value;
            else if (fieldSlug === "purchasePrice") productData.purchasePrice = value;
            else if (fieldSlug === "sellingPrice") productData.sellingPrice = value;
            else if (fieldSlug === "purchaseDate") {
              try {
                productData.purchaseDate = new Date(value);
              } catch (e) {
                productData.purchaseDate = new Date();
              }
            }
            else if (fieldSlug === "condition") productData.condition = value;
            else if (fieldSlug === "description") productData.description = value;
            else if (fieldSlug === "supplierId") {
              if (value) productData.supplierId = parseInt(value);
            }
            // Gestisci i campi personalizzati
            else {
              const field = fields.find(f => f.slug === fieldSlug);
              if (field) {
                customFields[fieldSlug] = value;
              }
            }
          }
          
          // Controlla che i campi obbligatori siano presenti
          if (!productData.name) {
            results.failures.push({
              row: i + 1,
              error: "Nome prodotto mancante"
            });
            continue;
          }
          
          // Genera un codice prodotto unico
          const prefix = category.name.substring(0, 3).toUpperCase();
          const timestamp = Date.now().toString().substring(7);
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const productCode = `${prefix}-${timestamp}${random}-${i}`;
          
          // Crea il prodotto base
          const [newProduct] = await db.insert(products)
            .values({
              ...productData,
              productCode,
              addedAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          
          // Crea i valori dei campi personalizzati
          const fieldValues = [];
          
          for (const field of fields) {
            if (customFields[field.slug] !== undefined) {
              fieldValues.push({
                productId: newProduct.id,
                fieldId: field.id,
                value: String(customFields[field.slug])
              });
            }
          }
          
          if (fieldValues.length > 0) {
            await db.insert(productFieldValues).values(fieldValues);
          }
          
          results.success++;
        } catch (error) {
          console.error(`Errore importando riga ${i + 1}:`, error);
          results.failures.push({
            row: i + 1,
            error: error.message || "Errore sconosciuto"
          });
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Errore nell'importazione:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
  
  // Endpoint per le statistiche (per dashboard)
  app.get("/api/products/stats", async (req, res) => {
    try {
      const { categoryId, field, period } = req.query;
      
      // Validazione
      if (!categoryId || !field) {
        return res.status(400).json({ error: "Categoria e campo sono obbligatori" });
      }
      
      // Verifica che la categoria esista
      const [category] = await db.select()
        .from(productCategories)
        .where(eq(productCategories.id, parseInt(categoryId as string)));
      
      if (!category) {
        return res.status(404).json({ error: "Categoria non trovata" });
      }
      
      // Trova l'ID del campo richiesto
      const [fieldInfo] = await db.select()
        .from(categoryFields)
        .where(and(
          eq(categoryFields.categoryId, parseInt(categoryId as string)),
          eq(categoryFields.slug, field as string)
        ));
      
      if (!fieldInfo) {
        return res.status(404).json({ error: "Campo non trovato" });
      }
      
      // Ottieni i prodotti venduti della categoria specificata
      const soldProducts = await db.select()
        .from(products)
        .where(and(
          eq(products.categoryId, parseInt(categoryId as string)),
          eq(products.isSold, true)
        ));
      
      if (soldProducts.length === 0) {
        return res.json([]);
      }
      
      // Ottieni i valori dei campi per questi prodotti
      const productIds = soldProducts.map(p => p.id);
      const fieldValues = await db.select()
        .from(productFieldValues)
        .where(and(
          inArray(productFieldValues.productId, productIds),
          eq(productFieldValues.fieldId, fieldInfo.id)
        ));
      
      // Raggruppa e conta i valori
      const valueCount: Record<string, number> = {};
      for (const fieldValue of fieldValues) {
        const value = fieldValue.value || "N/A";
        valueCount[value] = (valueCount[value] || 0) + 1;
      }
      
      // Formatta i risultati
      const results = Object.entries(valueCount).map(([value, count]) => ({
        value,
        count,
      }));
      
      res.json(results);
    } catch (error) {
      console.error("Errore nel recupero delle statistiche:", error);
      res.status(500).json({ error: "Errore del server" });
    }
  });
}