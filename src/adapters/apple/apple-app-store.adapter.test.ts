import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Broadcast } from "../../ports/broadcast.port.js";
import { AppleAppStoreAdapter, AppleAppStoreError } from "./apple-app-store.adapter.js";

// Mock the JWT generation to avoid needing a real private key
vi.mock("./apple-auth.js", () => ({
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
    test("should create an event and its localization", async () => {
      // Given — mock responses for event creation and localization
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

      // Then — the event and localization are created with correct data
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

    test("should send authorization header with JWT", async () => {
      // Given — mock responses for a successful creation
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

      // Then — the authorization header contains the JWT token
      await adapter.create(makeBroadcast());

      const [, options] = fetchSpy.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer mock-jwt-token");
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    test("should map high priority correctly", async () => {
      // Given — a broadcast with high priority
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

      // Then — the priority is mapped to "HIGH"
      await adapter.create(makeBroadcast({ priority: "high" }));

      const eventBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(eventBody.data.attributes.priority).toBe("HIGH");
    });

    test("should map all badge types correctly", async () => {
      // Given — all possible badge type inputs
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

        // Then — each badge is mapped to the correct Apple format
        await adapter.create(makeBroadcast({ badge: input }));

        const eventBody = JSON.parse(fetchSpy.mock.calls.at(-2)![1].body);
        expect(eventBody.data.attributes.badge).toBe(expected);
      }
    });

    test("should map audience types correctly", async () => {
      // Given — all possible audience type inputs
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

        // Then — each audience is mapped to the correct Apple purpose
        await adapter.create(makeBroadcast({ audience: input }));

        const eventBody = JSON.parse(fetchSpy.mock.calls.at(-2)![1].body);
        expect(eventBody.data.attributes.purpose).toBe(expected);
      }
    });

    test("should map requiresPurchase to IN_APP_PURCHASE", async () => {
      // Given — a broadcast that requires purchase
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

      // Then — the purchase requirement is set to IN_APP_PURCHASE
      await adapter.create(makeBroadcast({ requiresPurchase: true }));

      const eventBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(eventBody.data.attributes.purchaseRequirement).toBe("IN_APP_PURCHASE");
    });

    test("should build territory schedules with dates", async () => {
      // Given — a broadcast with specific territories
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

      // Then — the territory schedules include the specified territories and dates
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

    test("should default to USA when no territories specified", async () => {
      // Given — a broadcast without territories
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

      // Then — the default territory is USA
      await adapter.create(makeBroadcast({ territories: undefined }));

      const eventBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(eventBody.data.attributes.territorySchedules).toHaveLength(1);
      expect(eventBody.data.attributes.territorySchedules[0].territories).toEqual(["USA"]);
    });

    test("should default deepLink to empty string when not provided", async () => {
      // Given — a broadcast without a deepLink
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

      // Then — the deepLink defaults to an empty string
      await adapter.create(makeBroadcast({ deepLink: undefined }));

      const eventBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(eventBody.data.attributes.deepLink).toBe("");
    });

    test("should throw AppleAppStoreError on API failure", async () => {
      // Given — an API that returns 403
      fetchSpy.mockResolvedValueOnce(
        mockResponse(403, null, false, '{"errors":[{"detail":"Forbidden"}]}'),
      );

      // Then — an AppleAppStoreError is thrown with the correct status code
      const caughtError = await adapter.create(makeBroadcast()).catch((error: unknown) => error);

      expect(caughtError).toBeInstanceOf(AppleAppStoreError);
      expect((caughtError as AppleAppStoreError).statusCode).toBe(403);
    });
  });

  describe("list", () => {
    test("should list events for the app", async () => {
      // Given — an API that returns three events with different states
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

      // Then — the events are returned with correctly mapped statuses
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

    test("should map all Apple event states correctly", async () => {
      // Given — all possible Apple event states
      const states = [
        ["DRAFT", "created"],
        ["WAITING_FOR_REVIEW", "submitted"],
        ["APPROVED", "approved"],
        ["ACCEPTED", "approved"],
        ["PUBLISHED", "published"],
        ["PAST", "published"],
        ["REJECTED", "rejected"],
        ["UNKNOWN_STATE", "created"], // Fallback
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

        // Then — each state is mapped to the expected status
        const results = await adapter.list();
        expect(results[0].status).toBe(expectedStatus);
      }
    });

    test("should return empty array when no events exist", async () => {
      // Given — an API that returns no events
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { data: [] }));

      // Then — an empty array is returned
      const results = await adapter.list();
      expect(results).toHaveLength(0);
    });
  });

  describe("update", () => {
    test("should send a PATCH request with partial attributes", async () => {
      // Given — a mock response for a successful update
      fetchSpy.mockResolvedValueOnce(
        mockResponse(200, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "event-123",
            type: "appEvents",
          },
        }),
      );

      // Then — a PATCH request is sent with the correct attributes
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

    test("should only include provided fields in the update", async () => {
      // Given — a mock response for a successful update
      fetchSpy.mockResolvedValueOnce(
        mockResponse(200, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "event-123",
            type: "appEvents",
          },
        }),
      );

      // Then — only the provided field is included in the request body
      await adapter.update("event-123", { audience: "lapsed-users" });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.data.attributes).toEqual({
        purpose: "ATTRACT_LAPSED_USERS",
      });
    });

    test("should map requiresPurchase in updates", async () => {
      // Given — an update with requiresPurchase set to true
      fetchSpy.mockResolvedValueOnce(
        mockResponse(200, {
          data: {
            attributes: { badge: "SPECIAL_EVENT", eventState: "DRAFT" },
            id: "event-123",
            type: "appEvents",
          },
        }),
      );

      // Then — the purchase requirement is mapped correctly
      await adapter.update("event-123", { requiresPurchase: true });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.data.attributes.purchaseRequirement).toBe("IN_APP_PURCHASE");
    });
  });

  describe("delete", () => {
    test("should send a DELETE request", async () => {
      // Given — a mock response for a successful deletion
      fetchSpy.mockResolvedValueOnce(mockResponse(204, null, true));

      // Then — a DELETE request is sent to the correct URL
      await adapter.delete("event-123");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/appEvents/event-123`);
      expect(options.method).toBe("DELETE");
    });

    test("should throw on API failure", async () => {
      // Given — an API that returns 404
      fetchSpy.mockResolvedValueOnce(
        mockResponse(404, null, false, '{"errors":[{"detail":"Not found"}]}'),
      );

      // Then — an AppleAppStoreError is thrown
      await expect(adapter.delete("nonexistent")).rejects.toThrow(AppleAppStoreError);
    });
  });

  describe("error handling", () => {
    test("should include status code and response body in error", async () => {
      // Given — an API that returns 422 with error details
      const errorResponse = '{"errors":[{"detail":"Invalid request","code":"INVALID"}]}';
      fetchSpy.mockResolvedValueOnce(mockResponse(422, null, false, errorResponse));

      // Then — the error contains the status code and response body
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
