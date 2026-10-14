// The leading '-' keeps this native upgrade route out of TanStack's page router.
// Nitro mounts it explicitly; the development adapter uses the same hooks.
import { defineWebSocketHandler } from "h3";
import { socketHooks } from "../../../games/outpost/realtime.server";
export default defineWebSocketHandler(socketHooks);
