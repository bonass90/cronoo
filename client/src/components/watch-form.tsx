// File: client/src/components/watch-form.tsx

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Aggiungi import per Textarea
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function WatchForm({ 
  onSuccess, 
  initialData = null, 
  mode = "create" // "create", "edit", "duplicate"
}: { 
  onSuccess: () => void, 
  initialData?: any, 
  mode?: string
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState("base"); // "base", "details", "commercial", "supplier"
  
  const defaultValues = {
    brand: "",
    model: "",
    reference: "",
    serialNumber: "",
    year: "",
    condition: "Nuovo",
    caseMaterial: "Acciaio",
    braceletMaterial: "Acciaio",
    caseSize: "40",
    dialColor: "Nero",
    movement: "Automatico",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: "",
    sellingPrice: "",
    accessories: "", // Nuovo campo corredo
    // Campi fornitore
    supplierName: "",
    supplierSurname: "",
    supplierDocument: "",
    supplierPhone: "",
    supplierEmail: "",
    supplierNotes: "",
  };

  const form = useForm({
    defaultValues: initialData ? {
      ...defaultValues,
      ...initialData,
      year: initialData.year?.toString() || "",
      caseSize: initialData.caseSize?.toString() || "40",
      purchaseDate: initialData.purchaseDate ? new Date(initialData.purchaseDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      purchasePrice: initialData.purchasePrice?.toString() || "",
      sellingPrice: initialData.sellingPrice?.toString() || "",
      accessories: initialData.accessories || "", // Inizializza il campo corredo
    } : defaultValues
  });

  // Generate product code when brand changes
  useEffect(() => {
    if (mode === "create" || mode === "duplicate") {
      const subscription = form.watch((value) => {
        if (value.brand && !form.getValues("productCode")) {
          const prefix = value.brand.substring(0, 3).toUpperCase();
          const timestamp = Date.now().toString().substring(7);
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          form.setValue("productCode", `${prefix}-${timestamp}${random}`);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, mode]);

  async function onSubmit(data) {
    try {
      // Genera un codice prodotto basato sulla marca se necessario
      if (!data.productCode) {
        const prefix = data.brand.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString().substring(7);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        data.productCode = `${prefix}-${timestamp}${random}`;
      }
      
      // Gestisci i dati del fornitore se presenti
      let supplierId = null;
      if (data.supplierName && data.supplierSurname) {
        try {
          // Crea un nuovo fornitore
          const supplierData = {
            name: data.supplierName,
            surname: data.supplierSurname,
            document: data.supplierDocument || "",
            phone: data.supplierPhone || "",
            email: data.supplierEmail || "",
            notes: data.supplierNotes || "",
          };
          
          const supplierResponse = await apiRequest("POST", "/api/suppliers", supplierData);
          const newSupplier = await supplierResponse.json();
          supplierId = newSupplier.id;
        } catch (error) {
          console.error("Errore nella creazione del fornitore:", error);
          toast({
            title: "Error",
            description: "Impossibile salvare i dati del fornitore",
            variant: "destructive",
          });
          // Continua comunque con il salvataggio dell'orologio
        }
      }
      
      const formattedData = {
        ...data,
        productCode: data.productCode,
        year: data.year ? Number(data.year) : null,
        caseSize: Number(data.caseSize),
        purchasePrice: data.purchasePrice.toString(),
        sellingPrice: data.sellingPrice.toString(),
        purchaseDate: new Date(data.purchaseDate).toISOString(),
        accessories: data.accessories || "", // Assicurati che il campo corredo sia incluso
        supplierId: supplierId, // Aggiungi l'ID del fornitore se esiste
      };
      
      // Rimuovi i campi del fornitore dall'oggetto dell'orologio
      delete formattedData.supplierName;
      delete formattedData.supplierSurname;
      delete formattedData.supplierDocument;
      delete formattedData.supplierPhone;
      delete formattedData.supplierEmail;
      delete formattedData.supplierNotes;
      
      if (mode === "edit" && initialData?.id) {
        // Qui è il problema: stiamo facendo POST invece di PUT/PATCH
        await apiRequest("PUT", `/api/watches/${initialData.id}`, formattedData);
        toast({
          title: "Success",
          description: "Orologio aggiornato con successo",
        });
      } else {
        await apiRequest("POST", "/api/watches", formattedData);
        toast({
          title: "Success",
          description: "Orologio aggiunto con successo",
        });
      }
      
      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Errore nella sottomissione:", error);
      toast({
        title: "Error",
        description: "Impossibile salvare l'orologio",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex mb-4 border-b overflow-x-auto">
        <button 
          className={`px-4 py-2 ${tab === "base" ? "font-bold border-b-2 border-blue-500" : ""}`}
          onClick={() => setTab("base")}
          type="button"
        >
          Informazioni Base
        </button>
        <button 
          className={`px-4 py-2 ${tab === "details" ? "font-bold border-b-2 border-blue-500" : ""}`}
          onClick={() => setTab("details")}
          type="button"
        >
          Dettagli Tecnici
        </button>
        <button 
          className={`px-4 py-2 ${tab === "commercial" ? "font-bold border-b-2 border-blue-500" : ""}`}
          onClick={() => setTab("commercial")}
          type="button"
        >
          Info Commerciali
        </button>
        <button 
          className={`px-4 py-2 ${tab === "supplier" ? "font-bold border-b-2 border-blue-500" : ""}`}
          onClick={() => setTab("supplier")}
          type="button"
        >
          Dati Fornitore
        </button>
      </div>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {tab === "base" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Marca</label>
              <Input {...form.register("brand")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Modello</label>
              <Input {...form.register("model")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Referenza</label>
              <Input {...form.register("reference")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Numero Seriale</label>
              <Input {...form.register("serialNumber")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Anno</label>
              <Input type="number" {...form.register("year")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Condizioni</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("condition")}
              >
                <option value="Nuovo">Nuovo</option>
                <option value="Mai indossato">Mai indossato</option>
                <option value="Eccellenti">Eccellenti</option>
                <option value="Ottime">Ottime</option>
                <option value="Buone">Buone</option>
                <option value="Discrete">Discrete</option>
                <option value="Da revisionare">Da revisionare</option>
              </select>
            </div>

            {/* Codice Prodotto (solo visualizzazione) */}
            <div>
              <label className="block text-sm font-medium mb-1">Codice Prodotto</label>
              <Input {...form.register("productCode")} readOnly className="bg-muted" />
            </div>
            
            {/* Nuovo campo corredo */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Corredo</label>
              <Textarea 
                {...form.register("accessories")} 
                placeholder="Scatola, documenti, garanzia, ecc."
                className="min-h-[80px]"
              />
            </div>
          </div>
        )}

        {tab === "details" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Materiale Cassa</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("caseMaterial")}
              >
                <option value="Acciaio">Acciaio</option>
                <option value="Oro Giallo">Oro Giallo</option>
                <option value="Oro Rosa">Oro Rosa</option>
                <option value="Oro Bianco">Oro Bianco</option>
                <option value="Platino">Platino</option>
                <option value="Titanio">Titanio</option>
                <option value="Ceramica">Ceramica</option>
                <option value="Tantalio">Tantalio</option>
                <option value="Carbonio">Carbonio</option>
                <option value="Alluminio">Alluminio</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Materiale Bracciale</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("braceletMaterial")}
              >
                <option value="Acciaio">Acciaio</option>
                <option value="Oro Giallo">Oro Giallo</option>
                <option value="Oro Rosa">Oro Rosa</option>
                <option value="Oro Bianco">Oro Bianco</option>
                <option value="Platino">Platino</option>
                <option value="Titanio">Titanio</option>
                <option value="Ceramica">Ceramica</option>
                <option value="Tantalio">Tantalio</option>
                <option value="Carbonio">Carbonio</option>
                <option value="Alluminio">Alluminio</option>
                <option value="Pelle">Pelle</option>
                <option value="Caucciù">Caucciù</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Diametro Cassa (mm)</label>
              <Input type="number" defaultValue="40" {...form.register("caseSize")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Colore Quadrante</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("dialColor")}
              >
                <option value="Nero">Nero</option>
                <option value="Bianco">Bianco</option>
                <option value="Blu">Blu</option>
                <option value="Verde">Verde</option>
                <option value="Argento">Argento</option>
                <option value="Oro">Oro</option>
                <option value="Grigio">Grigio</option>
                <option value="Marrone">Marrone</option>
                <option value="Champagne">Champagne</option>
                <option value="Rosso">Rosso</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Movimento</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("movement")}
              >
                <option value="Automatico">Automatico</option>
                <option value="Manuale">Manuale</option>
                <option value="Quarzo">Quarzo</option>
                <option value="Cronografo automatico">Cronografo automatico</option>
                <option value="Cronografo manuale">Cronografo manuale</option>
                <option value="Cronografo al quarzo">Cronografo al quarzo</option>
              </select>
            </div>
          </div>
        )}

        {tab === "commercial" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data di Acquisto</label>
              <Input type="date" {...form.register("purchaseDate")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Prezzo di Acquisto</label>
              <Input type="number" step="0.01" {...form.register("purchasePrice")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Prezzo di Vendita</label>
              <Input type="number" step="0.01" {...form.register("sellingPrice")} />
            </div>
          </div>
        )}
        
        {tab === "supplier" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome Fornitore</label>
              <Input {...form.register("supplierName")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Cognome Fornitore</label>
              <Input {...form.register("supplierSurname")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Documento</label>
              <Input {...form.register("supplierDocument")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Telefono</label>
              <Input type="tel" {...form.register("supplierPhone")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input type="email" {...form.register("supplierEmail")} />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Note</label>
              <Textarea 
                {...form.register("supplierNotes")} 
                placeholder="Informazioni aggiuntive sul fornitore"
                className="min-h-[80px]"
              />
            </div>
          </div>
        )}

        <Button type="submit" className="w-full">
          {mode === "edit" ? "Aggiorna Orologio" : "Aggiungi Orologio"}
        </Button>
      </form>
    </div>
  );
}