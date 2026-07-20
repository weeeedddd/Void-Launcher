import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VoidClientApp } from "./VoidClientApp";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import "@fontsource-variable/space-grotesk";
import "@fontsource/orbitron/600.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/orbitron/900.css";
import "./styles/theme.css";

// One QueryClient for the whole app — caches mod searches, instance lists, …
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // search results stay fresh for a minute
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <VoidClientApp />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
