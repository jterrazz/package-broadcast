import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Broadcast } from "../../../ports/broadcast.port.js";
import { AppleAppStoreAdapter, AppleAppStoreError } from "../apple-app-store.adapter.js";

// Mock the JWT generation to avoid needing a real private key
vi.mock("../apple-auth.js", () => ({
  createAppleJwt: vi.fn().mockResolvedValue("mock-jwt-token"),
}));

const BASE_URL = "https://api.appstoreconnect.apple.com/v1";

const TEST_CONFIG = {
  appId: "6444444444",
  issuerId: "test-issuer",
  keyId: "TEST_KEY",
  privateKey: "not-used-because-mocked",
};

const makeBroadcast = (overrides?: Partial<Broadcast>): Broadcast => ({
  audience: "all",
  badge: "special-event",
  deepLink: "signews://events/spring-2026",
  endDate: new Date("2026-04-15T00:00:00.000Z"),
  longDescription: "Join us for a special live event with exclusive content and prizes.",
  priority: "normal",
  shortDescription: "Live event this weekend!",
  startDate: new Date("2026-04-01T00:00:00.000Z"),
  title: "Spring Event",
  ...overrides,
});

describe("AppleAppStoreAdapter", () => {
  let adapter: AppleAppStoreAdapter;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new AppleAppStoreAdapter(TEST_CONFIG);
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should create an event and its localization", async () => {
      // First call: create event
      fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "event-123",
            type: "appEvents",
          },
        }),
      );

      // Second call: create localization
      fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
          data: {
            attributes: { locale: "en-US", name: "Spring Event" },
            id: "loc-456",
            type: "appEventLocalizations",
          },
        }),
      );

      const result = await adapter.create(makeBroadcast());

      expect(result.id).toBe("event-123");
      expect(result.provider).toBe("apple-app-store");
      expect(result.status).toBe("created");

      // Verify event creation request
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const [eventUrl, eventOptions] = fetchSpy.mock.calls[0];
      expect(eventUrl).toBe(`${BASE_URL}/appEvents`);
      expect(eventOptions.method).toBe("POST");

      const eventBody = JSON.parse(eventOptions.body);
      expect(eventBody.data.type).toBe("appEvents");
      expect(eventBody.data.attributes.referenceName).toBe("Spring Event");
      expect(eventBody.data.attributes.badge).toBe("SPECIAL_EVENT");
      expect(eventBody.data.attributes.priority).toBe("NORMAL");
      expect(eventBody.data.attributes.purchaseRequirement).toBe("NO_COST_ASSOCIATED");
      expect(eventBody.data.attributes.purpose).toBe("APPROPRIATE_FOR_ALL_USERS");
      expect(eventBody.data.attributes.deepLink).toBe("signews://events/spring-2026");
      expect(eventBody.data.attributes.primaryLocale).toBe("en-US");
      expect(eventBody.data.relationships.app.data.id).toBe("6444444444");

      // Verify localization request
      const [locUrl, locOptions] = fetchSpy.mock.calls[1];
      expect(locUrl).toBe(`${BASE_URL}/appEventLocalizations`);
      expect(locOptions.method).toBe("POST");

      const locBody = JSON.parse(locOptions.body);
      expect(locBody.data.type).toBe("appEventLocalizations");
      expect(locBody.data.attributes.name).toBe("Spring Event");
      expect(locBody.data.attributes.shortDescription).toBe("Live event this weekend!");
      expect(locBody.data.attributes.longDescription).toBe(
        "Join us for a special live event with exclusive content and prizes.",
      );
      expect(locBody.data.relationships.appEvent.data.id).toBe("event-123");
    });

    it("should send authorization header with JWT", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
          data: {
            attributes: { badge: "CHALLENGE", eventState: "DRAFT" },
            id: "e-1",
            type: "appEvents",
          },
        }),
      );
      fetchSpy.mockResolvedValueOnce(mockResponse(201, { data: { id: "l-1" } }));

      await adapter.create(makeBroadcast());

      const [, options] = fetchSpy.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer mock-jwt-token");
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should map high priority correctly", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
          data: {
            attributes: { badge: "LIVE_EVENT", eventState: "DRAFT" },
            id: "e-1",
            type: "appEvents",
          },
        }),
      );
      fetchSpy.mockResolvedValueOnce(mockResponse(201, { data: { id: "l-1" } }));

      await adapter.create(makeBroadcast({ priority: "high" }));

      const eventBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(eventBody.data.attributes.priority).toBe("HIGH");
    });

    it("should map all badge types correctly", async () => {
      const badges = [
        ["challenge", "CHALLENGE"],
        ["competition", "COMPETITION"],
        ["live-event", "LIVE_EVENT"],
        ["major-update", "MAJOR_UPDATE"],
        ["new-season", "NEW_SEASON"],
        ["premiere", "PREMIERE"],
        ["special-event", "SPECIAL_EVENT"],
      ] as const;

      for (const [input, expected] of badges) {
        fetchSpy.mockResolvedValueOnce(
          mockResponse(201, {
            data: {
              attributes: { badge: expected, eventState: "DRAFT" },
              id: "e-1",
              type: "appEvents",
            },
          }),
        );
        fetchSpy.mockResolvedValueOnce(mockResponse(201, { data: { id: "l-1" } }));

        await adapter.create(makeBroadcast({ badge: input }));

        const eventBody = JSON.parse(fetchSpy.mock.calls.at(-2)![1].body);
        expect(eventBody.data.attributes.badge).toBe(expected);
      }
    });

    it("should map audience types correctly", async () => {
      const audiences = [
        ["all", "APPROPRIATE_FOR_ALL_USERS"],
        ["active-users", "APPROPRIATE_FOR_ALL_USERS"],
        ["new-users", "ATTRACT_NEW_USERS"],
        ["lapsed-users", "ATTRACT_LAPSED_USERS"],
      ] as const;

      for (const [input, expected] of audiences) {
        fetchSpy.mockResolvedValueOnce(
          mockResponse(201, {
            data: {
              attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
              id: "e-1",
              type: "appEvents",
            },
          }),
        );
        fetchSpy.mockResolvedValueOnce(mockResponse(201, { data: { id: "l-1" } }));

        await adapter.create(makeBroadcast({ audience: input }));

        const eventBody = JSON.parse(fetchSpy.mock.calls.at(-2)![1].body);
        expect(eventBody.data.attributes.purpose).toBe(expected);
      }
    });

    it("should map requiresPurchase to IN_APP_PURCHASE", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "e-1",
            type: "appEvents",
          },
        }),
      );
      fetchSpy.mockResolvedValueOnce(mockResponse(201, { data: { id: "l-1" } }));

      await adapter.create(makeBroadcast({ requiresPurchase: true }));

      const eventBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(eventBody.data.attributes.purchaseRequirement).toBe("IN_APP_PURCHASE");
    });

    it("should build territory schedules with dates", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "e-1",
            type: "appEvents",
          },
        }),
      );
      fetchSpy.mockResolvedValueOnce(mockResponse(201, { data: { id: "l-1" } }));

      await adapter.create(
        makeBroadcast({
          territories: ["USA", "FRA"],
        }),
      );

      const eventBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      const schedules = eventBody.data.attributes.territorySchedules;

      expect(schedules).toHaveLength(1);
      expect(schedules[0].territories).toEqual(["USA", "FRA"]);
      expect(schedules[0].eventStart).toBe("2026-04-01T00:00:00.000Z");
      expect(schedules[0].eventEnd).toBe("2026-04-15T00:00:00.000Z");
    });

    it("should default to USA when no territories specified", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "e-1",
            type: "appEvents",
          },
        }),
      );
      fetchSpy.mockResolvedValueOnce(mockResponse(201, { data: { id: "l-1" } }));

      await adapter.create(makeBroadcast({ territories: undefined }));

      const eventBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(eventBody.data.attributes.territorySchedules).toHaveLength(1);
      expect(eventBody.data.attributes.territorySchedules[0].territories).toEqual(["USA"]);
    });

    it("should default deepLink to empty string when not provided", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(201, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "e-1",
            type: "appEvents",
          },
        }),
      );
      fetchSpy.mockResolvedValueOnce(mockResponse(201, { data: { id: "l-1" } }));

      await adapter.create(makeBroadcast({ deepLink: undefined }));

      const eventBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(eventBody.data.attributes.deepLink).toBe("");
    });

    it("should throw AppleAppStoreError on API failure", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(403, null, false, '{"errors":[{"detail":"Forbidden"}]}'),
      );

      const error = await adapter.create(makeBroadcast()).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppleAppStoreError);
      expect((error as AppleAppStoreError).statusCode).toBe(403);
    });
  });

  describe("list", () => {
    it("should list events for the app", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(200, {
          data: [
            {
              attributes: {
                badge: "SPECIAL_EVENT",
                eventState: "PUBLISHED",
                referenceName: "Spring Event",
              },
              id: "event-1",
              type: "appEvents",
            },
            {
              attributes: {
                badge: "CHALLENGE",
                eventState: "DRAFT",
                referenceName: "Weekly Challenge",
              },
              id: "event-2",
              type: "appEvents",
            },
            {
              attributes: {
                badge: "LIVE_EVENT",
                eventState: "WAITING_FOR_REVIEW",
                referenceName: "Live Show",
              },
              id: "event-3",
              type: "appEvents",
            },
          ],
        }),
      );

      const results = await adapter.list();

      expect(results).toHaveLength(3);

      expect(results[0].id).toBe("event-1");
      expect(results[0].status).toBe("published");

      expect(results[1].id).toBe("event-2");
      expect(results[1].status).toBe("created");

      expect(results[2].id).toBe("event-3");
      expect(results[2].status).toBe("submitted");

      // Verify URL includes the app ID
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/apps/6444444444/appEvents`);
    });

    it("should map all Apple event states correctly", async () => {
      const states = [
        ["DRAFT", "created"],
        ["WAITING_FOR_REVIEW", "submitted"],
        ["APPROVED", "approved"],
        ["ACCEPTED", "approved"],
        ["PUBLISHED", "published"],
        ["PAST", "published"],
        ["REJECTED", "rejected"],
        ["UNKNOWN_STATE", "created"], // fallback
      ] as const;

      for (const [appleState, expectedStatus] of states) {
        fetchSpy.mockResolvedValueOnce(
          mockResponse(200, {
            data: [
              {
                attributes: {
                  badge: "SPECIAL_EVENT",
                  eventState: appleState,
                  referenceName: "Test",
                },
                id: "e-1",
                type: "appEvents",
              },
            ],
          }),
        );

        const results = await adapter.list();
        expect(results[0].status).toBe(expectedStatus);
      }
    });

    it("should return empty array when no events exist", async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { data: [] }));

      const results = await adapter.list();
      expect(results).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should send a PATCH request with partial attributes", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(200, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "event-123",
            type: "appEvents",
          },
        }),
      );

      const result = await adapter.update("event-123", {
        deepLink: "signews://events/updated",
        priority: "high",
      });

      expect(result.id).toBe("event-123");
      expect(result.provider).toBe("apple-app-store");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/appEvents/event-123`);
      expect(options.method).toBe("PATCH");

      const body = JSON.parse(options.body);
      expect(body.data.id).toBe("event-123");
      expect(body.data.type).toBe("appEvents");
      expect(body.data.attributes.deepLink).toBe("signews://events/updated");
      expect(body.data.attributes.priority).toBe("HIGH");
    });

    it("should only include provided fields in the update", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(200, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "event-123",
            type: "appEvents",
          },
        }),
      );

      await adapter.update("event-123", { audience: "lapsed-users" });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.data.attributes).toEqual({
        purpose: "ATTRACT_LAPSED_USERS",
      });
    });

    it("should map requiresPurchase in updates", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(200, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "event-123",
            type: "appEvents",
          },
        }),
      );

      await adapter.update("event-123", { requiresPurchase: true });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.data.attributes.purchaseRequirement).toBe("IN_APP_PURCHASE");
    });
  });

  describe("delete", () => {
    it("should send a DELETE request", async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(204, null, true));

      await adapter.delete("event-123");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/appEvents/event-123`);
      expect(options.method).toBe("DELETE");
    });

    it("should throw on API failure", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse(404, null, false, '{"errors":[{"detail":"Not found"}]}'),
      );

      await expect(adapter.delete("nonexistent")).rejects.toThrow(AppleAppStoreError);
    });
  });

  describe("error handling", () => {
    it("should include status code and response body in error", async () => {
      const errorResponse = '{"errors":[{"detail":"Invalid request","code":"INVALID"}]}';
      fetchSpy.mockResolvedValueOnce(mockResponse(422, null, false, errorResponse));

      try {
        await adapter.create(makeBroadcast());
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AppleAppStoreError);
        expect((error as AppleAppStoreError).statusCode).toBe(422);
        expect((error as AppleAppStoreError).responseBody).toBe(errorResponse);
      }
    });
  });
});

// --- Helpers ---

function mockResponse(
  status: number,
  body: unknown,
  noContent = false,
  textBody?: string,
): Response {
  const ok = status >= 200 && status < 300;
  return {
    headers: new Headers({ "Content-Type": "application/json" }),
    json: () => Promise.resolve(body),
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    text: () => Promise.resolve(textBody ?? JSON.stringify(body)),
  } as Response;
}
