import type {
    Broadcast,
    BroadcastAudience,
    BroadcastBadge,
    BroadcastResult,
} from '../../ports/broadcast.port.js';

const BADGES: Record<BroadcastBadge, string> = {
    challenge: 'CHALLENGE',
    competition: 'COMPETITION',
    'live-event': 'LIVE_EVENT',
    'major-update': 'MAJOR_UPDATE',
    'new-season': 'NEW_SEASON',
    premiere: 'PREMIERE',
    'special-event': 'SPECIAL_EVENT',
};

const PURPOSES: Record<BroadcastAudience, string> = {
    'active-users': 'APPROPRIATE_FOR_ALL_USERS',
    all: 'APPROPRIATE_FOR_ALL_USERS',
    'lapsed-users': 'ATTRACT_LAPSED_USERS',
    'new-users': 'ATTRACT_NEW_USERS',
};

const STATUSES: Record<string, BroadcastResult['status']> = {
    ACCEPTED: 'approved',
    APPROVED: 'approved',
    DRAFT: 'created',
    PAST: 'published',
    PUBLISHED: 'published',
    REJECTED: 'rejected',
    WAITING_FOR_REVIEW: 'submitted',
};

const priorityOf = (priority: Broadcast['priority']) => (priority === 'high' ? 'HIGH' : 'NORMAL');

const purchaseOf = (requiresPurchase: boolean) =>
    requiresPurchase ? 'IN_APP_PURCHASE' : 'NO_COST_ASSOCIATED';

/** The attributes of the in-app event a broadcast becomes. */
export function eventAttributesOf(broadcast: Broadcast) {
    return {
        badge: BADGES[broadcast.badge],
        deepLink: broadcast.deepLink ?? '',
        primaryLocale: 'en-US',
        priority: priorityOf(broadcast.priority),
        purchaseRequirement: purchaseOf(broadcast.requiresPurchase === true),
        purpose: PURPOSES[broadcast.audience],
        referenceName: broadcast.title,
        territorySchedules: [
            {
                eventEnd: broadcast.endDate.toISOString(),
                eventStart: broadcast.startDate.toISOString(),
                publishStart: broadcast.startDate.toISOString(),
                // value: a broadcast naming no territory is scheduled for the United States alone.
                territories: broadcast.territories ?? ['USA'],
            },
        ],
    };
}

/** The attributes a patch of an in-app event carries: only those the caller gave, an undefined one left out of the JSON. */
export function patchAttributesOf(broadcast: Partial<Broadcast>) {
    return {
        deepLink: broadcast.deepLink,
        priority: broadcast.priority && priorityOf(broadcast.priority),
        purchaseRequirement:
            broadcast.requiresPurchase === undefined
                ? undefined
                : purchaseOf(broadcast.requiresPurchase),
        purpose: broadcast.audience && PURPOSES[broadcast.audience],
    };
}

/** The status an in-app event's state means; a state the port does not know reads as `created`. */
export const statusOf = (eventState: string): BroadcastResult['status'] =>
    STATUSES[eventState] ?? 'created';
