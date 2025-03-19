import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";

// Tipo di entità da importare
type EntityType = "customers" | "watches" | "suppliers" | "sales";

// Interfaccia per i campi di ogni entità
interface EntityField {
  name: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "date";
}

// Definizione dei campi per ogni tipo di entità
const entityFields: Record<EntityType, EntityField[]> = {
  customers: [
    { name: "firstName", label: "Nome", required: true, type: "string" },
    { name: "lastName", label: "Cognome", required: true, type: "string" },
    { name: "address", label: "Indirizzo", required: true, type: "string" },
    { name: "email", label: "Email", required: false, type: "string" },
    { name: "phone", label: "Telefono", required: false, type: "string" },
  ],
  watches: [
    { name: "brand", label: "Marca", required: true, type: "string" },
    { name: "model", label: "Modello", required: true, type: "string" },
    { name: "reference", label: "Referenza", required: true, type: "string" },
    { name: "serialNumber", label: "Numero Seriale", required: false, type: "string" },
    { name: "year", label: "Anno", required: false, type: "number" },
    { name: "condition", label: "Condizione", required: true, type: "string" },
    { name: "caseMaterial", label: "Materiale Cassa", required: true, type: "string" },
    { name: "braceletMaterial", label: "Materiale Bracciale", required: true, type: "string" },
    { name: "caseSize", label: "Dimensione Cassa", required: true, type: "number" },
    { name: "dialColor", label: "Colore Quadrante", required: true, type: "string" },
    { name: "movement", label: "Movimento", required: true, type: "string" },
    { name: "purchaseDate", label: "Data Acquisto", required: true, type: "date" },
    { name: "purchasePrice", label: "Prezzo Acquisto", required: true, type: "number" },
    { name: "sellingPrice", label: "Prezzo Vendita", required: true, type: "number" },
    { name: "accessories", label: "Accessori", required: false, type: "string" },
  ],
  suppliers: [
    { name: "name", label: "Nome", required: true, type: "string" },
    { name: "surname", label: "Cognome", required: true, type: "string" },
    { name: "document", label: "Documento", required: false, type: "string" },
    { name: "phone", label: "Telefono", required: false, type: "string" },
    { name: "email", label: "Email", required: false, type: "string" },
    { name: "notes", label: "Note", required: false, type: "string" },
  ],
  sales: [
    { name: "customerId", label: "ID Cliente", required: true, type: "number" },
    { name: "watchId", label: "ID Orologio", required: true, type: "number" },
    { name: "saleDate", label: "Data Vendita", required: true, type: "date" },
    { name: "salePrice", label: "Prezzo Vendita", required: true, type: "number" },
  ],
};

