import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createTRPCContext } from "@/server/trpc";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

const handler = async (req: NextRequest) => {
  let clerkId = "";
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const session = await auth();
      clerkId = session.userId ?? "";
      console.log(`[tRPC Route] Auth session userId: ${session.userId} for ${req.url}`);
    } catch (e) {
      console.error("[Route Auth Error]", e);
    }
  }

  if (!clerkId && process.env.NODE_ENV === "development") {
    clerkId = req.headers.get("x-user-id") || "dev_user_001";
    console.log(`[tRPC Route] Falling back to simulated user: ${clerkId}`);
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers, clerkId }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };

