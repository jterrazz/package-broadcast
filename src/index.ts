// Ports
export type {
  Broadcast,
  BroadcastAudience,
  BroadcastBadge,
  BroadcastProviderPort,
  BroadcastResult,
} from "./ports/broadcast.port.js";

// Core
export { sendBroadcast } from "./send-broadcast.js";

// Adapters - Apple
export {
  AppleAppStoreAdapter,
  type AppleAppStoreConfig,
  AppleAppStoreError,
} from "./adapters/apple/apple-app-store.adapter.js";
export { createAppleJwt, type AppleAuthConfig } from "./adapters/apple/apple-auth.js";
