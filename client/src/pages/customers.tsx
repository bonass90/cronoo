import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CustomerForm from "@/components/customer-form";
import { UserPlus } from "lucide-react";

export default function Customers() {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { data: customers, refetch } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const sortedCustomers = customers?.slice().sort((a, b) => {
    const diff = Number(b.totalSpent) - Number(a.totalSpent);
    return sortOrder === "desc" ? diff : -diff;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <CustomerForm onSuccess={refetch} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
        >
          Sort by Total Spent {sortOrder === "desc" ? "↓" : "↑"}
        </Button>
      </div>

      <div className="grid gap-4">
        {sortedCustomers?.map((customer) => (
          <Card key={customer.id} className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">
                  {customer.firstName} {customer.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">{customer.address}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  Total Spent: €{Number(customer.totalSpent).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
