# Apple App Store

`AppleAppStoreAdapter` is the package's one channel: it creates [In-App Events](https://developer.apple.com/app-store/in-app-events/) through the App Store Connect API, implementing `BroadcastProviderPort` ([Architecture](../concepts/architecture.md#the-port)). Its name in every result is `apple-app-store`.

## Credentials

1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**.
2. **Generate API Key**, access **Admin** (In-App Events require it).
3. Download the `.p8` file — it can only be downloaded once.
4. Note the **Key ID** shown beside it, and the **Issuer ID** shown at the top of the page.
5. The **App ID** is under **Apps** → the app → **App Information** → **Apple ID**.

```ts
import { readFileSync } from 'node:fs';
import { AppleAppStoreAdapter } from '@jterrazz/broadcast';

const apple = new AppleAppStoreAdapter({
    issuerId: '57246542-96fe-1a63-e053-0824d011072a',
    keyId: '2X9R4HXF34',
    privateKey: readFileSync('./AuthKey_2X9R4HXF34.p8', 'utf-8'),
    appId: '6444444444',
});
```

## Calling it

```ts
const result = await apple.create({
    title: 'Election Live Coverage',
    shortDescription: 'Real-time results & analysis',
    longDescription: 'Follow live election coverage with AI-powered fact-checking and analysis.',
    badge: 'live-event',
    audience: 'all',
    priority: 'high',
    startDate: new Date('2026-11-03'),
    endDate: new Date('2026-11-04'),
    deepLink: 'signews://live/election-2026',
    territories: ['USA', 'FRA'],
});

const events = await apple.list();
await apple.update('event-id', { priority: 'normal' });
await apple.delete('event-id');
```

## What each call sends

Every call carries a fresh 20-minute ES256 token signed with the API key (`createAppleJwt`, exported for a consumer who calls App Store Connect itself), and a refused call — any status that is not 2xx — rejects with an `AppleAppStoreError` whose `statusCode` and `responseBody` are Apple's answer verbatim.

| Call                | Requests, in order                                                                                                                                                                                                     | Answers                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `create(broadcast)` | `POST /appEvents`, `POST /appEventLocalizations` (locale `en-US`), then for each image URL given: the download, `POST /appEventScreenshots`, one upload per operation Apple answers, `PATCH /appEventScreenshots/{id}` | the event's id, status `created`, Apple's answer to the event as `raw`       |
| `list()`            | `GET /apps/{appId}/appEvents`                                                                                                                                                                                          | one result per event, its state read as a status (below), the event as `raw` |
| `update(id, patch)` | `PATCH /appEvents/{id}` with only the attributes the patch gives: `deepLink`, `priority`, `requiresPurchase`, `audience`                                                                                               | the event's new state as a status, Apple's answer as `raw`                   |
| `delete(id)`        | `DELETE /appEvents/{id}`                                                                                                                                                                                               | nothing                                                                      |

An update sends those four fields alone: a title, descriptions, dates, territories or images passed to it are not sent. The create does not undo what it already did: an image that cannot be downloaded or uploaded rejects the create after the event and its localization exist in App Store Connect. An image is reserved as `event-card.jpg` when its host serves it under a JPEG content type, `event-card.png` otherwise — the detail image under the same name. An empty image URL uploads nothing.

| Apple event state      | Status      |
| ---------------------- | ----------- |
| `DRAFT`                | `created`   |
| `WAITING_FOR_REVIEW`   | `submitted` |
| `APPROVED`, `ACCEPTED` | `approved`  |
| `PUBLISHED`, `PAST`    | `published` |
| `REJECTED`             | `rejected`  |
| any other              | `created`   |

## Field mapping

| Broadcast          | Apple In-App Event                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `title`            | `referenceName` + localized `name`                                                                                          |
| `shortDescription` | localized `shortDescription`                                                                                                |
| `longDescription`  | localized `longDescription`                                                                                                 |
| `badge`            | `badge` (`CHALLENGE`, `COMPETITION`, …)                                                                                     |
| `audience`         | `purpose` (`APPROPRIATE_FOR_ALL_USERS`, `ATTRACT_NEW_USERS`, `ATTRACT_LAPSED_USERS`)                                        |
| `priority`         | `priority` (`NORMAL`, `HIGH`)                                                                                               |
| `requiresPurchase` | `purchaseRequirement` (`NO_COST_ASSOCIATED`, `IN_APP_PURCHASE`)                                                             |
| `territories`      | `territorySchedules` — one schedule from `startDate` to `endDate`, published at `startDate`; `USA` alone when none is named |
| `deepLink`         | `deepLink` — empty when none is given                                                                                       |
| `cardImageUrl`     | uploaded as the `EVENT_CARD` asset, 16:9                                                                                    |
| `detailImageUrl`   | uploaded as the `EVENT_DETAILS_PAGE` asset, 9:16                                                                            |

The badge, purpose and state tables are `BADGES`, `PURPOSES` and `STATUSES` in `src/adapters/apple/apple-app-store.mapping.ts`.

## Limits

- Max 15 approved events at a time in App Store Connect.
- Max 10 events published simultaneously on the App Store.
- Events can last up to 31 days.
- Events can be promoted up to 14 days before their start.
