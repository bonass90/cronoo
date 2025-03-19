// Funzione per convertire una stringa in slug URL-friendly
export function slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')       // Sostituisce spazi con trattini
      .replace(/[^\w\-]+/g, '')   // Rimuove caratteri non alfanumerici
      .replace(/\-\-+/g, '-')     // Sostituisce più trattini con uno solo
      .replace(/^-+/, '')         // Rimuove trattini all'inizio
      .replace(/-+$/, '');        // Rimuove trattini alla fine
  }
  
  // Funzione per generare un codice prodotto unico
  export function generateProductCode(categoryName: string, index?: number): string {
    const prefix = categoryName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().substring(5, 10);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return index !== undefined 
      ? `${prefix}-${timestamp}${random}-${index}`
      : `${prefix}-${timestamp}${random}`;
  }
  
  // Funzione per convertire un tipo a stringa
  export function valueToString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  }
  
  // Funzione per analizzare un valore stringa in base al tipo richiesto
  export function parseValue(value: string, type: string): any {
    if (!value) return null;
    
    switch (type) {
      case 'number':
        return parseFloat(value.replace(/[^\d.-]/g, ''));
      case 'date':
        return new Date(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      default:
        return value;
    }
  }