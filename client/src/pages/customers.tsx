import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Customer, Sale, Watch } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserPlus, ChevronDown, ChevronUp, MoreHorizontal, Pencil, Trash } from "lucide-react";
import CustomerForm from "@/components/customer-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Estendi CustomerForm per supportare la modifica di un cliente esistente
function EditCustomerForm({ customer, onSuccess }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    address: customer.address,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiRequest("PUT", `/api/customers/${customer.id}`, formData);
      toast({
        title: "Success",
        description: "Cliente aggiornato con successo",
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Impossibile aggiornare il cliente",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <Input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cognome</label>
          <Input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Indirizzo</label>
        <Input
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
        />
      </div>

      <Button type="submit" className="w-full">
        Aggiorna Cliente
      </Button>
    </form>
  );
}

export default function Customers() {
  const { toast } = useToast();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedCustomers, setExpandedCustomers] = useState<Record<number, boolean>>({});
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const { data: customers, refetch } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });
  
  const { data: watches } = useQuery<Watch[]>({
    queryKey: ["/api/watches"],
  });

  // Mappa degli orologi per ID
  const watchesMap = useMemo(() => {
    if (!watches) return {};
    return watches.reduce((map, watch) => {
      map[watch.id] = watch;
      return map;
    }, {});
  }, [watches]);
  
  // Raggruppa le vendite per cliente
  const salesByCustomer = useMemo(() => {
    if (!sales || !watches) return {};
    
    const result = {};
    sales.forEach(sale => {
      if (!result[sale.customerId]) {
        result[sale.customerId] = [];
      }
      
      const watch = watchesMap[sale.watchId];
      if (watch) {
        result[sale.customerId].push({
          ...sale,
          watch
        });
      }
    });
    
    return result;
  }, [sales, watches, watchesMap]);

  const sortedCustomers = useMemo(() => {
    if (!customers) return [];
    
    return [...customers].sort((a, b) => {
      const diff = Number(b.totalSpent) - Number(a.totalSpent);
      return sortOrder === "desc" ? diff : -diff;
    });
  }, [customers, sortOrder]);

  // Toggle espansione cliente
  const toggleCustomer = (customerId: number) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  // Formatta data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Elimina cliente
  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    
    try {
      await apiRequest("DELETE", `/api/customers/${deletingCustomer.id}`, {});
      await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDeletingCustomer(null);
      toast({
        title: "Successo",
        description: "Cliente eliminato con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il cliente. Potrebbe avere vendite associate.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Clienti</h1>
          <p className="text-muted-foreground">Gestione del database clienti.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Aggiungi Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Nuovo Cliente</DialogTitle>
            </DialogHeader>
            <CustomerForm onSuccess={refetch} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
        >
          Ordina per Spesa Totale {sortOrder === "desc" ? "↓" : "↑"}
        </Button>
      </div>

      <div className="grid gap-4">
        {sortedCustomers.map((customer) => (
          <Card key={customer.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {customer.firstName} {customer.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{customer.address}</p>
                </div>
                <div className="text-right flex items-start gap-2">
                  <div className="flex items-center">
                    <p className="font-semibold">
                      Spesa Totale: €{Number(customer.totalSpent).toLocaleString()}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-2"
                      onClick={() => toggleCustomer(customer.id)}
                    >
                      {expandedCustomers[customer.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Menu azioni cliente */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingCustomer(customer)}
                        className="cursor-pointer"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingCustomer(customer)}
                        className="cursor-pointer text-red-600"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Storico acquisti */}
              {expandedCustomers[customer.id] && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-2">Storico acquisti</h4>
                  {salesByCustomer[customer.id]?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead>Modello</TableHead>
                          <TableHead>Referenza</TableHead>
                          <TableHead>Seriale</TableHead>
                          <TableHead className="text-right">Prezzo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesByCustomer[customer.id]
                          .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
                          .map(sale => (
                            <TableRow key={sale.id}>
                              <TableCell>{formatDate(sale.saleDate)}</TableCell>
                              <TableCell>{sale.watch.brand}</TableCell>
                              <TableCell>{sale.watch.model}</TableCell>
                              <TableCell>{sale.watch.reference}</TableCell>
                              <TableCell>{sale.watch.serialNumber || '-'}</TableCell>
                              <TableCell className="text-right">€{Number(sale.salePrice).toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nessun acquisto registrato</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {!sortedCustomers.length && (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              Nessun cliente trovato. Aggiungi il tuo primo cliente!
            </p>
          </Card>
        )}
      </div>

      {/* Dialog per modifica cliente */}
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Cliente</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <EditCustomerForm
              customer={editingCustomer}
              onSuccess={() => {
                refetch();
                setEditingCustomer(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog per conferma eliminazione */}
      <Dialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Eliminazione</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Sei sicuro di voler eliminare questo cliente?
            {deletingCustomer && (
              <p className="font-bold mt-2">
                {deletingCustomer.firstName} {deletingCustomer.lastName}
              </p>
            )}
            {deletingCustomer && salesByCustomer[deletingCustomer.id]?.length > 0 && (
              <p className="text-amber-600 mt-2">
                Attenzione: questo cliente ha {salesByCustomer[deletingCustomer.id].length} acquisti registrati.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeletingCustomer(null)}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCustomer}
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}