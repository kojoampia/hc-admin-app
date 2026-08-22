import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { parentOf } from './parent-route';

/**
 * The way back, on every screen that is not a destination in its own right.
 *
 * <p>Rendered once in the topbar rather than added to each template. Forty-five screens would
 * otherwise each need their own copy, a new generated entity would arrive without one, and the
 * console already had exactly that: `message-thread` carried a hand-written "Back to the desk" and
 * nothing else did.
 *
 * <p>What it points at is {@link parentOf}'s business. This component only asks after each
 * navigation and renders nothing when the answer is `null`.
 */
@Component({
  selector: 'abf-back-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FontAwesomeModule, TranslatePipe],
  template: `
    @if (parent(); as target) {
      <a class="abf-back" [routerLink]="target.commands" data-cy="backLink">
        <fa-icon icon="arrow-left" />
        <span>{{ target.label | translate: labelParams() }}</span>
      </a>
    }
  `,
  styles: `
    .abf-back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--abf-grey);
      text-decoration: none;
      transition: color 0.14s;
    }

    .abf-back:hover,
    .abf-back:focus-visible {
      color: var(--abf-navy);
      text-decoration: underline;
    }
  `,
})
export default class BackLink {
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  private readonly url = signal(this.router.url);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly parent = computed(() => parentOf(this.url()));

  /**
   * "Back to {{name}}" takes the destination's own menu label, which is itself a key.
   *
   * <p>Resolved here rather than passed through the pipe, because interpolating a key into a
   * translated string renders the key. The outer string still goes through the pipe, so only this
   * one substitution is eager — and it is a sidebar label, which is loaded before any screen with a
   * back link can be reached.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly labelParams = computed(() => {
    const name = this.parent()?.params.name;
    return name ? { name: this.translateService.instant(name) as string } : {};
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(event => this.url.set(event.urlAfterRedirects));
  }
}
