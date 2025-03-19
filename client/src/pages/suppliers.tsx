import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Supplier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";

function SupplierForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      name: "",
      surname: "",
      document: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  async function onSubmit(data: any) {
    try {
      await apiRequest("POST", "/api/suppliers", data);
      toast({
        title: "Success",
        description: "Fornitore aggiunto con successo",
      });
      form.reset();
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Impossibile aggiungere il fornitore",
        variant: "destructive",
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <Input {...form.register("name")} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cognome</label>
          <Input {...form.register("surname")} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Documento</label>
          <Input {...form.register("document")} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Telefono</label>
          <Input {...form.register("phone")} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input type="email" {...form.register("email")} />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Note</label>
          <Textarea 
            {...form.register("notes")} 
            placeholder="Informazioni aggiuntive sul fornitore"
            className="min-h-[80px]"
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        Aggiungi Fornitore
      </Button>
    </form>
  );
}

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: suppliers, refetch } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const filteredSuppliers = suppliers?.filter(supplier => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(term) ||
      supplier.surname.toLowerCase().includes(term) ||
      supplier.email.toLowerCase().includes(term) ||
      supplier.phone.toLowerCase().includes(term) ||
      supplier.document.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Fornitori</h1>
          <p className="text-muted-foreground">Gestisci i tuoi fornitori di orologi.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Aggiungi Fornitore
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Nuovo Fornitore</DialogTitle>
            </DialogHeader>
            <SupplierForm onSuccess={refetch} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca fornitori..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredSuppliers?.length ? (
          filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {supplier.name} {supplier.surname}
                  </h3>
                  {supplier.document && (
                    <p className="text-sm text-muted-foreground">
                      Documento: {supplier.document}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2">
                    {supplier.phone && (
                      <p className="text-sm">
                        <span className="font-medium">Tel:</span> {supplier.phone}
                      </p>
                    )}
                    {supplier.email && (
                      <p className="text-sm">
                        <span className="font-medium">Email:</span> {supplier.email}
                      </p>
                    )}
                  </div>
                  {supplier.notes && (
                    <p className="text-sm mt-2 italic">{supplier.notes}</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-6 text-center">
            {searchTerm ? (
              "Nessun fornitore trovato con questi criteri di ricerca."
            ) : (
              "Nessun fornitore trovato. Aggiungi il tuo primo fornitore!"
            )}
          </Card>
        )}
      </div>
    </div>
  );
}