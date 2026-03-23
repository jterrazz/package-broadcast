import { describe, expect, it, vi } from "vitest";

import type { Broadcast, BroadcastProviderPort, BroadcastResult } from "../ports/broadcast.port.js";
import { sendBroadcast } from "../send-broadcast.js";

const makeBroadcast = (overrides?: Partial<Broadcast>): Broadcast => ({
  audience: "all",
  badge: "special-event",
  endDate: new Date("2026-04-15"),
  longDescription: "Join us for a special live event with exclusive content.",
  priority: "normal",
  shortDescription: "Live event this weekend!",
  startDate: new Date("2026-04-01"),
  title: "Spring Event",
  ...overrides,
});

const makeProvider = (name: string, result?: Partial<BroadcastResult>): BroadcastProviderPort => ({
  create: vi.fn().mockResolvedValue({
    id: "provider-123",
    provider: name,
    status: "created",
    ...result,
  }),
  delete: vi.fn(),
  list: vi.fn().mockResolvedValue([]),
  name,
  update: vi.fn(),
});

describe("sendBroadcast", () => {
  it("should send to a single provider", async () => {
    const provider = makeProvider("test-provider");
    const broadcast = makeBroadcast();

    const results = await sendBroadcast(broadcast, [provider]);

    expect(results).toHaveLength(1);
    expect(results[0].provider).toBe("test-provider");
    expect(results[0].status).toBe("created");
    expect(provider.create).toHaveBeenCalledWith(broadcast);
  });

  it("should send to multiple providers concurrently", async () => {
    const provider1 = makeProvider("apple", { id: "apple-1" });
    const provider2 = makeProvider("google", { id: "google-1" });
    const broadcast = makeBroadcast();

    const results = await sendBroadcast(broadcast, [provider1, provider2]);

    expect(results).toHaveLength(2);
    expect(results[0].provider).toBe("apple");
    expect(results[1].provider).toBe("google");
  });

  it("should handle provider failures gracefully", async () => {
    const successProvider = makeProvider("apple");
    const failProvider: BroadcastProviderPort = {
      create: vi.fn().mockRejectedValue(new Error("API down")),
      delete: vi.fn(),
      list: vi.fn(),
      name: "broken",
      update: vi.fn(),
    };

    const results = await sendBroadcast(makeBroadcast(), [successProvider, failProvider]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("created");
    expect(results[1].status).toBe("failed");
    expect(results[1].provider).toBe("broken");
  });
});
