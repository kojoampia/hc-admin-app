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
