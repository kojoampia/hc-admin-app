import dayjs from 'dayjs/esm';

import { ServiceHealth } from 'app/entities/enumerations/service-health.model';

export interface IPlatformService {
  id: string;
  name?: string | null;
  host?: string | null;
  port?: number | null;
  plane?: string | null;
  health?: keyof typeof ServiceHealth | null;
  responseMs?: number | null;
  /**
   * When the probe last measured this service, absent if it never has.
   *
   * Written only by the probe endpoint. Its absence is what tells a reader that the health and
   * response time beside it came from the seed or from somebody's hand rather than from a
   * measurement.
   */
  lastProbedAt?: dayjs.Dayjs | null;
}
