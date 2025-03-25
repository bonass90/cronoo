import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Search, LayoutGrid, FilterIcon, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Interfacce per i tipi di dati
interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

interface ProductField {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  label: string;
  type: string;
  isRequired: boolean;
}

interface Product {
  id: number;
  categoryId: number;
  productCode: string;
  name: string;
  description: string;
  purchasePrice: string;
  sellingPrice: string;
  purchaseDate: string;
  condition: string;
  isSold: boolean;
  addedAt: string;
  updatedAt: string;
  customFields: Record<string, string>;
  category?: ProductCategory;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showSoldItems, setShowSoldItems] = useState(false);
  
  // Query per le categorie di prodotti
  const { data: categories } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });
  
  // Query per i prodotti con filtri
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", {
      categoryId: selectedCategoryId,
      sold: showSoldItems
    }],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const response = await fetch(`/api/products?${new URLSearchParams({
        ...(params.categoryId ? { categoryId: params.categoryId.toString() } : {}),
        ...(params.sold !== undefined ? { sold: params.sold.toString() } : {})
      }).toString()}`);
      
      if (!response.ok) {
        throw new Error("Errore nel caricamento dei prodotti");
      }
      
      return response.json();
    }
  });
  
  // Filtra i prodotti in base al termine di ricerca
  const filteredProducts = products?.filter(product => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(term) ||
      product.productCode.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term) ||
      Object.values(product.customFields || {}).some(
        value => value.toLowerCase().includes(term)
      )
    );
  });
  
  // Ottieni i campi personalizzati da mostrare nella tabella per la categoria selezionata
  const getTableFieldsForCategory = (categoryId: number | null) => {
    if (!categoryId || !categories) return [];
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];
    
    // Qui dovresti ottenere i campi della categoria che hanno showInTable=true
    // Per ora, restituiamo un array vuoto
    return [];
  };
  
  // Renderizza l'icona della categoria
  const renderCategoryIcon = (iconName: string) => {
    // Implementa in base alle tue esigenze
    return <Package className="h-5 w-5" />;
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Prodotti</h1>
          <p className="text-muted-foreground">Gestione dell'inventario prodotti.</p>
        </div>
        
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuovo Prodotto
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotti..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={selectedCategoryId === null ? "default" : "outline"}
            onClick={() => setSelectedCategoryId(null)}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Tutte le categorie
          </Button>
          
          {categories?.map(category => (
            <Button
              key={category.id}
              variant={selectedCategoryId === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategoryId(category.id)}
            >
              {renderCategoryIcon(category.icon)}
              <span className="ml-2">{category.name}</span>
            </Button>
          ))}
        </div>
        
        <Button
          variant={showSoldItems ? "default" : "outline"}
          onClick={() => setShowSoldItems(!showSoldItems)}
        >
          <FilterIcon className="mr-2 h-4 w-4" />
          {showSoldItems ? "Venduti" : "Disponibili"}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategoryId 
              ? `Prodotti - ${categories?.find(c => c.id === selectedCategoryId)?.name}` 
              : "Tutti i prodotti"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Caricamento prodotti...</div>
          ) : filteredProducts?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nessun prodotto trovato</p>
              <Button className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Aggiungi il primo prodotto
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Prezzo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts?.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.productCode}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category?.name || "N/D"}</TableCell>
                    <TableCell>€{parseFloat(product.sellingPrice).toLocaleString()}</TableCell>
                    <TableCell>
                      {product.isSold ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Venduto
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Disponibile
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Modifica
                        </Button>
                        <Button variant="outline" size="sm">
                          Dettagli
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}