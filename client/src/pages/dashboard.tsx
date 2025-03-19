import { useQuery } from "@tanstack/react-query";
import type { Customer, Sale, Watch, Supplier } from "@shared/schema";
import MetricsCards from "@/components/analytics/metrics-cards";
import SalesChart from "@/components/analytics/sales-chart";
import SalesHistoryChart from "@/components/analytics/sales-history-chart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { subDays, format, parseISO } from "date-fns";

export default function Dashboard() {
  const { toast } = useToast();
  
  const { data: watches } = useQuery<Watch[]>({ 
    queryKey: ["/api/watches"]
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"]
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"]
  });

  // Prepare data for analytics
  const watchesByCaseSize = watches?.reduce((acc: Record<number, number>, watch) => {
    acc[watch.caseSize] = (acc[watch.caseSize] || 0) + watch.sold;
    return acc;
  }, {});

  const watchesByDialColor = watches?.reduce((acc: Record<string, number>, watch) => {
    acc[watch.dialColor] = (acc[watch.dialColor] || 0) + watch.sold;
    return acc;
  }, {});

  // Transform data for charts
  const caseSizeData = watchesByCaseSize ? 
    Object.entries(watchesByCaseSize).map(([size, count]) => ({
      size: `${size}mm`,
      sales: count
    })) : [];

  const dialColorData = watchesByDialColor ?
    Object.entries(watchesByDialColor).map(([color, count]) => ({
      color,
      sales: count
    })) : [];

  // Calculate total revenue and costs
  const totalRevenue = sales?.reduce((sum, sale) => sum + Number(sale.salePrice), 0) || 0;
  const totalCosts = watches?.reduce((sum, watch) => sum + Number(watch.purchasePrice) * watch.sold, 0) || 0;
  const totalProfit = totalRevenue - totalCosts;

  // Funzione per caricare dati fittizi
  const loadDemoData = async () => {
    if (!window.confirm("Vuoi caricare dati dimostrativi? Questo aggiungerà clienti, orologi e vendite fittizie al database.")) {
      return;
    }

    try {
      // Prima aggiungiamo i fornitori
      const suppliers = [
        { name: "Giorgio", surname: "Bianchi", document: "CI28374AH", phone: "3451234567", email: "giorgio@example.com", notes: "Fornitore storico di Rolex" },
        { name: "Fabio", surname: "Verdi", document: "PT9823751", phone: "3357654321", email: "fabio@example.com", notes: "Specializzato in orologi vintage" }
      ];

      for (const supplier of suppliers) {
        await apiRequest("POST", "/api/suppliers", supplier);
      }

      // Poi aggiungiamo i clienti
      const customers = [
        { firstName: "Marco", lastName: "Rossi", address: "Via Roma 123, Milano" },
        { firstName: "Laura", lastName: "Bianchi", address: "Corso Italia 45, Roma" },
        { firstName: "Giovanni", lastName: "Verdi", address: "Via Mazzini 67, Napoli" },
        { firstName: "Anna", lastName: "Neri", address: "Piazza Garibaldi 12, Torino" },
        { firstName: "Paolo", lastName: "Gialli", address: "Via Dante 89, Firenze" }
      ];

      for (const customer of customers) {
        await apiRequest("POST", "/api/customers", customer);
      }

      // Otteniamo i dati dei fornitori e clienti per i riferimenti
      const suppliersData = await (await fetch("/api/suppliers")).json();
      const customersData = await (await fetch("/api/customers")).json();

      // Generiamo date passate per le vendite fittizie
      const now = new Date();
      const past1Year = new Date(now);
      past1Year.setFullYear(now.getFullYear() - 1);

      // Funzione per generare date casuali tra due date
      const randomDate = (start: Date, end: Date) => {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      };

      // Aggiungiamo orologi
      const watches = [
        {
          brand: "Rolex",
          model: "Submariner",
          reference: "126610LN",
          serialNumber: "7DK92751",
          year: 2023,
          condition: "Nuovo",
          caseMaterial: "Acciaio",
          braceletMaterial: "Acciaio",
          caseSize: 41,
          dialColor: "Nero",
          movement: "Automatico",
          purchaseDate: randomDate(past1Year, now).toISOString(),
          purchasePrice: "12000",
          sellingPrice: "14500",
          accessories: "Scatola e garanzia",
          supplierId: suppliersData[0].id
        },
        {
          brand: "Patek Philippe",
          model: "Nautilus",
          reference: "5711/1A-010",
          serialNumber: "58934623",
          year: 2021,
          condition: "Eccellenti",
          caseMaterial: "Acciaio",
          braceletMaterial: "Acciaio",
          caseSize: 40,
          dialColor: "Blu",
          movement: "Automatico",
          purchaseDate: randomDate(past1Year, now).toISOString(),
          purchasePrice: "85000",
          sellingPrice: "120000",
          accessories: "Completo di tutto",
          supplierId: suppliersData[1].id
        },
        {
          brand: "Audemars Piguet",
          model: "Royal Oak",
          reference: "15400ST",
          serialNumber: "H87234",
          year: 2022,
          condition: "Ottime",
          caseMaterial: "Acciaio",
          braceletMaterial: "Acciaio",
          caseSize: 41,
          dialColor: "Blu",
          movement: "Automatico",
          purchaseDate: randomDate(past1Year, now).toISOString(),
          purchasePrice: "42000",
          sellingPrice: "48000",
          accessories: "Scatola e documenti",
          supplierId: suppliersData[0].id
        },
        {
          brand: "Rolex",
          model: "Daytona",
          reference: "116500LN",
          serialNumber: "8CG4701",
          year: 2022,
          condition: "Nuovo",
          caseMaterial: "Acciaio",
          braceletMaterial: "Acciaio",
          caseSize: 40,
          dialColor: "Bianco",
          movement: "Automatico",
          purchaseDate: randomDate(past1Year, now).toISOString(),
          purchasePrice: "28000",
          sellingPrice: "35000",
          accessories: "Full set",
          supplierId: suppliersData[0].id
        },
        {
          brand: "Omega",
          model: "Speedmaster",
          reference: "310.30.42.50.01.001",
          serialNumber: "ZK78023",
          year: 2023,
          condition: "Nuovo",
          caseMaterial: "Acciaio",
          braceletMaterial: "Acciaio",
          caseSize: 42,
          dialColor: "Nero",
          movement: "Manuale",
          purchaseDate: randomDate(past1Year, now).toISOString(),
          purchasePrice: "6500",
          sellingPrice: "7500",
          accessories: "Scatola e garanzia",
          supplierId: suppliersData[1].id
        }
      ];

      // Aggiungiamo gli orologi
      let watchesData = [];
      for (const watch of watches) {
        const response = await apiRequest("POST", "/api/watches", watch);
        const newWatch = await response.json();
        watchesData.push(newWatch);
      }

      // Creiamo vendite fittizie in date sparse negli ultimi 12 mesi
      const sales = [];
      // Generiamo 15 vendite negli ultimi 12 mesi
      for (let i = 0; i < 15; i++) {
        const randomWatchIndex = Math.floor(Math.random() * watchesData.length);
        const randomCustomerIndex = Math.floor(Math.random() * customersData.length);
        const saleDate = randomDate(past1Year, now);
        
        // Variazione casuale del prezzo di vendita (±5%)
        const watch = watchesData[randomWatchIndex];
        const basePrice = parseFloat(watch.sellingPrice);
        const priceVariation = basePrice * (0.95 + Math.random() * 0.1); // ±5%
        
        sales.push({
          watchId: watch.id,
          customerId: customersData[randomCustomerIndex].id,
          saleDate: saleDate.toISOString(),
          salePrice: Math.round(priceVariation * 100) / 100
        });
        
        // RIMOSSO: Non marchiamo qui gli orologi come venduti
        // await apiRequest("PATCH", `/api/watches/${watch.id}`, { isSold: true });
      }

      // Registriamo le vendite
      for (const sale of sales) {
        try {
          await apiRequest("POST", "/api/sales", sale);
        } catch (error) {
          console.error("Errore nella registrazione della vendita:", error);
        }
      }

      toast({
        title: "Dati caricati",
        description: "I dati dimostrativi sono stati caricati con successo!",
      });

      // Ricarica la pagina per visualizzare i nuovi dati
      window.location.reload();
    } catch (error) {
      console.error("Errore nel caricamento dei dati dimostrativi:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento dei dati",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your watch business at a glance.</p>
      </div>

      <MetricsCards
        totalRevenue={totalRevenue}
        totalProfit={totalProfit}
        totalCustomers={customers?.length || 0}
        totalWatches={watches?.length || 0}
      />
      
      {/* Grafico storico vendite */}
      {sales && watches && (
        <SalesHistoryChart salesData={sales} watches={watches} />
      )}
      
      {/* Strumenti di amministrazione */}
      <div className="mt-8 border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">Strumenti Amministrazione</h2>
        <div className="flex gap-4 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              // Apri una nuova finestra con i dati JSON
              window.open('/api/admin/database-view', '_blank');
            }}
          >
            Visualizza Database
          </Button>
          
          <Button
            variant="destructive"
            onClick={async () => {
              if (window.confirm("ATTENZIONE: Questa azione eliminerà TUTTI i dati. Continuare?")) {
                try {
                  await apiRequest("POST", "/api/admin/reset-database", {});
                  toast({
                    title: "Database resettato",
                    description: "Tutti i dati sono stati eliminati con successo",
                  });
                  // Ricarica i dati
                  window.location.reload();
                } catch (error) {
                  toast({
                    title: "Errore",
                    description: "Impossibile resettare il database",
                    variant: "destructive",
                  });
                }
              }
            }}
          >
            Reset Database
          </Button>
          
          <Button
            variant="default"
            onClick={loadDemoData}
          >
            Carica Dati Demo
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <SalesChart
          data={caseSizeData}
          title="Sales by Case Size"
          dataKey="sales"
          nameKey="size"
        />
        <SalesChart
          data={dialColorData}
          title="Sales by Dial Color"
          dataKey="sales"
          nameKey="color"
        />
      </div>
    </div>
  );
}