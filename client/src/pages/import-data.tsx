import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { Upload, Loader2 } from "lucide-react";

// Tipo di entità da importare
type EntityType = "customers" | "watches" | "suppliers" | "sales";

// Interfaccia per i campi di ogni entità
interface EntityField {
  name: string;
  label: string;
  required: boolean;
}

// Definizione dei campi per ogni tipo di entità (completi)
const entityFields: Record<EntityType, EntityField[]> = {
  customers: [
    { name: "firstName", label: "Nome", required: true },
    { name: "lastName", label: "Cognome", required: true },
    { name: "address", label: "Indirizzo", required: true },
    { name: "email", label: "Email", required: false },
    { name: "phone", label: "Telefono", required: false },
  ],
  watches: [
    { name: "brand", label: "Marca", required: true },
    { name: "model", label: "Modello", required: true },
    { name: "reference", label: "Referenza", required: true },
    { name: "serialNumber", label: "Numero Seriale", required: false },
    { name: "year", label: "Anno", required: false },
    { name: "condition", label: "Condizione", required: true },
    { name: "caseMaterial", label: "Materiale Cassa", required: true },
    { name: "braceletMaterial", label: "Materiale Bracciale", required: true },
    { name: "caseSize", label: "Dimensione Cassa", required: true },
    { name: "dialColor", label: "Colore Quadrante", required: true },
    { name: "movement", label: "Movimento", required: true },
    { name: "purchaseDate", label: "Data Acquisto", required: true },
    { name: "purchasePrice", label: "Prezzo Acquisto", required: true },
    { name: "sellingPrice", label: "Prezzo Vendita", required: true },
    { name: "accessories", label: "Accessori", required: false },
    { name: "productCode", label: "Codice Prodotto", required: false },
    { name: "supplierId", label: "ID Fornitore", required: false },
  ],
  suppliers: [
    { name: "name", label: "Nome", required: true },
    { name: "surname", label: "Cognome", required: true },
    { name: "document", label: "Documento", required: false },
    { name: "phone", label: "Telefono", required: false },
    { name: "email", label: "Email", required: false },
    { name: "notes", label: "Note", required: false },
  ],
  sales: [
    { name: "customerId", label: "ID Cliente", required: true },
    { name: "watchId", label: "ID Orologio", required: true },
    { name: "saleDate", label: "Data Vendita", required: true },
    { name: "salePrice", label: "Prezzo Vendita", required: true },
  ],
};

