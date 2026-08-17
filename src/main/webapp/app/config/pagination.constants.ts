export const TOTAL_COUNT_RESPONSE_HEADER = 'X-Total-Count';
export const PAGE_HEADER = 'page';
export const ITEMS_PER_PAGE = 20;

/**
 * How many options a relationship dropdown asks for.
 *
 * Every list endpoint is paginated, so a `query()` with no size returns the server default — 20 —
 * and a form silently offers the first 20 of whatever it is choosing from. Nothing reports it: the
 * dropdown opens, has options in it, and simply does not contain the 21st hub. This is a page size,
 * not a promise; a collection that outgrows it needs a search field rather than a bigger number.
 */
export const RELATIONSHIP_OPTIONS_PAGE_SIZE = 200;
