import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";

import LoginPage from "@/pages/login";
import HomeDashboard from "@/pages/home";
import AIToolkit from "@/pages/ai-toolkit";
import ContentLibrary from "@/pages/content-library";
import SMEReview from "@/pages/sme-review";
import SettingsPage from "@/pages/settings";
import DealQualifier from "@/pages/deal-qualifier";
import ObjectionSimulator from "@/pages/objection-simulator";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();

  if (location === "/" || location === "/login") {
    return (
      <Switch>
        <Route path="/" component={() => <Redirect to="/login" />} />
        <Route path="/login" component={LoginPage} />
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/home" component={HomeDashboard} />
        <Route path="/ai-toolkit" component={AIToolkit} />
        <Route path="/content" component={ContentLibrary} />
        <Route path="/sme-review" component={SMEReview} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/deal-qualifier" component={DealQualifier} />
        <Route path="/objection-simulator" component={ObjectionSimulator} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="rh-theme" themes={["dark", "light"]}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
