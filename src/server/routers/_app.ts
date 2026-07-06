import { createTRPCRouter } from "../trpc";
import { leadsRouter } from "./leads";
import { foldersRouter } from "./folders";
import { researchRouter } from "./research";
import { outreachRouter } from "./outreach";

export const appRouter = createTRPCRouter({
  leads: leadsRouter,
  folders: foldersRouter,
  research: researchRouter,
  outreach: outreachRouter,
});

export type AppRouter = typeof appRouter;
