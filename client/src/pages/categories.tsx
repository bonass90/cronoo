import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Pencil, Trash, MoreHorizontal, X, PlusIcon, ArrowUp, ArrowDown, LayoutGrid, MoveVertical, Package, Watch } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// Tipi di dati
interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  fields?: CategoryField[];
}

interface CategoryField {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  label: string;
  type: string;
  isRequired: boolean;
  options: string;
  displayOrder: number;
  showInTable: boolean;
  showInGraph: boolean;
}

// Schema per la validazione del form categoria
const categorySchema = z.object({
  name: z.string().min(1, "Il nome è richiesto"),
  icon: z.string().default("Package"),
});

// Schema per la validazione del form campo
const fieldSchema = z.object({
  name: z.string().min(1, "Il nome è richiesto"),
  label: z.string().min(1, "L'etichetta è richiesta"),
  type: z.enum(["text", "number", "date", "select", "textarea", "boolean"]),
  isRequired: z.boolean().default(false),
  options: z.string().optional(),
  showInTable: z.boolean().default(true),
  showInGraph: z.boolean().default(false),
});

// Componente per un campo ordinabile
function SortableField({ field, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const style = {
    transform: transform ? `translateY(${transform.y}px)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 mb-2 bg-white dark:bg-gray-800 rounded-md border flex items-center gap-2 cursor-move"
      {...attributes}
      {...listeners}
    >
      <div className="flex-1">
        <div className="font-medium">{field.label}</div>
        <div className="text-sm text-muted-foreground">
          {field.type} {field.isRequired && <span className="text-red-500">*</span>}
        </div>
      </div>
      
      <Button variant="ghost" size="sm" onClick={() => onEdit(field)}>
        <Pencil className="h-4 w-4" />
      </Button>
      
      <Button variant="ghost" size="sm" onClick={() => onDelete(field)}>
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Componente per il form di una categoria
function CategoryForm({ category = null, onSuccess }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      icon: category?.icon || "Package",
    }
  });
  
  const createCategory = async (data) => {
    try {
      if (category) {
        await apiRequest("PUT", `/api/product-categories/${category.id}`, data);
        toast({
          title: "Categoria aggiornata",
          description: "La categoria è stata aggiornata con successo",
        });
      } else {
        await apiRequest("POST", "/api/product-categories", data);
        toast({
          title: "Categoria creata",
          description: "La categoria è stata creata con successo",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      onSuccess();
    } catch (error) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(createCategory)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Categoria</FormLabel>
              <FormControl>
                <Input {...field} placeholder="es. Orologi, Penne, Anelli..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icona</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli un'icona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Package">Package</SelectItem>
                  <SelectItem value="Watch">Watch</SelectItem>
                  <SelectItem value="Pen">Pen</SelectItem>
                  <SelectItem value="CircleDot">Circle</SelectItem>
                  <SelectItem value="LayoutGrid">Grid</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full">
          {category ? "Aggiorna Categoria" : "Crea Categoria"}
        </Button>
      </form>
    </Form>
  );
}

// Componente per il form di un campo
function FieldForm({ field = null, categoryId, onSuccess }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      name: field?.name || "",
      label: field?.label || "",
      type: field?.type || "text",
      isRequired: field?.isRequired || false,
      options: field?.options || "",
      showInTable: field?.showInTable ?? true,
      showInGraph: field?.showInGraph ?? false,
    }
  });
  
  const watchType = form.watch("type");
  
  const saveField = async (data) => {
    try {
      if (field) {
        await apiRequest("PUT", `/api/category-fields/${field.id}`, data);
        toast({
          title: "Campo aggiornato",
          description: "Il campo è stato aggiornato con successo",
        });
      } else {
        await apiRequest("POST", `/api/product-categories/${categoryId}/fields`, data);
        toast({
          title: "Campo creato",
          description: "Il campo è stato creato con successo",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/product-categories/${categoryId}/fields`] });
      queryClient.invalidateQueries({ queryKey: [`/api/product-categories/${categoryId}`] });
      onSuccess();
    } catch (error) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(saveField)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome campo (ID)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="es. brand, diameter, color..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Etichetta (visualizzata)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="es. Marca, Diametro, Colore..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo di campo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="text">Testo</SelectItem>
                  <SelectItem value="number">Numero</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="select">Selezione</SelectItem>
                  <SelectItem value="textarea">Area di testo</SelectItem>
                  <SelectItem value="boolean">Sì/No</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {watchType === "select" && (
          <FormField
            control={form.control}
            name="options"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opzioni (separa con virgole)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="es. Rosso, Verde, Blu" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="isRequired"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Campo obbligatorio</FormLabel>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="showInTable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Mostra nella tabella prodotti</FormLabel>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="showInGraph"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Disponibile per grafici</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full">
          {field ? "Aggiorna Campo" : "Aggiungi Campo"}
        </Button>
      </form>
    </Form>
  );
}

