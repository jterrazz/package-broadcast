import { SignJWT, importPKCS8 } from "jose";
//#region src/send-broadcast.ts
/**
* Send a broadcast to one or more providers concurrently.
* Returns a result per provider, including failures.
*/
async function sendBroadcast(broadcast, providers) {
	return (await Promise.allSettled(providers.map((provider) => provider.create(broadcast)))).map((result, index) => {
		if (result.status === "fulfilled") return result.value;
		return {
			id: "",
			provider: providers[index].name,
			raw: result.reason,
			status: "failed"
		};
	});
}
//#endregion
//#region src/adapters/apple/apple-auth.ts
const TOKEN_LIFETIME_SECONDS = 1200;
const AUDIENCE = "appstoreconnect-v1";
const ALGORITHM = "ES256";
/**
* Generates a short-lived JWT for the App Store Connect API.
* Tokens are valid for 20 minutes.
*
* @see https://developer.apple.com/documentation/appstoreconnectapi/generating_tokens_for_api_requests
*/
async function createAppleJwt(config) {
	const privateKey = await importPKCS8(config.privateKey, ALGORITHM);
	const now = Math.floor(Date.now() / 1e3);
	return new SignJWT({}).setProtectedHeader({
		alg: ALGORITHM,
		kid: config.keyId,
		typ: "JWT"
	}).setIssuer(config.issuerId).setIssuedAt(now).setExpirationTime(now + TOKEN_LIFETIME_SECONDS).setAudience(AUDIENCE).sign(privateKey);
}
//#endregion
//#region src/adapters/apple/apple-app-store.adapter.ts
const BASE_URL = "https://api.appstoreconnect.apple.com/v1";
/**
* Broadcast provider for Apple App Store In-App Events.
*
* @see https://developer.apple.com/app-store/in-app-events/
*/
var AppleAppStoreAdapter = class {
	name = "apple-app-store";
	constructor(config) {
		this.config = config;
	}
	async create(broadcast) {
		const token = await createAppleJwt(this.config);
		const eventBody = { data: {
			attributes: {
				badge: mapBadge(broadcast.badge),
				deepLink: broadcast.deepLink ?? "",
				primaryLocale: "en-US",
				priority: broadcast.priority === "high" ? "HIGH" : "NORMAL",
				purchaseRequirement: broadcast.requiresPurchase ? "IN_APP_PURCHASE" : "NO_COST_ASSOCIATED",
				purpose: mapAudience(broadcast.audience),
				referenceName: broadcast.title,
				territorySchedules: this.buildTerritorySchedules(broadcast)
			},
			relationships: { app: { data: {
				id: this.config.appId,
				type: "apps"
			} } },
			type: "appEvents"
		} };
		const eventResponse = await this.request("/appEvents", "POST", token, eventBody);
		const eventId = eventResponse.data.id;
		const localizationBody = { data: {
			attributes: {
				locale: "en-US",
				longDescription: broadcast.longDescription,
				name: broadcast.title,
				shortDescription: broadcast.shortDescription
			},
			relationships: { appEvent: { data: {
				id: eventId,
				type: "appEvents"
			} } },
			type: "appEventLocalizations"
		} };
		const localizationId = (await this.request("/appEventLocalizations", "POST", token, localizationBody)).data.id;
		if (broadcast.cardImageUrl) await this.uploadEventImage(token, localizationId, broadcast.cardImageUrl, "EVENT_CARD");
		if (broadcast.detailImageUrl) await this.uploadEventImage(token, localizationId, broadcast.detailImageUrl, "EVENT_DETAILS_PAGE");
		return {
			id: eventId,
			provider: this.name,
			raw: eventResponse,
			status: "created"
		};
	}
	async delete(id) {
		const token = await createAppleJwt(this.config);
		await this.request(`/appEvents/${id}`, "DELETE", token);
	}
	async list() {
		const token = await createAppleJwt(this.config);
		return (await this.request(`/apps/${this.config.appId}/appEvents`, "GET", token)).data.map((event) => ({
			id: event.id,
			provider: this.name,
			raw: event,
			status: mapAppleStatus(event.attributes.eventState)
		}));
	}
	async update(id, broadcast) {
		const token = await createAppleJwt(this.config);
		const attributes = {};
		if (broadcast.deepLink !== void 0) attributes.deepLink = broadcast.deepLink;
		if (broadcast.priority !== void 0) attributes.priority = broadcast.priority === "high" ? "HIGH" : "NORMAL";
		if (broadcast.requiresPurchase !== void 0) attributes.purchaseRequirement = broadcast.requiresPurchase ? "IN_APP_PURCHASE" : "NO_COST_ASSOCIATED";
		if (broadcast.audience !== void 0) attributes.purpose = mapAudience(broadcast.audience);
		const body = { data: {
			attributes,
			id,
			type: "appEvents"
		} };
		const response = await this.request(`/appEvents/${id}`, "PATCH", token, body);
		return {
			id,
			provider: this.name,
			raw: response,
			status: mapAppleStatus(response.data.attributes.eventState)
		};
	}
	async uploadEventImage(token, localizationId, imageUrl, assetType) {
		const imageResponse = await fetch(imageUrl);
		if (!imageResponse.ok) throw new Error(`Failed to download image from ${imageUrl}: ${imageResponse.status}`);
		const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
		const contentType = imageResponse.headers.get("content-type") ?? "image/png";
		const reserveBody = { data: {
			attributes: {
				appEventAssetType: assetType,
				fileName: `event-card.${contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png"}`,
				fileSize: imageBuffer.byteLength
			},
			relationships: { appEventLocalization: { data: {
				id: localizationId,
				type: "appEventLocalizations"
			} } },
			type: "appEventScreenshots"
		} };
		const reserveResponse = await this.request("/appEventScreenshots", "POST", token, reserveBody);
		const screenshotId = reserveResponse.data.id;
		const uploadOperations = reserveResponse.data.attributes.uploadOperations ?? [];
		for (const operation of uploadOperations) {
			const chunk = imageBuffer.slice(operation.offset, operation.offset + operation.length);
			const headers = {};
			for (const header of operation.requestHeaders ?? []) headers[header.name] = header.value;
			const uploadResponse = await fetch(operation.url, {
				body: chunk,
				headers,
				method: operation.method
			});
			if (!uploadResponse.ok) throw new Error(`Failed to upload image chunk: ${uploadResponse.status} ${uploadResponse.statusText}`);
		}
		await this.request(`/appEventScreenshots/${screenshotId}`, "PATCH", token, { data: {
			attributes: { uploaded: true },
			id: screenshotId,
			type: "appEventScreenshots"
		} });
	}
	buildTerritorySchedules(broadcast) {
		const territories = broadcast.territories ?? ["USA"];
		return [{
			eventEnd: broadcast.endDate.toISOString(),
			eventStart: broadcast.startDate.toISOString(),
			publishStart: broadcast.startDate.toISOString(),
			territories
		}];
	}
	async request(path, method, token, body) {
		const response = await fetch(`${BASE_URL}${path}`, {
			body: body ? JSON.stringify(body) : void 0,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json"
			},
			method
		});
		if (!response.ok) {
			const errorBody = await response.text();
			throw new AppleAppStoreError(`App Store Connect API error: ${response.status} ${response.statusText}`, response.status, errorBody);
		}
		if (response.status === 204) return;
		return response.json();
	}
};
var AppleAppStoreError = class extends Error {
	constructor(message, statusCode, responseBody) {
		super(message);
		this.statusCode = statusCode;
		this.responseBody = responseBody;
		this.name = "AppleAppStoreError";
	}
};
function mapAudience(audience) {
	return {
		"active-users": "APPROPRIATE_FOR_ALL_USERS",
		all: "APPROPRIATE_FOR_ALL_USERS",
		"lapsed-users": "ATTRACT_LAPSED_USERS",
		"new-users": "ATTRACT_NEW_USERS"
	}[audience];
}
function mapBadge(badge) {
	return {
		challenge: "CHALLENGE",
		competition: "COMPETITION",
		"live-event": "LIVE_EVENT",
		"major-update": "MAJOR_UPDATE",
		"new-season": "NEW_SEASON",
		premiere: "PREMIERE",
		"special-event": "SPECIAL_EVENT"
	}[badge];
}
function mapAppleStatus(eventState) {
	return {
		ACCEPTED: "approved",
		APPROVED: "approved",
		DRAFT: "created",
		PAST: "published",
		PUBLISHED: "published",
		REJECTED: "rejected",
		WAITING_FOR_REVIEW: "submitted"
	}[eventState] ?? "created";
}
//#endregion
export { AppleAppStoreAdapter, AppleAppStoreError, createAppleJwt, sendBroadcast };

//# sourceMappingURL=index.js.map