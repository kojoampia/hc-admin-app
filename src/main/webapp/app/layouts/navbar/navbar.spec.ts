import { beforeEach, describe, expect, it } from 'vitest';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { provideTranslateService } from '@ngx-translate/core';

import { Account } from 'app/core/auth/account.model';
import { AccountService } from 'app/core/auth/account.service';
import { LoginService } from 'app/login/login.service';
import { ConsoleAuthority } from 'app/shared/auth/console-role';

import { SHELL_NAVIGATION } from '../shell-navigation';
import Navbar from './navbar';

describe('Navbar Component', () => {
  let comp: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let accountService: AccountService;

  const accountWith = (authorities: string[]): Account => ({
    activated: true,
    authorities,
    email: 'efua.mensah@abofonsa.care',
    firstName: 'Efua',
    langKey: 'en',
    lastName: 'Mensah',
    login: 'efua.mensah@abofonsa.care',
    imageUrl: '',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        provideHttpClientTesting(),
        LoginService,
      ],
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Navbar);
    comp = fixture.componentInstance;
    accountService = TestBed.inject(AccountService);
  });

  it('should hold current authenticated user in variable account', () => {
    expect(comp.account()).toBeNull();

    const account = accountWith([ConsoleAuthority.ADMIN, ConsoleAuthority.USER]);
    accountService.authenticate(account);
    expect(comp.account()).toEqual(account);

    accountService.authenticate(null);
    expect(comp.account()).toBeNull();
  });

  it('should group the navigation in SHELL_NAVIGATION order without losing an item', () => {
    accountService.authenticate(accountWith([ConsoleAuthority.ADMIN, ConsoleAuthority.USER]));

    const groups = comp.groups();
    expect(groups.map(group => group.label)).toEqual([
      'global.menu.group.operations',
      'global.menu.group.directory',
      'global.menu.group.catalogue',
      'global.menu.group.account',
      'global.menu.group.administration',
    ]);
    expect(groups.flatMap(group => group.items)).toEqual([...SHELL_NAVIGATION]);
  });

  it('should hide the Administration group from anyone without ROLE_ADMIN', () => {
    accountService.authenticate(accountWith([ConsoleAuthority.SUPERVISOR, ConsoleAuthority.USER]));

    const labels = comp.groups().map(group => group.label);
    expect(labels).not.toContain('global.menu.group.administration');
    // The rest of the console stays reachable — read-only, not truncated.
    expect(labels).toContain('global.menu.group.operations');
    expect(
      comp
        .groups()
        .flatMap(group => group.items)
        .some(item => item.route.startsWith('admin/')),
    ).toBe(false);
  });

  it('should resolve the role chip from the authorities the token actually carries', () => {
    accountService.authenticate(accountWith([ConsoleAuthority.SUPERVISOR, ConsoleAuthority.USER]));
    expect(comp.roleTag()).toBe('global.role.sup.tag');

    accountService.authenticate(accountWith([ConsoleAuthority.DESK, ConsoleAuthority.USER]));
    expect(comp.roleTag()).toBe('global.role.desk.tag');

    accountService.authenticate(accountWith([ConsoleAuthority.ADMIN, ConsoleAuthority.USER]));
    expect(comp.roleTag()).toBe('global.role.ops.tag');
  });

  it('should derive the display name and initials from the account', () => {
    accountService.authenticate(accountWith([ConsoleAuthority.ADMIN]));
    expect(comp.displayName()).toBe('Efua Mensah');
    expect(comp.initials()).toBe('EM');
  });

  it('should suppress a badge that would render a zero', () => {
    const badged = SHELL_NAVIGATION.find(item => item.badge)!;
    // Nothing has been counted yet, so the counter service still reads 0.
    expect(comp.badgeFor(badged)).toBeNull();

    const unbadged = SHELL_NAVIGATION.find(item => !item.badge)!;
    expect(comp.badgeFor(unbadged)).toBeNull();
  });
});
