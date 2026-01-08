/**
 * MSW Server Setup for Node Environment (Vitest)
 * Per test-plan.md section 3.2
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
