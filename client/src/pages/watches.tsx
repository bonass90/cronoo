import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Watch } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import WatchForm from "@/components/watch-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PlusCircle, Edit2 } from "lucide-react";

export default function Watches() {
  const { toast } = useToast();
  const [editingPrice, setEditingPrice] = useState<{
    id: number;
    price: string;
  } | null>(null);

  const { data: watches, refetch } = useQuery<Watch[]>({
    queryKey: ["/api/watches"],
  });

  const handlePriceUpdate = async (id: number, newPrice: number) => {
    try {
      await apiRequest("PATCH", `/api/watches/${id}/price`, { price: newPrice });
      await queryClient.invalidateQueries({ queryKey: ["/api/watches"] });
      setEditingPrice(null);
      toast({
        title: "Success",
        description: "Price updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update price",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Watches</h1>
          <p className="text-muted-foreground">Manage your watch inventory.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Watch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Watch</DialogTitle>
            </DialogHeader>
            <WatchForm onSuccess={refetch} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Case Size</TableHead>
              <TableHead>Dial Color</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Units Sold</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watches?.map((watch) => (
              <TableRow key={watch.id}>
                <TableCell className="font-medium">{watch.brand}</TableCell>
                <TableCell>{watch.reference}</TableCell>
                <TableCell>{watch.caseSize}mm</TableCell>
                <TableCell>{watch.dialColor}</TableCell>
                <TableCell>€{Number(watch.purchasePrice).toLocaleString()}</TableCell>
                <TableCell>
                  {editingPrice?.id === watch.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editingPrice.price}
                        onChange={(e) =>
                          setEditingPrice({
                            id: watch.id,
                            price: e.target.value,
                          })
                        }
                        className="w-24"
                      />
                      <Button
                        size="sm"
                        onClick={() =>
                          handlePriceUpdate(watch.id, Number(editingPrice.price))
                        }
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      €{Number(watch.sellingPrice).toLocaleString()}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditingPrice({
                            id: watch.id,
                            price: watch.sellingPrice.toString(),
                          })
                        }
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>{watch.sold}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
