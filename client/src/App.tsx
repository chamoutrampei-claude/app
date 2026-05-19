import AppLayout from "@/components/AppLayout";
import DevPanel from "@/components/DevPanel";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminDisputes from "@/pages/AdminDisputes";
import Account from "@/pages/Account";
import ClientDashboard from "@/pages/ClientDashboard";
import ClientProfile from "@/pages/ClientProfile";
import CreateServiceRequest from "@/pages/CreateServiceRequest";
import Disputes from "@/pages/Disputes";
import History from "@/pages/History";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Privacy from "@/pages/Privacy";
import PublicWorkerProfile from "@/pages/PublicWorkerProfile";
import SearchWorkers from "@/pages/SearchWorkers";
import Terms from "@/pages/Terms";
import WorkerDashboard from "@/pages/WorkerDashboard";
import WorkerAvailability from "@/pages/WorkerAvailability";
import WorkerProfile from "@/pages/WorkerProfile";
import WorkerReferrals from "@/pages/WorkerReferrals";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function AppRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/trampista/:userId" component={PublicWorkerProfile} />
      <Route path="/curriculo/:userId" component={PublicWorkerProfile} />
      <Route path="/worker"><AppRoute component={WorkerDashboard} /></Route>
      <Route path="/worker/profile"><AppRoute component={WorkerProfile} /></Route>
      <Route path="/worker/availability"><AppRoute component={WorkerAvailability} /></Route>
      <Route path="/worker/referrals"><AppRoute component={WorkerReferrals} /></Route>
      <Route path="/worker/history"><AppRoute component={History} /></Route>
      <Route path="/client"><AppRoute component={ClientDashboard} /></Route>
      <Route path="/client/profile"><AppRoute component={ClientProfile} /></Route>
      <Route path="/client/request/new"><AppRoute component={CreateServiceRequest} /></Route>
      <Route path="/client/search"><AppRoute component={SearchWorkers} /></Route>
      <Route path="/client/history"><AppRoute component={History} /></Route>
      <Route path="/admin"><AppRoute component={AdminDashboard} /></Route>
      <Route path="/admin/referrals"><AppRoute component={AdminDashboard} /></Route>
      <Route path="/admin/disputes"><AppRoute component={AdminDisputes} /></Route>
      <Route path="/disputes"><AppRoute component={Disputes} /></Route>
      <Route path="/account"><AppRoute component={Account} /></Route>
      <Route path="/404" component={NotFound} />
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
          <DevPanel />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
