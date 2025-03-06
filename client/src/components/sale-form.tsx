import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSaleSchema, insertCustomerSchema, type Watch, type Customer } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function SaleForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [isNewCustomer, setIsNewCustomer] = useState(true);

  const { data: watches } = useQuery<Watch[]>({
    queryKey: ["/api/watches"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm({
    resolver: zodResolver(
      isNewCustomer
        ? insertCustomerSchema.merge(insertSaleSchema)
        : insertSaleSchema
    ),
    defaultValues: {
      firstName: "",
      lastName: "",
      address: "",
      watchId: "",
      customerId: "",
      saleDate: new Date().toISOString().split("T")[0],
      salePrice: "",
    },
  });

  async function onSubmit(data: any) {
    try {
      let customerId = data.customerId;

      if (isNewCustomer) {
        // Create new customer first
        const customerResponse = await apiRequest("POST", "/api/customers", {
          firstName: data.firstName,
          lastName: data.lastName,
          address: data.address,
        });
        const newCustomer = await customerResponse.json();
        customerId = newCustomer.id;
      }

      // Create the sale
      await apiRequest("POST", "/api/sales", {
        customerId,
        watchId: parseInt(data.watchId),
        saleDate: new Date(data.saleDate).toISOString(),
        salePrice: parseFloat(data.salePrice),
      });

      toast({
        title: "Success",
        description: "Sale registered successfully",
      });
      form.reset();
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to register sale",
        variant: "destructive",
      });
    }
  }

  const selectedWatch = watches?.find(
    (w) => w.id.toString() === form.watch("watchId")
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex gap-4 items-center">
          <Button
            type="button"
            variant={isNewCustomer ? "default" : "outline"}
            onClick={() => setIsNewCustomer(true)}
          >
            New Customer
          </Button>
          <Button
            type="button"
            variant={!isNewCustomer ? "default" : "outline"}
            onClick={() => setIsNewCustomer(false)}
          >
            Existing Customer
          </Button>
        </div>

        {isNewCustomer ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Customer</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem
                        key={customer.id}
                        value={customer.id.toString()}
                      >
                        {customer.firstName} {customer.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="watchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Watch</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a watch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {watches?.map((watch) => (
                    <SelectItem key={watch.id} value={watch.id.toString()}>
                      {watch.brand} {watch.reference} - €
                      {Number(watch.sellingPrice).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saleDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sale Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="salePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sale Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={
                    selectedWatch
                      ? `Suggested: €${Number(
                          selectedWatch.sellingPrice
                        ).toLocaleString()}`
                      : ""
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Complete Sale
        </Button>
      </form>
    </Form>
  );
}
