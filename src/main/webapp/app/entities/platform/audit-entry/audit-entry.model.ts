import dayjs from 'dayjs/esm';

import { AuditLevel } from 'app/entities/enumerations/audit-level.model';

export interface IAuditEntry {
  id: string;
  occurredAt?: dayjs.Dayjs | null;
  actor?: string | null;
  action?: string | null;
  target?: string | null;
  level?: keyof typeof AuditLevel | null;
}