// Componente principale
export default function CategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<CategoryField | null>(null);
  const [showDeleteCategory, setShowDeleteCategory] = useState(false);
  const [showDeleteField, setShowDeleteField] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CategoryField | null>(null);
  
  // Query per le categorie
  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/product-categories"],
  });
  
  // Query per i campi della categoria selezionata
  const { data: categoryDetails, isLoading: isLoadingFields } = useQuery<Category>({
    queryKey: [`/api/product-categories/${selectedCategory?.id}`],
    enabled: !!selectedCategory,
  });
  
  // Sensori per il drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );
  
  // Gestisce la riorganizzazione dei campi
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !selectedCategory) return;
    
    const fields = categoryDetails?.fields || [];
    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Crea un nuovo array di campi ordinati
    const reorderedFields = [...fields];
    const [movedField] = reorderedFields.splice(oldIndex, 1);
    reorderedFields.splice(newIndex, 0, movedField);
    
    // Estrai gli ID dei campi nell'ordine corretto
    const fieldIds = reorderedFields.map(field => field.id);
    
    try {
      // Chiama l'API per aggiornare l'ordine
      await apiRequest("PUT", `/api/product-categories/${selectedCategory.id}/fields/reorder`, {
        fieldIds
      });
      
      // Invalida la query per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: [`/api/product-categories/${selectedCategory.id}`] });
      
      toast({
        title: "Ordine aggiornato",
        description: "L'ordine dei campi è stato aggiornato con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'ordine dei campi",
        variant: "destructive",
      });
    }
  };
  
  // Gestisce l'eliminazione di una categoria
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    
    try {
      await apiRequest("DELETE", `/api/product-categories/${selectedCategory.id}`, {});
      
      toast({
        title: "Categoria eliminata",
        description: "La categoria è stata eliminata con successo",
      });
      
      // Invalida la query e resetta lo stato
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
      setSelectedCategory(null);
      setShowDeleteCategory(false);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare la categoria. Potrebbe contenere prodotti.",
        variant: "destructive",
      });
    }
  };
  
  // Gestisce l'eliminazione di un campo
  const handleDeleteField = async () => {
    if (!fieldToDelete) return;
    
    try {
      await apiRequest("DELETE", `/api/category-fields/${fieldToDelete.id}`, {});
      
      toast({
        title: "Campo eliminato",
        description: "Il campo è stato eliminato con successo",
      });
      
      // Invalida la query e resetta lo stato
      queryClient.invalidateQueries({ queryKey: [`/api/product-categories/${selectedCategory?.id}`] });
      setShowDeleteField(false);
      setFieldToDelete(null);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il campo",
        variant: "destructive",
      });
    }
  };
  
  // Restituisce l'icona della categoria
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Watch":
        return <Watch className="h-5 w-5" />;
      case "Package":
      default:
        return <Package className="h-5 w-5" />;
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gestione Categorie</h1>
          <p className="text-muted-foreground">Crea e gestisci categorie di prodotti personalizzate.</p>
        </div>
        
        <Button onClick={() => {
          setSelectedCategory(null);
          setShowCategoryForm(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuova Categoria
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lista categorie */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Categorie</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <div className="text-center py-4">Caricamento categorie...</div>
            ) : categories?.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Nessuna categoria definita</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => setShowCategoryForm(true)}
                >
                  Crea la prima categoria
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {categories?.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory?.id === category.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <div className="mr-2">
                      {renderCategoryIcon(category.icon)}
                    </div>
                    {category.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Dettagli categoria */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {selectedCategory ? `Campi della categoria: ${selectedCategory.name}` : "Seleziona una categoria"}
            </CardTitle>
            
            {selectedCategory && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCategoryForm(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Modifica
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500"
                  onClick={() => setShowDeleteCategory(true)}
                >
                  <Trash className="h-4 w-4 mr-1" />
                  Elimina
                </Button>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {!selectedCategory ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Seleziona una categoria per gestire i suoi campi</p>
              </div>
            ) : isLoadingFields ? (
              <div className="text-center py-4">Caricamento campi...</div>
            ) : (
              <>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Campi personalizzati</h3>
                    <p className="text-sm text-muted-foreground">
                      Trascina i campi per riordinare. Questi campi saranno disponibili per tutti i prodotti di questa categoria.
                    </p>
                  </div>
                  
                  <Button onClick={() => {
                    setEditingField(null);
                    setShowFieldForm(true);
                  }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Aggiungi Campo
                  </Button>
                </div>
                
                <div className="mt-4">
                  {categoryDetails?.fields?.length === 0 ? (
                    <div className="text-center py-6 border rounded-md bg-gray-50 dark:bg-gray-800">
                      <p className="text-muted-foreground">Nessun campo definito per questa categoria</p>
                      <Button 
                        variant="outline" 
                        className="mt-2"
                        onClick={() => {
                          setEditingField(null);
                          setShowFieldForm(true);
                        }}
                      >
                        Crea il primo campo
                      </Button>
                    </div>
                  ) : (
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                      modifiers={[restrictToVerticalAxis]}
                    >
                      <SortableContext 
                        items={categoryDetails?.fields?.map(f => f.id) || []}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {categoryDetails?.fields?.map(field => (
                            <SortableField 
                              key={field.id} 
                              field={field} 
                              onEdit={() => {
                                setEditingField(field);
                                setShowFieldForm(true);
                              }}
                              onDelete={() => {
                                setFieldToDelete(field);
                                setShowDeleteField(true);
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog per il form categoria */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? "Modifica Categoria" : "Crea Nuova Categoria"}
            </DialogTitle>
          </DialogHeader>
          
          <CategoryForm 
            category={selectedCategory} 
            onSuccess={() => setShowCategoryForm(false)} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Dialog per il form campo */}
      <Dialog open={showFieldForm} onOpenChange={setShowFieldForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Modifica Campo" : "Aggiungi Nuovo Campo"}
            </DialogTitle>
          </DialogHeader>
          
          <FieldForm 
            field={editingField} 
            categoryId={selectedCategory?.id || 0} 
            onSuccess={() => {
              setShowFieldForm(false);
              setEditingField(null);
            }} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Alert dialog per conferma eliminazione categoria */}
      <AlertDialog open={showDeleteCategory} onOpenChange={setShowDeleteCategory}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la categoria "{selectedCategory?.name}"?
              Questa operazione è irreversibile e tutti i campi associati verranno eliminati.
              <br /><br />
              <strong className="text-red-500">Nota:</strong> Non puoi eliminare una categoria che contiene prodotti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-500 hover:bg-red-600">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Alert dialog per conferma eliminazione campo */}
      <AlertDialog open={showDeleteField} onOpenChange={setShowDeleteField}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione Campo</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il campo "{fieldToDelete?.label}"?
              <br /><br />
              <strong className="text-red-500">Attenzione:</strong> Questa operazione eliminerà anche tutti i valori di questo campo dai prodotti esistenti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteField} className="bg-red-500 hover:bg-red-600">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}