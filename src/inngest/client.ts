import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ 
  id: "strot-scraper",
  eventKey: process.env.INNGEST_EVENT_KEY || "local",
  baseUrl: process.env.NODE_ENV === "production" ? undefined : "http://127.0.0.1:8288/"
});
