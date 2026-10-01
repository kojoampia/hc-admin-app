import dayjs from 'dayjs/esm';

import { IServicePlan } from 'app/entities/catalogue/service-plan/service-plan.model';
import { IAngel } from 'app/entities/directory/angel/angel.model';
import { IProfessional } from 'app/entities/directory/professional/professional.model';
import { IProfile } from 'app/entities/directory/profile/profile.model';
import { AccountStatus } from 'app/entities/enumerations/account-status.model';
import { IHub } from 'app/entities/platform/hub/hub.model';

export interface IPatient {
  id: string;

  /**
   * The subject's hc-patient gateway account — the same identifier `IProfile.accountId`
   * carries, and the estate join of 2026-09-17: `account.id = accountId`. It is an id,
   * never the login and never an email address.
   *
   * The server owns it. It arrives on the domain event that opens the record, and
   * `Patient.accountId` is `@NotNull` there — so this is optional in TypeScript only
   * because a form can be built before a record has been loaded into it, exactly as
   * `IProfile.accountId` is.
   *
   * It is on this interface so that the edit screen can send it back. `PUT
   * /api/patients/{id}` replaces the whole document, so a field the form does not
   * carry is a field the server is told to forget; with `@NotNull` on the far side
   * that is a 400 rather than silent loss. It is deliberately not something an
   * administrator may type — see `update/patient-form.service.ts`, which carries it
   * disabled.
   */
  accountId?: string | null;
  status?: keyof typeof AccountStatus | null;
  joinedOn?: dayjs.Dayjs | null;
  lastActiveOn?: dayjs.Dayjs | null;
  caseCount?: number | null;
  profile?: IProfile | null;
  angel?: IAngel | null;
  plan?: IServicePlan | null;
  clinicalLead?: IProfessional | null;
  hub?: IHub | null;

  /**
   * Archived records are hidden from the directory rather than deleted.
   *
   * The active list filters with `isArchived.notEquals=true`, not
   * `.equals=false`: a record written before this field existed has no value at
   * all, and `.equals=false` does not match an absent field. Absent has to mean
   * not archived, or every pre-existing record would vanish from the directory
   * the moment this shipped.
   */
  isArchived?: boolean | null;
}

export type NewPatient = Omit<IPatient, 'id'> & { id: null };
