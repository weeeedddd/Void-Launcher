import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootApp from "./RootApp";
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
    <QueryClientProvider client={queryClient}>
      {/* RootApp runs the global stage machine (startup → installer → dashboard). */}
      <RootApp />
    </QueryClientProvider>
  </React.StrictMode>,
);
