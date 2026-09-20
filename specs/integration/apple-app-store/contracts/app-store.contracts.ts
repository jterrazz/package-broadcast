import { defineContracts } from '@jterrazz/test';

import eventCreated from './http/event-created.js';
import eventDeleted from './http/event-deleted.js';
import eventRefused from './http/event-refused.js';
import eventUpdated from './http/event-updated.js';
import eventsListed from './http/events-listed.js';
import localizationCreated from './http/localization-created.js';

/** The world a create lives in: App Store Connect takes the event, then its localization. */
const appStore = defineContracts(eventCreated, localizationCreated);

export default appStore;

/** …and the event is there when the app's events are listed. */
export const withListing = appStore.with(eventsListed);

/** …and the event is raised to high priority, then dropped. */
export const withUpdateAndDelete = appStore.with(eventUpdated, eventDeleted);

/**
 * …but the first attempt meets a 500. The refusal is declared FIRST and
 * exhausts after one serve, so the retry falls through to the healthy world.
 */
export const withFirstAttemptRefused = defineContracts(eventRefused, appStore);
