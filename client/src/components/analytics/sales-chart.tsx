import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } from "recharts";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  
  interface SalesChartProps {
    data: any[];
    title: string;
    dataKey: string;
    nameKey: string;
  }
  
  export default function SalesChart({
    data,
    title,
    dataKey,
    nameKey,
  }: SalesChartProps) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={nameKey}
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={dataKey} fill="hsl(142.1 76.2% 36.3%)"  radius={[20, 20, 20, 20]}  />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }