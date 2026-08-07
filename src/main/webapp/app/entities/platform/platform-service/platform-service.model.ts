import { ServiceHealth } from 'app/entities/enumerations/service-health.model';

export interface IPlatformService {
  id: string;
  name?: string | null;
  host?: string | null;
  port?: number | null;
  plane?: string | null;
  health?: keyof typeof ServiceHealth | null;
  responseMs?: number | null;
}
