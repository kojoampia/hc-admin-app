import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

/**
 * The status chip used across every console screen.
 *
 * Colour alone never carries the status: the pill always shows its label, and
 * the dot is decoration on top of the word. That is why a suspended account
 * and a pending one remain distinguishable in greyscale and to anyone the
 * red/amber separation does not serve.
 */
const TONES: Record<string, string> = {
  // Account and verification status
  ACTIVE: 'ok',
  VERIFIED: 'ok',
  PENDING: 'warn',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
  ON_LEAVE: 'navy',
  UNDER_REVIEW: 'warn',
  // Message status
  NEW: 'gold',
  READ: 'navy',
  REPLIED: 'ok',
  // Priority
  HIGH: 'danger',
  NORMAL: 'gold',
  LOW: 'grey',
  // Task state
  TODO: 'navy',
  DOING: 'gold',
  DONE: 'ok',
  // Platform health
  HEALTHY: 'ok',
  DEGRADED: 'warn',
  DOWN: 'danger',
  // Audit level
  INFO: 'navy',
  WARN: 'warn',
};

@Component({
  selector: 'abf-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <span class="pill" [class]="'pill-' + tone()">
      <span class="dt" aria-hidden="true"></span>
      <span>{{ translationKey() | translate }}</span>
    </span>
  `,
  styleUrl: './status-pill.scss',
})
export class StatusPill {
  /** An enum constant, e.g. ACTIVE, NEW, HIGH. */
  readonly status = input.required<string | null | undefined>();
  /**
   * i18n namespace the label lives under. Defaults to the shared status
   * dictionary; a screen with its own wording can point elsewhere.
   */
  readonly namespace = input('console.status');

  readonly tone = computed(() => TONES[this.status() ?? ''] ?? 'grey');

  readonly translationKey = computed(() => `${this.namespace()}.${this.status() ?? 'UNKNOWN'}`);
}
