import { createTRPCRouter } from "../trpc";
import { leadsRouter } from "./leads";
import { foldersRouter } from "./folders";
import { researchRouter } from "./research";
import { outreachRouter } from "./outreach";
import { workspaceRouter } from "./workspace";
import { agencyRouter } from "./agency";

export const appRouter = createTRPCRouter({
  leads: leadsRouter,
  folders: foldersRouter,
  research: researchRouter,
  outreach: outreachRouter,
  workspace: workspaceRouter,
  agency: agencyRouter,
});

export type AppRouter = typeof appRouter;
