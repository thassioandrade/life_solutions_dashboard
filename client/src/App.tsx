import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Trafego from "./pages/Trafego";
import Consultores from "./pages/Consultores";
import Agendamentos from "./pages/Agendamentos";
import Pipeline from "./pages/Pipeline";
import Despesas from "./pages/Despesas";
import Configuracoes from "./pages/Configuracoes";
import PainelConsultor from "./pages/PainelConsultor";
import Agendar from "./pages/Agendar";
import Vendas from "./pages/Vendas";
import Parcelas from "./pages/Parcelas";
import ServicosVendidos from "./pages/ServicosVendidos";
import Promessas from "./pages/Promessas";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/trafego" component={Trafego} />
      <Route path="/consultores" component={Consultores} />
      <Route path="/agendamentos" component={Agendamentos} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/despesas" component={Despesas} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/painel" component={PainelConsultor} />
      <Route path="/agendar" component={Agendar} />
      <Route path="/vendas" component={Vendas} />
      <Route path="/parcelas" component={Parcelas} />
      <Route path="/servicos-vendidos" component={ServicosVendidos} />
      <Route path="/promessas" component={Promessas} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
