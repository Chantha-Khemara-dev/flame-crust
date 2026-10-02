import { useState, useEffect } from "react";
import { PackageOpen, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Use direct fetch since custom endpoints are not in generic CRUD
const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export default function InventoryDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const auth = JSON.parse(localStorage.getItem("adminAuth") || "{}");
      const url = new URL(`${VITE_API_URL}/inventory/reports/summary`);
      if (startDate) url.searchParams.append("startDate", startDate);
      if (endDate) url.searchParams.append("endDate", endDate);

      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${auth.token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch inventory summary");
      const json = await res.json();
      setData(json);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Tracking</h2>
          <p className="text-muted-foreground">Monitor ingredient stock movements</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
          <ArrowRight className="size-4 text-muted-foreground" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingredient Stock Summary</CardTitle>
          <CardDescription>Purchases (+), Usage (-), and Remaining Stock</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right text-emerald-600"><ArrowDownToLine className="inline size-3 mr-1" />Total In</TableHead>
                  <TableHead className="text-right text-rose-600"><ArrowUpFromLine className="inline size-3 mr-1" />Total Out</TableHead>
                  <TableHead className="text-right font-bold">Current Stock</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.ingredient_id}>
                    <TableCell className="font-medium">{row.ingredient_name}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell className="text-right text-emerald-600">+{parseFloat(row.total_in).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-rose-600">-{parseFloat(row.total_out).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">{parseFloat(row.current_stock).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${parseFloat(row.total_cost).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No inventory records found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
