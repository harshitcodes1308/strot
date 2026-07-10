"use client";

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useState } from "react";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import toast from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if ((error as any).data?.code !== "UNAUTHORIZED") {
          toast.error(`Error: ${error.message || "Failed to fetch data"}`);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        toast.error(`Error: ${error.message || "Action failed"}`);
      },
    }),
  }));
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          headers() {
            if (typeof window !== "undefined") {
              const simulatedUserId = localStorage.getItem("simulated-user-id");
              if (simulatedUserId) {
                return {
                  "x-user-id": simulatedUserId,
                };
              }
            }
            return {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