export default function ImportData() {
  const { toast } = useToast();
  const [fileType, setFileType] = useState<"csv" | "excel">("csv");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Selezione file, 2: Mappatura campi, 3: Anteprima, 4: Importazione
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>("customers");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importResults, setImportResults] = useState<{
    total: number;
    success: number;
    errors: {row: number, message: string}[];
  } | null>(null);

  // Reset lo stato quando cambia il tipo di entità
  useEffect(() => {
    setFieldMapping({});
  }, [selectedEntityType]);

  // Gestisce il caricamento del file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setStep(1); // Resetta i passi quando cambia il file
      setParsedData([]);
      setHeaders([]);
      setFieldMapping({});
      setImportResults(null);
    }
  };

  // Analizza il file selezionato
  const parseFile = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      if (fileType === "csv") {
        // Parsing CSV con Papaparse
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Record<string, string>[];
            setParsedData(data);
            
            // Estrai le intestazioni
            if (data.length > 0) {
              setHeaders(Object.keys(data[0]));
            }
            
            setIsLoading(false);
            setStep(2); // Vai alla mappatura dei campi
          },
          error: (error) => {
            console.error("Errore nel parsing CSV:", error);
            toast({
              title: "Errore",
              description: "Impossibile analizzare il file CSV",
              variant: "destructive",
            });
            setIsLoading(false);
          },
        });
      } else if (fileType === "excel") {
        // Parsing Excel con SheetJS
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: "binary" });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            setParsedData(jsonData as any[]);
            
            // Estrai le intestazioni
            if (jsonData.length > 0) {
              setHeaders(Object.keys(jsonData[0] as object));
            }
            
            setIsLoading(false);
            setStep(2); // Vai alla mappatura dei campi
          } catch (error) {
            console.error("Errore nel parsing Excel:", error);
            toast({
              title: "Errore",
              description: "Impossibile analizzare il file Excel",
              variant: "destructive",
            });
            setIsLoading(false);
          }
        };
        reader.onerror = () => {
          toast({
            title: "Errore",
            description: "Errore nella lettura del file",
            variant: "destructive",
          });
          setIsLoading(false);
        };
        reader.readAsBinaryString(selectedFile);
      }
    } catch (error) {
      console.error("Errore nell'analisi del file:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'analisi del file",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Gestisce la mappatura di un campo
  const handleFieldMapping = (entityField: string, fileField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [entityField]: fileField,
    }));
  };

  // Verifica se tutti i campi obbligatori sono mappati
  const isAllRequiredFieldsMapped = () => {
    const requiredFields = entityFields[selectedEntityType]
      .filter((field) => field.required)
      .map((field) => field.name);
    
    return requiredFields.every((field) => fieldMapping[field]);
  };

  // Converte i dati in base alla mappatura dei campi
  const convertData = () => {
    return parsedData.map((item) => {
      const convertedItem: Record<string, any> = {};
      
      // Per ogni campo dell'entità
      entityFields[selectedEntityType].forEach((field) => {
        // Se c'è una mappatura per questo campo
        if (fieldMapping[field.name]) {
          // Ottieni il valore dal dato originale
          let value = item[fieldMapping[field.name]];
          
          // Converti il valore in base al tipo
          if (field.type === "number") {
            value = value ? Number(value) : null;
          } else if (field.type === "date") {
            value = value ? new Date(value).toISOString() : null;
          }
          
          convertedItem[field.name] = value;
        }
      });
      
      return convertedItem;
    });
  };

  // Procede all'anteprima dei dati
  const goToPreview = () => {
    setStep(3);
  };

  // Invia i dati per l'importazione
  const importData = async () => {
    if (!isAllRequiredFieldsMapped()) {
      toast({
        title: "Mappatura incompleta",
        description: "Devi mappare tutti i campi obbligatori prima di importare",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const convertedData = convertData();
      
      const response = await apiRequest("POST", `/api/admin/import-${selectedEntityType}`, {
        data: convertedData,
      });
      
      const result = await response.json();
      setImportResults(result);
      
      toast({
        title: "Importazione completata",
        description: `Importati ${result.success} record su ${result.total}`,
        variant: result.success === result.total ? "default" : "destructive",
      });
      
      setStep(4); // Vai al riepilogo dell'importazione
    } catch (error) {
      console.error("Errore nell'importazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'importazione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset completo del form
  const resetForm = () => {
    setSelectedFile(null);
    setStep(1);
    setParsedData([]);
    setHeaders([]);
    setFieldMapping({});
    setImportResults(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Importazione Dati</h1>
        <p className="text-muted-foreground">Importa dati da un sistema esistente</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Migrazione dati</CardTitle>
          <CardDescription>
            Importa i tuoi dati da un file CSV o Excel e mappali ai campi del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Selezione del tipo di entità e caricamento del file */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block font-medium mb-1">Tipo di dati da importare</label>
                <Select 
                  value={selectedEntityType} 
                  onValueChange={(value) => setSelectedEntityType(value as EntityType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customers">Clienti</SelectItem>
                    <SelectItem value="watches">Orologi</SelectItem>
                    <SelectItem value="suppliers">Fornitori</SelectItem>
                    <SelectItem value="sales">Vendite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Tabs defaultValue="csv" value={fileType} onValueChange={(value) => setFileType(value as "csv" | "excel")}>
                <TabsList className="mb-4">
                  <TabsTrigger value="csv">CSV</TabsTrigger>
                  <TabsTrigger value="excel">Excel</TabsTrigger>
                </TabsList>
                
                <TabsContent value="csv" className="space-y-4">
                  <div className="border border-dashed rounded-md p-8 text-center">
                    <input
                      type="file"
                      accept=".csv"
                      id="csv-upload"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="csv-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                      <span className="font-medium mb-1">
                        {selectedFile ? selectedFile.name : "Seleziona un file CSV"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        o trascina qui il file
                      </span>
                    </label>
                  </div>
                </TabsContent>
                
                <TabsContent value="excel" className="space-y-4">
                  <div className="border border-dashed rounded-md p-8 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      id="excel-upload"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="excel-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                      <span className="font-medium mb-1">
                        {selectedFile ? selectedFile.name : "Seleziona un file Excel"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        o trascina qui il file
                      </span>
                    </label>
                  </div>
                </TabsContent>
              </Tabs>
              
              {selectedFile && (
                <Button
                  className="w-full"
                  onClick={parseFile}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisi in corso...
                    </>
                  ) : (
                    "Analizza file e procedi"
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Step 2: Mappatura dei campi */}
          {step === 2 && headers.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Mappa i campi</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Fai corrispondere i campi del tuo file con quelli del sistema.
                  I campi con asterisco (*) sono obbligatori.
                </p>
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/3">Campo del sistema</TableHead>
                        <TableHead>Campo nel file</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityFields[selectedEntityType].map((field) => (
                        <TableRow key={field.name}>
                          <TableCell className="font-medium">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={fieldMapping[field.name] || ""}
                              onValueChange={(value) => handleFieldMapping(field.name, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona campo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Ignora campo</SelectItem>
                                {headers.map((header) => (
                                  <SelectItem key={header} value={header}>
                                    {header}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Indietro
                </Button>
                <Button 
                  onClick={goToPreview}
                  disabled={!isAllRequiredFieldsMapped()}
                >
                  Anteprima e importazione
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Anteprima e Importazione */}
          {step === 3 && parsedData.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Anteprima dati</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Verifica i dati prima di importarli. Verranno importati {parsedData.length} record.
                </p>
                
                <div className="border rounded-md overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {entityFields[selectedEntityType]
                          .filter((field) => fieldMapping[field.name])
                          .map((field) => (
                            <TableHead key={field.name}>{field.label}</TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          {entityFields[selectedEntityType]
                            .filter((field) => fieldMapping[field.name])
                            .map((field) => (
                              <TableCell key={field.name}>
                                {item[fieldMapping[field.name]]}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {parsedData.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Visualizzando 10 record su {parsedData.length} totali
                  </p>
                )}
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Indietro
                </Button>
                <Button 
                  onClick={importData}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importazione in corso...
                    </>
                  ) : (
                    "Importa dati"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Risultati */}
          {step === 4 && importResults && (
            <div className="space-y-6">
              <div className="text-center p-6">
                {importResults.success === importResults.total ? (
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                ) : (
                  <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                )}
                
                <h3 className="text-xl font-medium mb-2">
                  Importazione completata
                </h3>
                
                <div className="text-lg mb-4">
                  Importati {importResults.success} record su {importResults.total}
                </div>
                
                {importResults.errors.length > 0 && (
                  <div className="mt-4 text-left">
                    <h4 className="text-lg font-medium mb-2">Errori</h4>
                    <div className="border rounded-md overflow-auto max-h-60">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Riga</TableHead>
                            <TableHead>Errore</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResults.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>{error.row}</TableCell>
                              <TableCell>{error.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center">
                <Button onClick={resetForm}>
                  Nuova importazione
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}