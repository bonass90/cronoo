import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, Users, Watch, TrendingUp } from "lucide-react";

interface MetricsCardsProps {
  totalRevenue: number;
  totalProfit: number;
  totalCustomers: number;
  totalWatches: number;
}

export default function MetricsCards({
  totalRevenue,
  totalProfit,
  totalCustomers,
  totalWatches,
}: MetricsCardsProps) {
  const metrics = [
    {
      title: "Total Revenue",
      value: `€${totalRevenue.toLocaleString()}`,
      icon: Euro,
      iconColor: "text-blue-500 dark:text-blue-400",
    },
    {
      title: "Total Profit",
      value: `€${totalProfit.toLocaleString()}`,
      icon: TrendingUp,
      iconColor: "text-green-500 dark:text-green-400",
    },
    {
      title: "Total Customers",
      value: totalCustomers,
      icon: Users,
      iconColor: "text-orange-500 dark:text-orange-400",
    },
    {
      title: "Watch Models",
      value: totalWatches,
      icon: Watch,
      iconColor: "text-purple-500 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <metric.icon className={`h-4 w-4 ${metric.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}