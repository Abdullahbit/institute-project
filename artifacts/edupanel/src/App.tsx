import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Program from "@/pages/Program";
import Ogretmenler from "@/pages/Ogretmenler";
import SaatTakibi from "@/pages/SaatTakibi";
import Uyarilar from "@/pages/Uyarilar";
import Ayarlar from "@/pages/Ayarlar";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/program" component={Program} />
      <Route path="/ogretmenler" component={Ogretmenler} />
      <Route path="/saat-takibi" component={SaatTakibi} />
      <Route path="/uyarilar" component={Uyarilar} />
      <Route path="/ayarlar" component={Ayarlar} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
