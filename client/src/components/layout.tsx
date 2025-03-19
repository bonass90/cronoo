import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Watch,
  TruckIcon,
  FileUp, // Cambio da FileImport a FileUp, che è disponibile in lucide-react
  ChevronRight,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle"; // Importazione del ThemeToggle

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Watches", href: "/watches", icon: Watch },
  { name: "Fornitori", href: "/suppliers", icon: TruckIcon },
  { name: "Importa Dati", href: "/import-data", icon: FileUp }, // Aggiornato a FileUp
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6",
              location === item.href
                ? "bg-gray-50 font-semibold text-primary dark:bg-gray-800"
                : "text-gray-700 hover:bg-gray-50 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.name}
            <ChevronRight
              className={cn(
                "ml-auto h-5 w-5 opacity-0 transition-opacity",
                location === item.href && "opacity-100"
              )}
            />
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen dark:bg-gray-900">
      {/* Mobile navigation */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 dark:bg-gray-800 dark:text-white">
          <nav className="flex flex-col gap-y-1 mt-8">
            <NavLinks />
          </nav>
          
          {/* Aggiungi Theme Toggle nel menu mobile */}
          <div className="absolute bottom-8 left-6">
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop navigation */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-semibold">Watch Manager</h1>
          </div>
          <nav className="flex flex-col gap-y-1">
            <NavLinks />
          </nav>
          
          {/* Aggiungi Theme Toggle nel menu desktop */}
          <div className="mt-auto flex justify-end pt-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <main className="py-10 px-6 dark:bg-gray-900 dark:text-white">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}