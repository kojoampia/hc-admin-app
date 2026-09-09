import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';

import dayjs from 'dayjs/esm';

import { StatusPill } from 'app/console/shared/status-pill/status-pill';
import { isNameUnavailable, resolveLinkDisplayName } from 'app/entities/directory/directory-link/directory-link.model';
import { DirectoryLinkService } from 'app/entities/directory/directory-link/service/directory-link.service';
import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';
import { Alert } from 'app/shared/alert/alert';
import { AlertError } from 'app/shared/alert/alert-error';
import { FormatMediumDatePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IPatient } from '../patient.model';
import { PatientService } from '../service/patient.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'abf-patient-detail',
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.scss',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, TranslatePipe, RouterLink, FormatMediumDatePipe, StatusPill],
})
export class PatientDetail {
  readonly patient = input<IPatient | null>(null);

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
    const patient = this.patient();
    const override = this.archivedOverride();
    if (override && patient?.id === override.id) {
      return override.isArchived;
    }
    return patient?.isArchived === true;
  });
  readonly isSaving = signal(false);

  /**
   * The clinical lead's name, which the patient payload does not carry — <b>keyed by the lead it
   * belongs to</b>.
   *
   * `GET /api/patients/{id}` nests the profile, the address, the angel, the plan and the hub — but
   * `clinicalLead` arrives as a Professional without its own profile, so it has a licence number and
   * a speciality and no name. The record fetches the one professional to fill that in. It is a
   * second request on a detail screen rather than a wider payload for every row of the list.
   *
   * The id travels with the value for the reason {@link archivedOverride} carries one: this
   * component instance survives `/patient/A/view` → `/patient/B/view`, because the two routes share
   * a `routeConfig` and Angular reuses the component rather than recreating it. So A's response can
   * land after B's record has, and an unkeyed signal would then print A's clinician on B's card.
   * See {@link clinicalLeadName}, which is what the template reads.
   */
  readonly resolvedLeadName = signal<{ leadId: string; name: string | null } | null>(null);

  /** The lead name, but only when it is a name for the lead currently on screen. */
  readonly clinicalLeadName = computed(() => {
    const resolved = this.resolvedLeadName();
    return resolved && resolved.leadId === this.patient()?.clinicalLead?.id ? resolved.name : null;
  });

  protected readonly patientService = inject(PatientService);
  private readonly professionalService = inject(ProfessionalService);
  private readonly directoryLinkService = inject(DirectoryLinkService);

  constructor() {
    effect(() => {
      const leadId = this.patient()?.clinicalLead?.id;
      this.resolvedLeadName.set(null);
      if (!leadId) {
        return;
      }
      this.professionalService.find(leadId).subscribe({
        next: professional => {
          const profile = professional.profile;
          const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
          this.resolvedLeadName.set({ leadId, name: name || null });
        },
        // The rest of the record is intact; the card falls back to the licence number.
        error: () => this.resolvedLeadName.set(null),
      });
    });

    effect(() => {
      const patient = this.patient();
      this.resolvedLinkIdentity.set(null);
      // Only when there is no name to show. A patient with a profile needs no link read at all,
      // which is every record in the directory that was not learned from an event.
      if (!patient || [patient.profile?.firstName, patient.profile?.lastName].some(Boolean)) {
        return;
      }
      this.directoryLinkService.findByLocalIds([patient.id]).subscribe({
        next: links => {
          const link = links.get(patient.id);
          this.resolvedLinkIdentity.set({
            id: patient.id,
            identity: resolveLinkDisplayName(link),
            unavailable: isNameUnavailable(link),
          });
        },
        // The heading says "Identity not on file", which is true of what this console can see.
        error: () => this.resolvedLinkIdentity.set(null),
      });
    });
  }

  /**
   * The address on this patient's sibling-stack link, when they have one and no profile —
   * <b>keyed by the patient it belongs to</b>.
   *
   * Same reasoning as the directory list, one screen along: a patient learned from a domain event
   * has no `Profile` and can never be given one from the wire, so this is the only identity there
   * is. One request, because a record screen is one record — the list's batched read exists because
   * it resolves a whole page.
   *
   * **The id is stored with the value and it is not decoration.** Navigating `/patient/A/view` →
   * `/patient/B/view` reuses this component instance — same `routeConfig` — so both effects re-run
   * against B while A's request may still be in flight. Writing the identity unkeyed meant that if
   * A's response landed second, **B's heading showed A's email address**: one patient's contact
   * address printed on another patient's record, on the screen whose entire purpose is naming the
   * right person. It is the same failure {@link archivedOverride} was already shaped to avoid, and
   * the fix is the same shape — see {@link linkIdentity}.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly resolvedLinkIdentity = signal<{ id: string; identity: string | null; unavailable?: boolean } | null>(null);

  /** The linked identity, but only when it is an identity for the record currently on screen. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly linkIdentity = computed(() => {
    const resolved = this.resolvedLinkIdentity();
    return resolved && resolved.id === this.patient()?.id ? resolved.identity : null;
  });

  /**
   * Whether to say, under the heading, that the name could not be checked with the patient app.
   *
   * The record's half of backlog item 50, and the same rule as the directory list's: only the
   * outcome where a lookup was owed and did not come back. A patient hc-patient genuinely does not
   * name gets no sentence — the address above is the whole answer.
   *
   * Keyed like everything else on this component, because `/patient/A/view` → `/patient/B/view`
   * reuses the instance and A's response can land after B's record has. An unkeyed flag would put
   * A's caveat under B's name.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly nameUnavailable = computed(() => {
    const resolved = this.resolvedLinkIdentity();
    return !!resolved && resolved.id === this.patient()?.id && resolved.unavailable === true;
  });

  /** Initials for the monogram, from whatever name is known — never from the id. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly initials = computed(() => {
    const profile = this.patient()?.profile;
    const parts = [profile?.firstName, profile?.lastName].filter(Boolean) as string[];
    if (parts.length > 0) {
      return parts
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase();
    }

    // The mailbox's first letters, matching the list's chip. Until backlog item 45 this was
    // `id.slice(0, 2)` — two hex characters of a Mongo ObjectId, which reads as a corrupted record.
    const identity = this.linkIdentity();
    if (identity) {
      const letters = identity
        .split('@')[0]
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0));
      if (letters.length > 0) {
        return letters.join('').toUpperCase();
      }
    }
    return '—';
  });

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly fullName = computed(() => {
    const profile = this.patient()?.profile;
    const name = [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(' ');
    return name || null;
  });

  /**
   * What the heading shows: the name, else the linked address, else null.
   *
   * Null is rendered as "Identity not on file" by the template rather than as the record id. The
   * id has not gone away — it is still on the line below, labelled `Account`, which is where an
   * identifier belongs and where it was already shown.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly headingName = computed(() => this.fullName() ?? this.linkIdentity());

  /**
   * What the clinical lead link shows: the resolved name, else the licence number, else the id.
   *
   * The template carried this as `clinicalLeadName() ?? lead.licenceNumber ?? lead.id` until
   * 2026-09-08. It is a computed now for the middle step: the annotation `@NotBlank` appears
   * nowhere in the api's main sources, so `""` satisfies `licenceNumber`'s `@NotNull
   * @Size(max = 40)` and is storable through the REST surface, and `??` let it through into an
   * anchor — a link with no text, on a record that does have a clinical lead. Pre-existing, and
   * not backlog item 45's defect, since blank is not an id.
   *
   * The id terminal is unreachable for the reason the professional list's `displayName` records:
   * `@NotNull` plus the `ValidatingMongoEventListener` `DatabaseConfiguration` registers. It is a
   * type terminator, not a rendering.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly clinicalLeadLabel = computed(() => {
    const lead = this.patient()?.clinicalLead;
    if (!lead) {
      return null;
    }
    const name = this.clinicalLeadName();
    if (name) {
      return name;
    }
    const licence = lead.licenceNumber ?? lead.id;
    return licence.trim().length > 0 ? licence : '—';
  });

  /**
   * The date of birth as a dayjs, because the one on the payload is a string.
   *
   * `PatientService` converts `joinedOn` and `lastActiveOn` and stops there — the nested profile,
   * angel, plan and hub are passed through as the server sent them. `IProfile.dateOfBirth` is
   * nevertheless typed `dayjs.Dayjs`, so the compiler is satisfied and `| formatMediumDate` throws
   * `day.format is not a function` at runtime. Any screen rendering a nested date hits this.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly dateOfBirth = computed(() => {
    const raw = this.patient()?.profile?.dateOfBirth;
    if (!raw) {
      return null;
    }
    const parsed = dayjs(raw);
    return parsed.isValid() ? parsed : null;
  });

  /**
   * Age in whole years, or null when there is no date of birth.
   *
   * Shown beside the date rather than instead of it: the demo shows both, and an age with no date
   * behind it cannot be checked against an ID document.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly age = computed(() => {
    const dateOfBirth = this.dateOfBirth();
    if (!dateOfBirth) {
      return null;
    }
    const years = dayjs().diff(dateOfBirth, 'year');
    return Number.isFinite(years) && years >= 0 ? years : null;
  });

  previousState(): void {
    globalThis.history.back();
  }

  toggleArchived(): void {
    const current = this.patient();
    if (!current || this.isSaving()) {
      return;
    }
    const next = !this.isArchived();
    this.isSaving.set(true);
    this.patientService.setArchived(current, next).subscribe({
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
