import { createTRPCRouter } from "../trpc";
import { leadsRouter } from "./leads";
import { foldersRouter } from "./folders";
import { researchRouter } from "./research";

export const appRouter = createTRPCRouter({
  leads: leadsRouter,
  folders: foldersRouter,
  research: researchRouter,
});

export type AppRouter = typeof appRouter;
