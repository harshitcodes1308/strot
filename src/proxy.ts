import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/agency(.*)",
  "/api/trpc(.*)",
  "/api/health",
  "/api/inngest(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const authData = await auth();
    console.log(`[Middleware] Protected route ${request.nextUrl.pathname} | userId: ${authData.userId}`);
    await auth.protect();
  } else {
    const authData = await auth();
    console.log(`[Middleware] Public route ${request.nextUrl.pathname} | userId: ${authData.userId}`);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