export default function ImportData() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>("customers");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Gestisce il caricamento del file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setParsedData([]);
      setHeaders([]);
      setFieldMapping({});
      setErrorMessage(null);
    }
  };

  // Parsing del file
  const parseFile = () => {
    if (!selectedFile) {
      toast({
        title: "Errore",
        description: "Nessun file selezionato",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data;
          
          if (data && data.length > 0) {
            // Estrai intestazioni
            const fileHeaders = Object.keys(data[0]);
            
            setParsedData(data);
            setHeaders(fileHeaders);
            setCurrentStep(2);
          } else {
            setErrorMessage("Nessun dato trovato nel file");
          }
        } catch (err) {
          console.error("Error processing data:", err);
          setErrorMessage(`Errore nell'elaborazione: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      },
      error: (error) => {
        console.error("Parsing error:", error);
        setErrorMessage(`Errore nel parsing: ${error.message}`);
        setIsLoading(false);
      }
    });
  };

  // Gestisce la mappatura di un campo
  const handleFieldMapping = (entityField: string, fileField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [entityField]: fileField
    }));
  };

  // Verifica se i campi obbligatori sono mappati
  const isAllRequiredFieldsMapped = () => {
    const requiredFields = entityFields[selectedEntityType]
      .filter(field => field.required)
      .map(field => field.name);
    
    return requiredFields.every(field => fieldMapping[field]);
  };

  // Avanza al passaggio successivo
  const goToNextStep = () => {
    if (currentStep === 2 && !isAllRequiredFieldsMapped()) {
      toast({
        title: "Mappatura incompleta",
        description: "Devi mappare tutti i campi obbligatori prima di procedere",
        variant: "destructive"
      });
      return;
    }
    
    setCurrentStep(currentStep + 1);
  };

  // Torna al passo precedente
  const goBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Genera i dati mappati
  const getMappedData = () => {
    return parsedData.map(item => {
      const mappedItem: Record<string, any> = {};
      
      Object.entries(fieldMapping).forEach(([entityField, fileField]) => {
        if (fileField) {
          // Gestione speciale per i campi numerici e date
          let value = item[fileField];
          
          // Campo relativo all'anno
          if (entityField === 'year' && value) {
            value = parseInt(value, 10);
          }
          
          // Campi relativi ai prezzi
          if ((entityField === 'purchasePrice' || entityField === 'sellingPrice') && value) {
            // Rimuovi eventuali simboli di valuta e converti in numero
            const numericValue = value.toString().replace(/[^\d.,]/g, '').replace(',', '.');
            value = parseFloat(numericValue);
          }
          
          // Campo dimensione cassa
          if (entityField === 'caseSize' && value) {
            // Estrai solo la parte numerica
            const numericValue = value.toString().replace(/[^\d.,]/g, '').replace(',', '.');
            value = parseInt(numericValue, 10);
          }
          
          // Campo data acquisto o data vendita
          if ((entityField === 'purchaseDate' || entityField === 'saleDate') && value) {
            // Assicurati che la data sia in formato ISO
            try {
              const date = new Date(value);
              value = date.toISOString();
            } catch (e) {
              console.error(`Errore nella conversione della data: ${value}`, e);
            }
          }
          
          // Campo ID (fornitore, cliente, orologio)
          if ((entityField === 'supplierId' || entityField === 'customerId' || entityField === 'watchId') && value) {
            value = parseInt(value, 10);
          }
          
          mappedItem[entityField] = value;
        }
      });
      
      return mappedItem;
    });
  };

  // Importazione reale dei dati
  const importData = async () => {
    try {
      setIsLoading(true);
      const mappedData = getMappedData();
      
      console.log("Dati mappati da importare:", mappedData);
      
      // Chiama l'API corretta in base al tipo di entità selezionato
      const response = await fetch(`/api/admin/import-${selectedEntityType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: mappedData })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'importazione');
      }
      
      const result = await response.json();
      
      toast({
        title: "Importazione completata",
        description: `Importati ${result.success} record su ${result.total}`,
        variant: result.success === result.total ? "default" : "destructive",
      });
      
      // Reset del form
      setCurrentStep(1);
      setSelectedFile(null);
      setParsedData([]);
      setHeaders([]);
      setFieldMapping({});
      
    } catch (error) {
      console.error("Errore nell'importazione:", error);
      setErrorMessage(`Errore nell'importazione: ${error.message}`);
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante l'importazione: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderEntityTypeSelector = () => (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Tipo di dati da importare</label>
      <select 
        className="w-full p-2 border rounded"
        value={selectedEntityType}
        onChange={(e) => setSelectedEntityType(e.target.value as EntityType)}
      >
        <option value="customers">Clienti</option>
        <option value="watches">Orologi</option>
        <option value="suppliers">Fornitori</option>
        <option value="sales">Vendite</option>
      </select>
    </div>
  );

  const renderMappingTable = () => (
    <table className="min-w-full border">
      <thead>
        <tr className="bg-gray-100">
          <th className="border p-2 text-left w-1/3">Campo del sistema</th>
          <th className="border p-2 text-left">Campo nel file</th>
        </tr>
      </thead>
      <tbody>
        {entityFields[selectedEntityType].map((field) => (
          <tr key={field.name}>
            <td className="border p-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </td>
            <td className="border p-2">
              <select
                className="w-full p-2 border rounded"
                value={fieldMapping[field.name] || ""}
                onChange={(e) => handleFieldMapping(field.name, e.target.value)}
              >
                <option value="">Ignora campo</option>
                {headers.map((header) => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderPreviewTable = () => (
    <table className="min-w-full border">
      <thead>
        <tr className="bg-gray-100">
          {Object.entries(fieldMapping)
            .filter(([_, fileField]) => fileField)
            .map(([entityField]) => {
              const field = entityFields[selectedEntityType].find(f => f.name === entityField);
              return (
                <th key={entityField} className="border p-2 text-left">
                  {field?.label || entityField}
                </th>
              );
            })}
        </tr>
      </thead>
      <tbody>
        {getMappedData().slice(0, 5).map((item, index) => (
          <tr key={index}>
            {Object.entries(fieldMapping)
              .filter(([_, fileField]) => fileField)
              .map(([entityField]) => (
                <td key={`${index}-${entityField}`} className="border p-2">
                  {item[entityField] !== undefined ? String(item[entityField]) : ""}
                </td>
              ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Importazione Dati</h1>
        <p className="text-muted-foreground">Importa i tuoi dati nel sistema</p>
      </div>

      {errorMessage && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Errore! </strong>
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 ? "Step 1: Seleziona file" : 
             currentStep === 2 ? "Step 2: Mappa campi" :
             "Step 3: Anteprima ed importazione"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Selezione file */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {renderEntityTypeSelector()}
              
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
                </label>
              </div>
              
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
                    "Analizza file"
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Step 2: Mappatura campi */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Mappa i campi</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Associa ogni campo del sistema con il corrispondente campo nel file.
                  I campi contrassegnati con * sono obbligatori.
                </p>
                
                <div className="overflow-auto">
                  {renderMappingTable()}
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={goBack}>
                  Indietro
                </Button>
                <Button 
                  onClick={goToNextStep}
                  disabled={!isAllRequiredFieldsMapped()}
                >
                  Anteprima
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Anteprima */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Anteprima dati</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ecco come i dati verranno importati nel sistema. Totale: {parsedData.length} record.
                </p>
                
                <div className="overflow-auto">
                  {renderPreviewTable()}
                </div>
                
                {parsedData.length > 5 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Visualizzando 5 record su {parsedData.length} totali
                  </p>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={goBack}>
                  Indietro
                </Button>
                <Button onClick={importData} disabled={isLoading}>
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
        </CardContent>
      </Card>
    </div>
  );
}