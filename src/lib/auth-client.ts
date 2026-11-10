"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin: requests go to /api/auth/*, where the server-side rate limiter applies.
export const authClient = createAuthClient();
