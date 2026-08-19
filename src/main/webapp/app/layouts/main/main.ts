import { ChangeDetectionStrategy, Component, DOCUMENT, OnInit, Renderer2, RendererFactory2, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';

import { AppPageTitleStrategy } from 'app/app-page-title-strategy';
import { AccountService } from 'app/core/auth/account.service';
import { ShellStateService } from '../shell-state.service';
import Tabbar from '../tabbar/tabbar';
import Topbar from '../topbar/topbar';

/**
 * The shell.
 *
 * Two columns on desktop — the navy sidebar rendered into the `navbar`
 * outlet, and everything else — collapsing to one under 940px, where the
 * sidebar becomes a drawer and the tab bar appears.
 *
 * Signed out, the shell renders nothing but the routed view: the login
 * screen is a full-bleed two-panel page, not a page inside the console.
 */
@Component({
  selector: 'abf-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main.html',
  styleUrl: './main.scss',
  providers: [AppPageTitleStrategy],
  imports: [RouterOutlet, Topbar, Tabbar],
})
export default class Main implements OnInit {
  private readonly renderer: Renderer2;
  private readonly htmlElement: HTMLElement;

  private readonly router = inject(Router);
  private readonly appPageTitleStrategy = inject(AppPageTitleStrategy);
  private readonly accountService = inject(AccountService);
  private readonly document = inject(DOCUMENT);
  private readonly translateService = inject(TranslateService);
  private readonly rootRenderer = inject(RendererFactory2);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isAuthenticated = computed(() => this.accountService.account() !== null);
  /** Drives only the grid column width; the sidebar styles its own contents. */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  readonly isSidebarCollapsed = inject(ShellStateService).isSidebarCollapsed;

  constructor() {
    this.htmlElement = this.document.documentElement;
    this.renderer = this.rootRenderer.createRenderer(this.htmlElement, null);
  }

  ngOnInit(): void {
    // try to log in automatically
    this.accountService.identity().subscribe();

    this.translateService.onLangChange.subscribe((langChangeEvent: LangChangeEvent) => {
      this.appPageTitleStrategy.updateTitle(this.router.routerState.snapshot);
      dayjs.locale(langChangeEvent.lang);
      this.renderer.setAttribute(this.htmlElement, 'lang', langChangeEvent.lang);
    });
  }
}
