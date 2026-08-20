import { PlanTier } from 'app/entities/enumerations/plan-tier.model';

export interface IServicePlan {
  id: string;
  name?: string | null;
  tier?: keyof typeof PlanTier | null;
  tierLabel?: string | null;
  monthlyPrice?: number | null;
  currency?: string | null;
  summary?: string | null;
  featured?: boolean | null;
  subscriberCount?: number | null;
}

export type NewServicePlan = Omit<IServicePlan, 'id'> & { id: null };

/**
 * One line of the plan mix, from `GET /api/service-plans/summary`.
 *
 * `share` is the reason the endpoint exists: it is a proportion of the whole book of subscribers,
 * and dividing by the plans that happen to be on screen would print percentages that sum to 100
 * across a subset and mean nothing.
 *
 * Subscribers are counted from the patient directory, **not** from `IServicePlan.subscriberCount`.
 * That field is a denormalised counter nothing maintains — it reads 41/52/23 against a directory of
 * twelve patients — and nothing on this screen may read it.
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
