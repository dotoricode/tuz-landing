import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Next internals, api/admin routes (Payload), and static files
  matcher: [
    "/((?!api|admin|_next|_vercel|.*\\..*).*)",
  ],
};
