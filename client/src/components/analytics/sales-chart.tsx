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
import { useTheme } from "@/components/theme-provider";

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
  const { theme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  // Colors that work well in both light and dark modes
  const barColor = isDark ? "hsl(142.1 76.2% 46.3%)" : "hsl(142.1 76.2% 36.3%)";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const textColor = isDark ? "#e1e1e1" : "#333333";

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey={nameKey}
              tick={{ fontSize: 12, fill: textColor }}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis tick={{ fill: textColor }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? "#1f2937" : "#fff",
                borderColor: isDark ? "#374151" : "#e5e7eb",
                color: textColor
              }}
            />
            <Legend />
            <Bar dataKey={dataKey} fill={barColor} radius={[20, 20, 20, 20]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}