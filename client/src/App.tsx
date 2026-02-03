import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PlayerSearch from "./pages/PlayerSearch";
import Panels from "./pages/Panels";
import Analytics from "./pages/Analytics";
import Transactions from "./pages/Transactions";
import Deposits from "./pages/Deposits";
import Withdrawals from "./pages/Withdrawals";
import BankAccounts from "./pages/BankAccounts";
import Players from "./pages/Players";
import Reports from "./pages/Reports";
import ExtraWrongTransactions from "./pages/ExtraWrongTransactions";
import TodaysPlayersReport from "./pages/TodaysPlayersReport";
import PanelDetail from "./pages/PanelDetail";
import Gameplay from "./pages/Gameplay";
import AdminLogin from "./pages/AdminLogin";
import Settings from "./pages/Settings";
import PanelHistory from "./pages/PanelHistory";
import TopUpMonitor from "./pages/TopUpMonitor";
import { RealtimeDashboard } from "./components/RealtimeDashboard";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "./lib/trpc";

function Router() {
  const { data: user, isLoading } = trpc.standaloneAuth.me.useQuery();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <AdminLogin />;
  }

  // Show app routes if authenticated
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/quick-actions"} component={PlayerSearch} />
      <Route path={"/panels"} component={Panels} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/transactions"} component={Transactions} />
      <Route path={"/deposits"} component={Deposits} />
      <Route path={"/withdrawals"} component={Withdrawals} />
      <Route path={"/extra-wrong"} component={ExtraWrongTransactions} />
      <Route path={"/gameplay"} component={Gameplay} />
      <Route path={"/bank-accounts"} component={BankAccounts} />
      <Route path={"/players"} component={Players} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/todays-players-report"} component={TodaysPlayersReport} />
      <Route path={"/panel/:panelName"} component={PanelDetail} />
      <Route path={"/panel-history"} component={PanelHistory} />
      <Route path={"/top-up-monitor"} component={TopUpMonitor} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
