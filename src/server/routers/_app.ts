import { createTRPCRouter } from "../trpc";
import { leadsRouter }     from "./leads";
import { foldersRouter }   from "./folders";
import { tagsRouter }      from "./tags";
import { researchRouter }  from "./research";
import { outreachRouter }  from "./outreach";
import { workspaceRouter } from "./workspace";
import { agencyRouter }    from "./agency";
import { discoveryRouter } from "./discovery";
import { monitorRouter }   from "./monitor";

export const appRouter = createTRPCRouter({
  leads:     leadsRouter,
  folders:   foldersRouter,
  tags:      tagsRouter,
  research:  researchRouter,
  outreach:  outreachRouter,
  workspace: workspaceRouter,
  agency:    agencyRouter,
  discovery: discoveryRouter,
  monitor:   monitorRouter,
});

export type AppRouter = typeof appRouter;
