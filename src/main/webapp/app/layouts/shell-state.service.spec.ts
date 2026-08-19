import { afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { ShellStateService } from './shell-state.service';

const RAIL_KEY = 'abf.shell.sidebarCollapsed';

/**
 * The two pieces of shell state, and the fact that they are separate.
 *
 * `open` is the transient mobile drawer; `collapsed` is the persisted desktop rail. Conflating them
 * is the mistake worth guarding: collapsing on a wide screen must not leave a drawer "open" when the
 * window narrows, and opening the drawer on a phone must not rewrite a desktop preference.
 */
describe('ShellStateService', () => {
  beforeEach(() => {
    localStorage.removeItem(RAIL_KEY);
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.removeItem(RAIL_KEY);
    vitest.restoreAllMocks();
  });

  function service(): ShellStateService {
    return TestBed.inject(ShellStateService);
  }

  it('starts expanded and closed', () => {
    const shell = service();

    expect(shell.isSidebarCollapsed()).toBe(false);
    expect(shell.isSidebarOpen()).toBe(false);
  });

  it('toggles the rail', () => {
    const shell = service();

    shell.toggleSidebarCollapsed();
    expect(shell.isSidebarCollapsed()).toBe(true);

    shell.toggleSidebarCollapsed();
    expect(shell.isSidebarCollapsed()).toBe(false);
  });

  it('remembers the collapsed choice across a reload', () => {
    service().toggleSidebarCollapsed();
    expect(localStorage.getItem(RAIL_KEY)).toBe('true');

    // A fresh injector is what a reload amounts to for this service.
    TestBed.resetTestingModule();
    expect(service().isSidebarCollapsed()).toBe(true);
  });

  /** The drawer is transient — it must never come back open on a fresh load. */
  it('does not persist the drawer', () => {
    const shell = service();
    shell.openSidebar();
    expect(shell.isSidebarOpen()).toBe(true);

    TestBed.resetTestingModule();
    expect(service().isSidebarOpen()).toBe(false);
  });

  it('keeps the drawer and the rail independent', () => {
    const shell = service();

    shell.toggleSidebarCollapsed();
    expect(shell.isSidebarOpen()).toBe(false);

    shell.openSidebar();
    expect(shell.isSidebarCollapsed()).toBe(true);

    shell.closeSidebar();
    expect(shell.isSidebarCollapsed()).toBe(true);
  });

  /**
   * Storage throws rather than returning null in Safari's private mode and wherever site data is
   * blocked. The shell must still render — failing to remember a sidebar preference is not worth
   * taking the console down for.
   */
  it('still works when storage is unavailable', () => {
    vitest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vitest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    const shell = service();
    expect(shell.isSidebarCollapsed()).toBe(false);

    expect(() => shell.toggleSidebarCollapsed()).not.toThrow();
    expect(shell.isSidebarCollapsed()).toBe(true);
  });
});
