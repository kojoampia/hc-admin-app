import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import dayjs from 'dayjs/esm';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { ProfessionalRole } from 'app/entities/enumerations/professional-role.model';
import { IWageRate, NewWageRate } from 'app/entities/operations/wage-rate/wage-rate.model';
import { WageRateService } from 'app/entities/operations/wage-rate/service/wage-rate.service';
import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { ConsoleAuthority } from 'app/shared/auth/console-role';
import { FormatMediumDatePipe, FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';

/** Every role, in the order the bands run — cheapest first, which is how the table reads. */
const ROLE_ORDER: readonly ProfessionalRole[] = [
  ProfessionalRole.CAREGIVER,
  ProfessionalRole.PARAMEDIC,
  ProfessionalRole.THERAPIST,
  ProfessionalRole.NURSE,
  ProfessionalRole.DOCTOR,
];

interface RoleRow {
  readonly role: ProfessionalRole;
  /** The rate in force today, or null when the role has never been priced. */
  readonly current: IWageRate | null;
  readonly history: readonly IWageRate[];
}

/**
 * Professional wage remuneration: what one shift pays, per role.
 *
 * **Changing a price adds a row; it does not edit one.** Each rate carries a `validFrom`, and a
 * shift is valued at whichever rate was in force on the day it was worked. That is the whole reason
 * the screen is shaped this way — the obvious design, one editable number per role, silently
 * restates every historical total the moment a rate moves, so last month's wage bill reads
 * differently than it did last month and the money has usually already been paid.
 *
 * So the form is "set a new rate from a date", not "edit the rate", and the superseded rows stay
 * visible underneath as history. There is a separate correction path for a figure typed wrongly,
 * which does rewrite the record and says so.
 */
@Component({
  selector: 'abf-wage-rates',
  templateUrl: './wage-rates.html',
  styleUrl: './wage-rates.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FontAwesomeModule,
    TranslatePipe,
    TranslateDirective,
    HasAnyAuthorityDirective,
    FormatMediumDatePipe,
    FormatMediumDatetimePipe,
  ],
})
export default class WageRates implements OnInit {
  protected readonly ConsoleAuthority = ConsoleAuthority;
  protected readonly roleOrder = ROLE_ORDER;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly savedRole = signal<ProfessionalRole | null>(null);

  /** Which role's history is expanded. Only one at a time — the table is the primary reading. */
  protected readonly expandedRole = signal<ProfessionalRole | null>(null);
  /** Which role is being repriced. Null means the form is closed. */
  protected readonly editingRole = signal<ProfessionalRole | null>(null);

  protected readonly rows = computed<readonly RoleRow[]>(() => {
    const current = this.current();
    const histories = this.histories();
    return ROLE_ORDER.map(role => ({
      role,
      current: current.find(rate => rate.role === role) ?? null,
      history: histories[role] ?? [],
    }));
  });

  /** True once at least one role carries a superseded rate — the history column is dead weight otherwise. */
  protected readonly anyPriced = computed(() => this.rows().some(row => row.current !== null));

  protected readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0)] }),
    validFrom: new FormControl<string | null>(null, { validators: [Validators.required] }),
    note: new FormControl<string | null>(null, { validators: [Validators.maxLength(200)] }),
  });

  private readonly current = signal<readonly IWageRate[]>([]);
  private readonly histories = signal<Readonly<Partial<Record<ProfessionalRole, readonly IWageRate[]>>>>({});

  private readonly wageRateService = inject(WageRateService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.wageRateService.current().subscribe({
      next: rates => {
        this.current.set(rates);
        this.isLoading.set(false);
      },
      error: (response: HttpErrorResponse) => {
        this.errorMessage.set(describeError(response));
        this.isLoading.set(false);
      },
    });
  }

  toggleHistory(role: ProfessionalRole): void {
    if (this.expandedRole() === role) {
      this.expandedRole.set(null);
      return;
    }
    this.expandedRole.set(role);
    // Fetched on expand rather than up front: five extra requests on load, to fill a panel most
    // visits never open.
    if (this.histories()[role] === undefined) {
      this.wageRateService.history(role).subscribe({
        next: rates => this.histories.update(all => ({ ...all, [role]: rates })),
        error: (response: HttpErrorResponse) => this.errorMessage.set(describeError(response)),
      });
    }
  }

  startReprice(role: ProfessionalRole): void {
    const current = this.rows().find(row => row.role === role)?.current ?? null;
    this.editingRole.set(role);
    this.savedRole.set(null);
    this.errorMessage.set(null);
    this.form.reset({
      // Prefilled with today's figure so a small adjustment is a small edit, and with tomorrow's
      // date rather than today's: a rate dated today would reprice shifts already worked this
      // morning, which is the retroactive change the model exists to prevent.
      amount: current?.amount ?? null,
      validFrom: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      note: null,
    });
  }

  cancelReprice(): void {
    this.editingRole.set(null);
    this.form.reset();
  }

  save(): void {
    const role = this.editingRole();
    if (role === null || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const existing = this.rows().find(row => row.role === role)?.current ?? null;

    const rate: NewWageRate = {
      id: null,
      role,
      amount: value.amount,
      // Carried forward from the rate it supersedes so a reprice never silently changes currency;
      // GHS only when the role is being priced for the first time.
      currency: existing?.currency ?? 'GHS',
      validFrom: value.validFrom ? dayjs(value.validFrom) : null,
      note: value.note,
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.wageRateService.create(rate).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editingRole.set(null);
        this.savedRole.set(role);
        // The new row may be future-dated, in which case `current` is unchanged and only the
        // history moves — so both are refetched rather than patched in locally.
        this.histories.update(all => ({ ...all, [role]: undefined }));
        if (this.expandedRole() === role) {
          this.wageRateService.history(role).subscribe({
            next: rates => this.histories.update(all => ({ ...all, [role]: rates })),
          });
        }
        this.load();
      },
      error: (response: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.errorMessage.set(describeError(response));
      },
    });
  }

  /** True while the given rate has not yet taken effect — shown as "scheduled", not as current. */
  protected isScheduled(rate: IWageRate): boolean {
    return rate.validFrom ? rate.validFrom.isAfter(dayjs(), 'day') : false;
  }

  protected roleLabelKey(role: ProfessionalRole): string {
    return `hcAdminApp.ProfessionalRole.${role}`;
  }
}

/**
 * Turns a JHipster problem response into something worth showing. Field errors first, because they
 * name what to change; the bare `detail` is often "Unexpected runtime exception", so it is last.
 */
function describeError(response: HttpErrorResponse): string {
  const problem = response.error as { fieldErrors?: { field: string; message: string }[]; detail?: string } | null;
  const fieldErrors = problem?.fieldErrors;
  if (fieldErrors?.length) {
    return fieldErrors.map(error => `${error.field}: ${error.message}`).join('; ');
  }
  return problem?.detail ?? response.message;
}
