import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subDays, format, parseISO, isAfter, startOfDay } from "date-fns";

interface SalesHistoryChartProps {
  salesData: Array<{
    id: number;
    saleDate: string;
    salePrice: string | number;
    watchId: number;
    customerId: number;
  }>;
  watches?: Array<{
    id: number;
    brand: string;
    model: string;
  }>;
}

type TimeRange = "30d" | "90d" | "360d" | "all";

export default function SalesHistoryChart({ salesData, watches = [] }: SalesHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  
  // Watchmap per lookup veloce
  const watchMap = useMemo(() => {
    return watches.reduce((acc, watch) => {
      acc[watch.id] = watch;
      return acc;
    }, {} as Record<number, typeof watches[0]>);
  }, [watches]);
  
  // Filtra i dati in base al range temporale
  const filteredData = useMemo(() => {
    if (!salesData || !salesData.length) return [];
    
    const now = new Date();
    let cutoffDate: Date;
    
    if (timeRange === "30d") {
      cutoffDate = subDays(now, 30);
    } else if (timeRange === "90d") {
      cutoffDate = subDays(now, 90);
    } else if (timeRange === "360d") {
      cutoffDate = subDays(now, 360);
    } else {
      // "all" - nessun filtro 
      cutoffDate = new Date(0); // Jan 1, 1970
    }
    
    // Converti a inizio giorno per evitare problemi con le ore
    cutoffDate = startOfDay(cutoffDate);
    
    return salesData.filter(sale => {
      const saleDate = parseISO(sale.saleDate as string);
      return isAfter(saleDate, cutoffDate);
    });
  }, [salesData, timeRange]);
  
  // Aggrega i dati per giorno
  const chartData = useMemo(() => {
    if (!filteredData.length) return [];
    
    const dailyData: Record<string, {
      date: string;
      totalSales: number;
      count: number;
      watches: string[];
    }> = {};
    
    filteredData.forEach(sale => {
      const dateStr = format(parseISO(sale.saleDate as string), 'yyyy-MM-dd');
      const price = typeof sale.salePrice === 'string' ? parseFloat(sale.salePrice) : sale.salePrice;
      
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = {
          date: dateStr,
          totalSales: 0,
          count: 0,
          watches: []
        };
      }
      
      dailyData[dateStr].totalSales += price;
      dailyData[dateStr].count += 1;
      
      // Aggiungi info sull'orologio se disponibile
      const watch = watchMap[sale.watchId];
      if (watch) {
        dailyData[dateStr].watches.push(`${watch.brand} ${watch.model}`);
      }
    });
    
    // Converti l'oggetto in array e ordina per data
    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData, watchMap]);
  
  // Formatta le etichette dell'asse X
  const formatXAxis = (dateStr: string) => {
    return format(parseISO(dateStr), 'dd/MM');
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded p-2 shadow-md">
          <p className="font-medium">{format(parseISO(label), 'dd MMMM yyyy')}</p>
          <p>Vendite totali: €{data.totalSales.toLocaleString()}</p>
          <p>Orologi venduti: {data.count}</p>
          {data.watches.length > 0 && (
            <div className="mt-1 text-xs">
              <p className="font-medium">Orologi:</p>
              <ul className="list-disc pl-4">
                {data.watches.map((watch: string, i: number) => (
                  <li key={i}>{watch}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Storico Vendite</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant={timeRange === "30d" ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimeRange("30d")}
          >
            30 giorni
          </Button>
          <Button 
            variant={timeRange === "90d" ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimeRange("90d")}
          >
            90 giorni
          </Button>
          <Button 
            variant={timeRange === "360d" ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimeRange("360d")}
          >
            1 anno
          </Button>
          <Button 
            variant={timeRange === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimeRange("all")}
          >
            Tutto
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[400px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis} 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={(value) => `€${value.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalSales"
                name="Vendite (€)"
                stroke="hsl(142.1 76.2% 36.3%)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Nessuna vendita disponibile nel periodo selezionato
          </div>
        )}
      </CardContent>
    </Card>
  );
}