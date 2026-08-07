import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap/dropdown';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map, startWith } from 'rxjs';

import HasAnyAuthorityDirective from 'app/shared/auth/has-any-authority.directive';
import { TranslateDirective } from 'app/shared/language';

import { QUICK_ADD, QUICK_ADD_AUTHORITIES } from '../shell-navigation';
import { ShellCountersService } from '../shell-counters.service';
import { ShellStateService } from '../shell-state.service';

/**
 * The sticky cream bar above every screen: breadcrumb and page title on the
 * left, message-desk bell, print and the quick-add menu on the right.
 *
 * The title and crumb are read from route `data`, JHipster's own convention
 * for both — `pageTitle` is what `AppPageTitleStrategy` already sets the
 * browser title from, so a screen that sets it correctly gets the document
 * title and the topbar heading from one declaration.
 */
@Component({
  selector: 'abf-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  imports: [
    RouterLink,
    FontAwesomeModule,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    HasAnyAuthorityDirective,
    TranslateDirective,
    TranslatePipe,
  ],
})
export default class Topbar {
  readonly quickAdd = QUICK_ADD;
  readonly quickAddAuthorities = [...QUICK_ADD_AUTHORITIES];

  readonly pageTitle = signal('global.title');
  readonly breadcrumb = signal('global.menu.group.operations');

  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly shellState = inject(ShellStateService);
  private readonly counters = inject(ShellCountersService);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isSidebarOpen = this.shellState.isSidebarOpen;
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly unreadMessages = this.counters.unreadMessages;

  constructor() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        startWith(null),
        map(() => this.deepestRouteData()),
        takeUntilDestroyed(),
      )
      .subscribe(data => {
        this.pageTitle.set(data.pageTitle ?? 'global.title');
        this.breadcrumb.set(data.breadcrumb ?? 'global.menu.group.operations');
      });
  }

  toggleSidebar(): void {
    this.shellState.toggleSidebar();
  }

  print(): void {
    this.document.defaultView?.print();
  }

  /**
   * Walk to the leaf route and take its data. Angular merges parent data down
   * only when `paramsInheritanceStrategy` says so, so the walk collects both
   * keys explicitly and lets the deepest declaration win.
   */
  private deepestRouteData(): { pageTitle?: string; breadcrumb?: string } {
    let route = this.activatedRoute.root;
    const resolved: { pageTitle?: string; breadcrumb?: string } = {};
    while (route.firstChild) {
      route = route.firstChild;
      const data = route.snapshot.data;
      if (typeof data.pageTitle === 'string') {
        resolved.pageTitle = data.pageTitle;
      }
      if (typeof data.breadcrumb === 'string') {
        resolved.breadcrumb = data.breadcrumb;
      }
    }
    return resolved;
  }
}
