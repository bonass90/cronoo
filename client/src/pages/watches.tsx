import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Watch, Supplier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox"; 
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WatchForm from "@/components/watch-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PlusCircle, Euro, Filter, Edit2, ListFilter, MoreHorizontal, Search, InfoIcon, RotateCcw } from "lucide-react";
import SaleForm from "@/components/sale-form";
import { format, differenceInDays } from "date-fns";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';

// Definizione delle opzioni per i campi a selezione
const CONDITIONS = [
  "Nuovo",
  "Mai indossato",
  "Eccellenti",
  "Ottime",
  "Buone",
  "Discrete",
  "Da revisionare",
];

const MOVEMENTS = [
  "Automatico",
  "Manuale",
  "Quarzo",
  "Cronografo automatico",
  "Cronografo manuale", 
  "Cronografo al quarzo",
];

// Componente per visualizzare le informazioni del fornitore
function SupplierInfo({ supplier }) {
  if (!supplier) return <span className="text-gray-400 italic">Fornitore non specificato</span>;
  
  return (
    <div className="space-y-2">
      <p className="font-bold">{supplier.name} {supplier.surname}</p>
      {supplier.document && <p><span className="font-medium">Documento:</span> {supplier.document}</p>}
      {supplier.phone && <p><span className="font-medium">Telefono:</span> {supplier.phone}</p>}
      {supplier.email && <p><span className="font-medium">Email:</span> {supplier.email}</p>}
      {supplier.notes && (
        <div>
          <p className="font-medium">Note:</p>
          <p className="text-sm italic">{supplier.notes}</p>
        </div>
      )}
    </div>
  );
}

// Componente intestazione colonna ordinabile
function SortableColumnHeader({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: transform ? `translateX(${transform.x}px)` : undefined,
    transition,
    cursor: 'grab'
  };

  return (
    <TableHead ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </TableHead>
  );
}

// Componente principale
export default function Watches() {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{
    id: number;
    field: string;
    value: any;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("available"); // "available" o "sold"
  const [isFixingWatches, setIsFixingWatches] = useState(false);
  
  // Stati per le azioni sugli orologi
  const [editingWatch, setEditingWatch] = useState<Watch | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletingWatch, setDeletingWatch] = useState<Watch | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Definizione di tutte le possibili colonne
  const allColumns = [
    { id: 'productCode', name: 'Cod. Prodotto', width: 'w-[120px]' },
    { id: 'brand', name: 'Marca', width: 'w-[140px]' },
    { id: 'model', name: 'Modello', width: 'w-[150px]' },
    { id: 'reference', name: 'Referenza', width: 'w-[140px]' },
    { id: 'serialNumber', name: 'N. Seriale', width: 'w-[140px]' },
    { id: 'year', name: 'Anno', width: 'w-[80px]' },
    { id: 'condition', name: 'Condizioni', width: 'w-[140px]' },
    { id: 'caseSize', name: 'Diam. Cassa', width: 'w-[120px]' },
    { id: 'caseMaterial', name: 'Mat. Cassa', width: 'w-[120px]' },
    { id: 'braceletMaterial', name: 'Mat. Bracciale', width: 'w-[120px]' },
    { id: 'dialColor', name: 'Colore Quad.', width: 'w-[120px]' },
    { id: 'movement', name: 'Movimento', width: 'w-[120px]' },
    { id: 'accessories', name: 'Corredo', width: 'w-[120px]' },
    { id: 'supplierId', name: 'Acquistato da', width: 'w-[150px]' },
    { id: 'purchaseDate', name: 'Data Acq.', width: 'w-[120px]' },
    { id: 'purchasePrice', name: 'Prezzo Acq.', width: 'w-[120px]' },
    { id: 'sellingPrice', name: 'Prezzo Vend.', width: 'w-[120px]' },
    { id: 'daysInInventory', name: 'Giorni in giacenza', width: 'w-[120px]' },
  ];

  // Stato per le colonne visibili e il loro ordine
  const [visibleColumns, setVisibleColumns] = useState([
    'brand', 'model', 'reference', 'caseSize', 'condition', 'supplierId', 'sellingPrice'
  ]);

  // Query per ottenere i fornitori
  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    refetchOnWindowFocus: false,
  });

  // Query per ottenere gli orologi
  const { data: watches, refetch, isLoading } = useQuery<Watch[]>({
    queryKey: ["/api/watches"],
    refetchOnWindowFocus: false,
  });

  // Calcolo dei giorni in giacenza
  const watchesWithDays = useMemo(() => {
    if (!watches) return [];
    return watches.map(watch => ({
      ...watch,
      daysInInventory: watch.addedAt 
        ? differenceInDays(new Date(), new Date(watch.addedAt)) 
        : null
    }));
  }, [watches]);

  // Mappa dei fornitori per ID
  const suppliersMap = useMemo(() => {
    if (!suppliers) return {};
    return suppliers.reduce((map, supplier) => {
      map[supplier.id] = supplier;
      return map;
    }, {});
  }, [suppliers]);

  // DEBUG: Log degli orologi caricati
  useEffect(() => {
    if (watches) {
      console.log("Total watches loaded:", watches.length);
      console.log("First watch sample:", watches[0]);
      console.log("Watches with sold > 0:", watches.filter(w => w.sold > 0).length);
      console.log("Watches with isSold=true:", watches.filter(w => w.isSold === true).length);
    }
  }, [watches]);

  // Filtra gli orologi in base al termine di ricerca
