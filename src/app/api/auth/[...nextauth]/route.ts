/**
 * Auth.js v5 catch-all route handler.
 *
 * Re-exports the GET and POST handlers from the singleton at
 * `src/lib/auth.ts`. Auth.js wires its own endpoint contracts
 * (callback, session, csrf, signin, signout, …) under this path.
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
