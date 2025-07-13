import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Soci from "./pages/Soci";
import Ospiti from "./pages/Ospiti";
import Prenotazioni from "./pages/Prenotazioni";
import Tariffe from "./pages/Tariffe";
import Report from "./pages/Report";
import ReportInsoluti from "./pages/ReportInsoluti";
import ReportFinanziario from "./pages/ReportFinanziario";
import ReportOspitiIva from "./pages/ReportOspitiIva";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="soci" element={<Soci />} />
            <Route path="ospiti" element={<Ospiti />} />
            <Route path="prenotazioni" element={<Prenotazioni />} />
            <Route path="tariffe" element={<Tariffe />} />
            <Route path="report" element={<Report />} />
            <Route path="insoluti" element={<ReportInsoluti />} />
            <Route path="finanze" element={<ReportFinanziario />} />
            <Route path="iva-ospiti" element={<ReportOspitiIva />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
