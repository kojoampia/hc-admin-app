import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import { StatusPill } from 'app/console/shared/status-pill/status-pill';
import { AccountService } from 'app/core/auth/account.service';
import { ConsoleAuthority } from 'app/shared/auth/console-role';
import { IDocument } from 'app/entities/platform/document/document.model';
import { IFacility } from 'app/entities/platform/facility/facility.model';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IVendor } from '../vendor.model';
import { VendorService } from '../service/vendor.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-vendor-detail',
  templateUrl: './vendor-detail.html',
  styleUrl: './vendor-detail.scss',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink, FormatMediumDatePipe, StatusPill],
})
export class VendorDetail {
  readonly vendor = input<IVendor | null>(null);

  /**
   * Applied locally so the button flips without a re-resolve, and keyed by id so it cannot leak.
   *
   * Nothing re-runs the route resolver after a PATCH, so the input signal keeps whatever it saw and
   * the button would otherwise still say "Archive" after archiving. Holding the id alongside the
   * value means that if the resolver ever swaps the record underneath us, a stale override is
   * ignored rather than claiming the new record's state.
   */
  readonly archivedOverride = signal<{ id: string; isArchived: boolean } | null>(null);
  readonly isArchived = computed(() => {
    const vendor = this.vendor();
    const override = this.archivedOverride();
    if (override && vendor?.id === override.id) {
      return override.isArchived;
    }
    return vendor?.isArchived === true;
  });
  readonly isSaving = signal(false);
  /** Same reasoning as archivedOverride, for the field the review action writes. */
  readonly statusOverride = signal<{ id: string; status: string } | null>(null);

  protected readonly vendorService = inject(VendorService);
  private readonly accountService = inject(AccountService);

  /**
   * Sites and paperwork, both nested on the vendor and neither written from here.
   *
   * Defaulted to empty arrays rather than left null: a card that renders nothing and a card that
   * renders an empty state are different screens, and the second one tells the truth.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly facilities = computed<IFacility[]>(() => this.vendor()?.facilities ?? []);
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly documents = computed<IDocument[]>(() => this.vendor()?.documents ?? []);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly status = computed(() => {
    const vendor = this.vendor();
    const override = this.statusOverride();
    if (override && vendor?.id === override.id) {
      return override.status;
    }
    return vendor?.status ?? null;
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isUnderReview = computed(() => this.status() === 'UNDER_REVIEW');

  /** Writing is the administrator's, matching the read/write split on /api/**. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly canWrite = computed(() => {
    this.accountService.account();
    return this.accountService.hasAnyAuthority(ConsoleAuthority.ADMIN);
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly initials = computed(() => {
    const name = this.vendor()?.name;
    if (!name) {
      return (this.vendor()?.id ?? '?').slice(0, 2).toUpperCase();
    }
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  /**
   * Place under review, or clear it.
   *
   * A status PATCH through the endpoint that already exists, exactly as the professional record
   * suspends. UNDER_REVIEW rather than SUSPENDED because that is what the prototype's action says
   * and what the seeded data uses: a vendor under review is still trading while somebody checks.
   */
  toggleReview(): void {
    const current = this.vendor();
    if (!current || this.isSaving()) {
      return;
    }
    const next = this.isUnderReview() ? 'ACTIVE' : 'UNDER_REVIEW';
    this.isSaving.set(true);
    this.vendorService.partialUpdate({ id: current.id, status: next }).subscribe({
      next: () => {
        this.statusOverride.set({ id: current.id, status: next });
        this.isSaving.set(false);
      },
      // Leave the pill as it was: relabelling on a failed write claims a state the server rejected.
      error: () => this.isSaving.set(false),
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  toggleArchived(): void {
    const current = this.vendor();
    if (!current || this.isSaving()) {
      return;
    }
    const next = !this.isArchived();
    this.isSaving.set(true);
    this.vendorService.setArchived(current, next).subscribe({
      next: () => {
        this.archivedOverride.set({ id: current.id, isArchived: next });
        this.isSaving.set(false);
      },
      // Leave the flag as it was. The error interceptor raises the alert;
      // flipping the label on a failed write would be a lie about the record.
      error: () => this.isSaving.set(false),
    });
  }
}
