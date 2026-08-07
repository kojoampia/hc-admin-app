import { IServicePlan } from 'app/entities/catalogue/service-plan/service-plan.model';

export interface IPlanFeature {
  id: number;
  label?: string | null;
  position?: number | null;
  plan?: IServicePlan | null;
}

export type NewPlanFeature = Omit<IPlanFeature, 'id'> & { id: null };
