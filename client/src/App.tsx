import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { LanguageProvider } from "@/contexts/LanguageContext";

import Dashboard from "@/pages/Dashboard";
import TicketList from "@/pages/TicketList";
import TicketDetail from "@/pages/TicketDetail";
import KnowledgeBase from "@/pages/KnowledgeBase";
import UserTickets from "@/pages/UserTickets";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/not-found";
import { useLocation } from "wouter";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Public routes (no auth required)
  if (location === "/login" || location === "/register") {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Protected routes (auth required)
  if (!user) {
    return <Landing />;
  }

  const isAdmin = user.role === "admin";

  if (isAdmin) {
    return (
      <ProtectedLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/tickets" component={TicketList} />
          <Route path="/tickets/:id" component={TicketDetail} />
          <Route path="/knowledge" component={KnowledgeBase} />
          <Route component={NotFound} />
        </Switch>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <Switch>
        <Route path="/" component={UserTickets} />
        <Route path="/tickets/:id" component={TicketDetail} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
