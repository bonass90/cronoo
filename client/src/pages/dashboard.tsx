import { useQuery } from "@tanstack/react-query";
import type { Customer, Sale, Watch } from "@shared/schema";
import MetricsCards from "@/components/analytics/metrics-cards";
import SalesChart from "@/components/analytics/sales-chart";

export default function Dashboard() {
  const { data: watches } = useQuery<Watch[]>({ 
    queryKey: ["/api/watches"]
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"]
  });

  // Prepare data for analytics
  const watchesByCaseSize = watches?.reduce((acc: Record<number, number>, watch) => {
    acc[watch.caseSize] = (acc[watch.caseSize] || 0) + watch.sold;
    return acc;
  }, {});

  const watchesByDialColor = watches?.reduce((acc: Record<string, number>, watch) => {
    acc[watch.dialColor] = (acc[watch.dialColor] || 0) + watch.sold;
    return acc;
  }, {});

  // Transform data for charts
  const caseSizeData = watchesByCaseSize ? 
    Object.entries(watchesByCaseSize).map(([size, count]) => ({
      size: `${size}mm`,
      sales: count
    })) : [];

  const dialColorData = watchesByDialColor ?
    Object.entries(watchesByDialColor).map(([color, count]) => ({
      color,
      sales: count
    })) : [];

  // Calculate total revenue and costs
  const totalRevenue = sales?.reduce((sum, sale) => sum + Number(sale.salePrice), 0) || 0;
  const totalCosts = watches?.reduce((sum, watch) => sum + Number(watch.purchasePrice) * watch.sold, 0) || 0;
  const totalProfit = totalRevenue - totalCosts;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your watch business at a glance.</p>
      </div>

      <MetricsCards
        totalRevenue={totalRevenue}
        totalProfit={totalProfit}
        totalCustomers={customers?.length || 0}
        totalWatches={watches?.length || 0}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <SalesChart
          data={caseSizeData}
          title="Sales by Case Size"
          dataKey="sales"
          nameKey="size"
        />
        <SalesChart
          data={dialColorData}
          title="Sales by Dial Color"
          dataKey="sales"
          nameKey="color"
        />
      </div>
    </div>
  );
}