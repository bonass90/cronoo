import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Watches from "@/pages/watches";
import Suppliers from "@/pages/suppliers";
import ImportData from "@/pages/import-data";
import Categories from "@/pages/categories";
import Products from "@/pages/products";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/theme-provider";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/watches" component={Watches} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/import-data" component={ImportData} />
        <Route path="/categories" component={Categories} />
        <Route path="/products" component={Products} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;