const filteredWatches = useMemo(() => {
  if (!watchesWithDays) return [];
  
  // Prima filtra per termine di ricerca
  let filtered = watchesWithDays;
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(watch => {
      // Cerca in tutte le proprietà di testo dell'orologio
      return Object.entries(watch).some(([key, value]) => {
        // Ignora proprietà che non sono stringhe o numeri
        if (typeof value !== 'string' && typeof value !== 'number') return false;
        // Converti a stringa e cerca
        return String(value).toLowerCase().includes(term);
      });
    });
  }
  
  // Filtro per tab attivo
  return filtered.filter(watch => {
    // Un orologio è considerato venduto se:
    // - ha isSold = true OPPURE
    // - ha sold > 0
    const isWatchSold = watch.isSold === true || (watch.sold && watch.sold > 0);
    
    // Mostra in base al tab attivo
    return activeTab === "available" ? !isWatchSold : isWatchSold;
  });
}, [watchesWithDays, searchTerm, activeTab]);

  // Funzione per aggiornare manualmente lo stato degli orologi venduti
  const handleFixSoldWatches = async () => {
    try {
      setIsFixingWatches(true);
      await apiRequest("POST", "/api/admin/fix-sold-watches", {});
      await refetch();
      toast({
        title: "Successo",
        description: "Stato degli orologi venduti aggiornato con successo",
      });
    } catch (error) {
      console.error("Errore nell'aggiornamento degli orologi:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato degli orologi",
        variant: "destructive",
      });
    } finally {
      setIsFixingWatches(false);
    }
  };

  // Gestione dell'aggiornamento di un campo
  const handleCellUpdate = async (id: number, field: string, newValue: any) => {
    try {
      await apiRequest("PATCH", `/api/watches/${id}`, { [field]: newValue });
      await queryClient.invalidateQueries({ queryKey: ["/api/watches"] });
      setEditingCell(null);
      toast({
        title: "Success",
        description: `${field} aggiornato con successo`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Impossibile aggiornare ${field}`,
        variant: "destructive",
      });
    }
  };

  // Gestione dell'edit di una cella
  const handleCellClick = (id: number, field: string, value: any) => {
    if (field === 'actions' || field === 'daysInInventory' || field === 'supplierId') return;
    setEditingCell({ id, field, value });
  };

  // Sensori per il drag and drop delle colonne
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Gestione del riordinamento delle colonne
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setVisibleColumns((columns) => {
        const oldIndex = columns.indexOf(active.id);
        const newIndex = columns.indexOf(over.id);
        return arrayMove(columns, oldIndex, newIndex);
      });
    }
  };

  // Funzione per eliminare un orologio
  const handleDeleteWatch = async () => {
    if (!deletingWatch) return;
    
    try {
      await apiRequest("DELETE", `/api/watches/${deletingWatch.id}`, {});
      await queryClient.invalidateQueries({ queryKey: ["/api/watches"] });
      setShowDeleteConfirmation(false);
      setDeletingWatch(null);
      toast({
        title: "Successo",
        description: "Orologio eliminato con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'orologio",
        variant: "destructive",
      });
    }
  };

  // Renderizzazione condizionale del valore della cella
  const renderCellValue = (watch, columnId) => {
    // Se è la cella in editing
    if (editingCell?.id === watch.id && editingCell?.field === columnId) {
      switch (columnId) {
        case 'condition':
          return (
            <select
              className="w-full p-1 border rounded"
              value={editingCell.value}
              onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
              onBlur={() => handleCellUpdate(watch.id, columnId, editingCell.value)}
            >
              {CONDITIONS.map(cond => (
                <option key={cond} value={cond}>{cond}</option>
              ))}
            </select>
          );
        case 'movement':
          return (
            <select
              className="w-full p-1 border rounded"
              value={editingCell.value}
              onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
              onBlur={() => handleCellUpdate(watch.id, columnId, editingCell.value)}
            >
              {MOVEMENTS.map(mov => (
                <option key={mov} value={mov}>{mov}</option>
              ))}
            </select>
          );
        case 'purchaseDate':
          return (
            <Input
              type="date"
              value={editingCell.value ? editingCell.value.substring(0, 10) : ''}
              onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
              onBlur={() => handleCellUpdate(watch.id, columnId, new Date(editingCell.value))}
              className="w-full p-1 h-8"
            />
          );
        case 'purchasePrice':
        case 'sellingPrice':
          return (
            <Input
              type="number"
              step="0.01"
              value={editingCell.value}
              onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
              onBlur={() => handleCellUpdate(watch.id, columnId, Number(editingCell.value))}
              className="w-full p-1 h-8"
            />
          );
        case 'year':
          return (
            <Input
              type="number"
              value={editingCell.value || ''}
              onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
              onBlur={() => handleCellUpdate(watch.id, columnId, Number(editingCell.value))}
              className="w-full p-1 h-8"
            />
          );
        case 'accessories':
          return (
            <Input
              type="text"
              value={editingCell.value || ''}
              onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
              onBlur={() => handleCellUpdate(watch.id, columnId, editingCell.value)}
              className="w-full p-1 h-8"
            />
          );
        default:
          return (
            <Input
              type="text"
              value={editingCell.value || ''}
              onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
              onBlur={() => handleCellUpdate(watch.id, columnId, editingCell.value)}
              className="w-full p-1 h-8"
            />
          );
      }
    }

    // Altrimenti mostra il valore formattato
    switch (columnId) {
      case 'purchaseDate':
        return watch.purchaseDate ? format(new Date(watch.purchaseDate), 'dd/MM/yyyy') : '-';
      case 'purchasePrice':
      case 'sellingPrice':
        return `€${Number(watch[columnId] || 0).toLocaleString()}`;
      case 'caseSize':
        return watch.caseSize ? `${watch.caseSize}mm` : '-';
      case 'daysInInventory':
        return watch.daysInInventory !== null ? `${watch.daysInInventory} giorni` : '-';
      case 'accessories':
        return watch.accessories || '-';
      case 'supplierId':
        // Caso speciale per visualizzare il fornitore con tooltip
        const supplier = watch.supplierId ? suppliersMap[watch.supplierId] : null;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  {supplier ? (
                    <>
                      <span className="text-blue-600 hover:underline">
                        {supplier.name} {supplier.surname}
                      </span>
                      <InfoIcon className="h-4 w-4 text-blue-500" />
                    </>
                  ) : (
                    <span className="text-gray-400 italic">Fornitore non specificato</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="w-64 p-4">
                <SupplierInfo supplier={supplier} />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return watch[columnId] || '-';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Orologi</h1>
          <p className="text-muted-foreground">Gestisci il tuo inventario orologi.</p>
        </div>

        <div className="flex gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Aggiungi Orologio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Aggiungi Nuovo Orologio</DialogTitle>
              </DialogHeader>
              <WatchForm onSuccess={refetch} />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default" className="bg-primary hover:bg-primary/90">
                <Euro className="mr-2 h-4 w-4" />
                Registra Vendita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registra Nuova Vendita</DialogTitle>
              </DialogHeader>
              <SaleForm onSuccess={refetch} />
            </DialogContent>
          </Dialog>
          
          {/* Pulsante per aggiornare lo stato degli orologi venduti */}
          <Button
            variant="outline"
            onClick={handleFixSoldWatches}
            disabled={isFixingWatches}
          >
            <RotateCcw className={`mr-2 h-4 w-4 ${isFixingWatches ? 'animate-spin' : ''}`} />
            Fix Orologi Venduti
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca orologi..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={activeTab === "available" ? "default" : "outline"}
            onClick={() => setActiveTab("available")}
          >
            Disponibili
          </Button>
          <Button 
            variant={activeTab === "sold" ? "default" : "outline"}
            onClick={() => setActiveTab("sold")}
          >
            Venduti
          </Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ListFilter className="mr-2 h-4 w-4" />
              Personalizza Colonne
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Seleziona colonne da visualizzare</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={visibleColumns.includes(column.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setVisibleColumns([...visibleColumns, column.id]);
                  } else {
                    setVisibleColumns(visibleColumns.filter(id => id !== column.id));
                  }
                }}
              >
                {column.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="overflow-x-auto">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis]}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <SortableContext 
                  items={visibleColumns}
                  strategy={horizontalListSortingStrategy}
                >
                  {visibleColumns.map(columnId => {
                    const column = allColumns.find(col => col.id === columnId);
                    return (
                      <SortableColumnHeader key={columnId} id={columnId}>
                        <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                          {column?.name}
                        </div>
                      </SortableColumnHeader>
                    );
                  })}
                </SortableContext>
                <TableHead className="w-[80px] whitespace-nowrap">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                    Caricamento orologi...
                  </TableCell>
                </TableRow>
              ) : filteredWatches.length > 0 ? (
                filteredWatches.map((watch) => (
                  <TableRow key={watch.id}>
                    {visibleColumns.map(columnId => (
                      <TableCell 
                        key={`${watch.id}-${columnId}`}
                        className={columnId !== 'supplierId' ? "cursor-pointer" : ""}
                        onClick={() => columnId !== 'supplierId' && handleCellClick(watch.id, columnId, watch[columnId])}
                      >
                        {renderCellValue(watch, columnId)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem
                            onClick={() => {
                              setEditingWatch(watch);
                              setShowEditDialog(true);
                            }}
                          >
                            Modifica
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            onClick={async () => {
                              try {
                                await apiRequest("POST", `/api/watches/${watch.id}/duplicate`, {});
                                await queryClient.invalidateQueries({ queryKey: ["/api/watches"] });
                                toast({
                                  title: "Successo",
                                  description: "Orologio duplicato con successo",
                                });
                              } catch (error) {
                                toast({
                                  title: "Errore",
                                  description: "Impossibile duplicare l'orologio",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Duplica
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem
                            onClick={() => {
                              setDeletingWatch(watch);
                              setShowDeleteConfirmation(true);
                            }}
                            className="text-red-600"
                          >
                            Elimina
                          </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="h-24 text-center">
                    {searchTerm 
                      ? "Nessun orologio trovato con questi criteri di ricerca." 
                      : activeTab === "available" 
                        ? "Nessun orologio disponibile trovato. Aggiungi il tuo primo orologio!" 
                        : "Nessun orologio venduto trovato."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </Card>

      {/* Dialog per modifica dell'orologio */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modifica Orologio</DialogTitle>
          </DialogHeader>
          {editingWatch && (
            <WatchForm 
              initialData={editingWatch} 
              onSuccess={() => {
                refetch();
                setShowEditDialog(false);
                setEditingWatch(null);
              }} 
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog per conferma eliminazione */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Eliminazione</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Sei sicuro di voler eliminare questo orologio?
            {deletingWatch && (
              <p className="font-bold mt-2">
                {deletingWatch.brand} {deletingWatch.model} {deletingWatch.reference}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirmation(false)}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteWatch}
            >
              Elimina
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}