import { Injectable, computed, inject, signal } from '@angular/core';

import { map } from 'rxjs';

import { ProfessionalService } from 'app/entities/directory/professional/service/professional.service';

/**
 * Professional id → display name.
 *
 * `Professional` has no name of its own: the name lives on its `Profile`, and
 * JDL cannot use a field across a relationship as a display field, so every
 * `Task.owner` / `Team.supervisor` / `ShiftAssignment.professional` reference
 * carries a licence number. That is correct as an identifier and useless as a
 * label — the prototype shows "K. Owusu", not "NMC/GH/19-8820".
 *
 * This loads the professionals once and resolves the real name, which is the
 * "resolve it through Profile in the console screens" half of that trade.
 */
@Injectable({ providedIn: 'root' })
export class ProfessionalNamesService {
  private readonly professionalService = inject(ProfessionalService);
  private readonly loaded = signal(false);
  private readonly names = signal<Map<string, string>>(new Map());

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly byId = computed(() => this.names());

  /** Idempotent: the directory is small and changes rarely, so it loads once. */
  load(): void {
    if (this.loaded()) {
      return;
    }
    this.loaded.set(true);
    this.professionalService
      .query({ page: 0, size: 200, sort: ['id,asc'] })
      .pipe(map(response => response.body ?? []))
      .subscribe({
        next: professionals => {
          const names = new Map<string, string>();
          for (const professional of professionals) {
            const full = [professional.profile?.firstName, professional.profile?.lastName].filter(Boolean).join(' ').trim();
            if (full) {
              names.set(professional.id, full);
            }
          }
          this.names.set(names);
        },
        // A failed lookup leaves the licence number showing, which is a worse
        // label but still identifies the right person.
        error: () => this.loaded.set(false),
      });
  }

  /** The name if known, otherwise whatever identifier we were given. */
  nameFor(id: string | null | undefined, fallback: string | null | undefined): string {
    if (id == null) {
      return fallback ?? '';
    }
    return this.names().get(id) ?? fallback ?? '';
  }

  initialsFor(id: string | null | undefined, fallback: string | null | undefined): string {
    const name = this.nameFor(id, fallback);
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return '··';
    }
    // A licence number has no word structure worth abbreviating; take letters.
    if (words.length === 1 && /[^A-Za-z]/.test(words[0])) {
      return (
        words[0]
          .replace(/[^A-Za-z]/g, '')
          .slice(0, 2)
          .toUpperCase() || '··'
      );
    }
    return words
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
