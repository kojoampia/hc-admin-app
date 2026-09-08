export interface IServicePlan {
  id: string;
  name?: string | null;
  /**
   * Abofonsa's stable tier code — `PEAR`, `PAWPAW`, `MELON` — and the join key to the published
   * catalogue.
   *
   * Replaced a `PlanTier` enum of `ESSENTIAL` / `PLUS` / `FAMILY` on 2026-09-08 (backlog item 51):
   * this console's names, tier codes *and* prices all disagreed with what `web.abofonsa.com` and
   * hc-patient show, the last by roughly a factor of ten. A string rather than a union type on
   * purpose — Abofonsa can publish a fourth tier whenever it likes, and a union would make the one
   * value the sync most needs to carry across the one it cannot type.
   *
   * Null on a plan an administrator created before the catalogue was reconciled. That is a real
   * state, not a loading one.
   */
  code?: string | null;
  tierLabel?: string | null;
  /** The order the published catalogue draws the tiers in, cheapest first. Synced. */
  displayOrder?: number | null;
  /**
   * This console's own figure, and the one field of a plan that is still a second copy.
   *
   * Abofonsa publishes a price already formatted for the requesting locale (`"8,000"`) and no
   * machine-readable one, so the dashboard's `monthlyPrice × subscribers` cannot come from there.
   * Null on a plan the catalogue sync created and nobody has priced yet — and null is not zero:
   * the board renders the two differently on purpose.
   */
  monthlyPrice?: number | null;
  currency?: string | null;
  summary?: string | null;
  featured?: boolean | null;
}

export type NewServicePlan = Omit<IServicePlan, 'id'> & { id: null };

/**
 * One line of the plan mix, from `GET /api/service-plans/summary`.
 *
 * `share` is the reason the endpoint exists: it is a proportion of the whole book of subscribers,
 * and dividing by the plans that happen to be on screen would print percentages that sum to 100
 * across a subset and mean nothing.
 *
 * Subscribers are counted from the patient directory. `IServicePlan` carried a `subscriberCount`
 * until 2026-08-24 — a denormalised counter nothing maintained, reading 41/52/23 against a directory
 * of twelve patients — and it was deleted rather than left on the interface unread. **Do not add a
 * subscriber field back to `IServicePlan`**: this row is where a subscriber count comes from.
 *
 * `share` is `null`, not `0`, when nobody holds any plan: a share of an empty directory is
 * undefined, and the board renders null as "—". Zero would be the console asserting that a plan
 * holds none of a market, which is a claim rather than an absence.
 */
export interface IPlanMixRow {
  planId: string;
  name?: string | null;
  monthlyPrice?: number | null;
  currency?: string | null;
  subscribers: number;
  share: number | null;
  monthlyRevenue: number;
}

export interface IServicePlanSummary {
  totalSubscribers: number;
  mix: IPlanMixRow[];
}
