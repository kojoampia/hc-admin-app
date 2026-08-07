import { describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { CONSOLE_ROLES, ConsoleAuthority, roleByAuthorities } from 'app/shared/auth/console-role';
import { accountFor, issueToken, resolveRole } from 'app/core/mock/mock-auth';
import Topbar from 'app/layouts/topbar/topbar';

import DutyRoster from '../duty-roster/duty-roster';
import MessageDesk from '../message-desk/message-desk';
import MessageThread from '../message-desk/message-thread';
import TaskBoard from '../task-board/task-board';
import { provideConsoleTesting, settle, signInAs } from './console-testing';

const route = { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } };

const html = (fixture: ComponentFixture<unknown>): string => (fixture.nativeElement as HTMLElement).innerHTML;

/**
 * The read-only supervisor.
 *
 * The prototype expresses this with a `guard()` function that returns early;
 * here it is a real authority on a real token, so these tests assert what a
 * reviewer would check by hand — sign in as the supervisor and confirm every
 * mutating control is gone.
 */
describe('authority gating', () => {
  describe('role resolution', () => {
    it('should map each console login to its own authorities', () => {
      expect(resolveRole('efua.mensah@abofonsa.care').authorities).toEqual(['ROLE_ADMIN', 'ROLE_USER']);
      expect(resolveRole('supervisor@abofonsa.care').authorities).toEqual(['ROLE_SUPERVISOR', 'ROLE_USER']);
      expect(resolveRole('desk@abofonsa.care').authorities).toEqual(['ROLE_DESK', 'ROLE_USER']);
    });

    it('should fall back to the read-only role for an unknown login', () => {
      // Failing open to administrator would be the dangerous direction.
      expect(resolveRole('somebody@example.com').key).toBe('sup');
    });

    it('should carry the authorities in the token itself', () => {
      const token = issueToken(CONSOLE_ROLES[1], 1_700_000_000_000);
      const claims = JSON.parse(atob(token.split('.')[1])) as { auth: string; sub: string; exp: number };
      expect(claims.auth).toBe('ROLE_SUPERVISOR,ROLE_USER');
      expect(claims.sub).toBe('supervisor@abofonsa.care');
      expect(claims.exp).toBeGreaterThan(claims.exp - 1);
    });

    it('should resolve a held ROLE_ADMIN ahead of any narrower role', () => {
      expect(roleByAuthorities(['ROLE_SUPERVISOR', 'ROLE_ADMIN']).key).toBe('ops');
    });

    it('should give the two desk roles a name but no invented surname', () => {
      expect(accountFor(CONSOLE_ROLES[1]).firstName).toBe('Supervisor');
      expect(accountFor(CONSOLE_ROLES[1]).lastName).toBeNull();
    });
  });

  describe('the duty roster', () => {
    const build = async (authorities: string[]): Promise<ComponentFixture<DutyRoster>> => {
      provideConsoleTesting([route]);
      signInAs(authorities);
      const fixture = TestBed.createComponent(DutyRoster);
      fixture.componentInstance.ngOnInit();
      await settle();
      fixture.detectChanges();
      // *abfHasAnyAuthority clears its view from an effect, which flushes on
      // the following pass; reading the DOM after a single detectChanges()
      // sees the markup as it was before the authority was applied.
      await settle();
      fixture.detectChanges();
      return fixture;
    };

    it('should offer the administrator the whole toolbar', async () => {
      const fixture = await build([ConsoleAuthority.ADMIN, ConsoleAuthority.USER]);
      expect(html(fixture)).toContain('dutyRoster.publish');
      expect(fixture.componentInstance.canEdit()).toBe(true);
    });

    it('should hide auto-fill, reset and publish from the supervisor', async () => {
      const fixture = await build([ConsoleAuthority.SUPERVISOR, ConsoleAuthority.USER]);
      const markup = html(fixture);

      expect(markup).not.toContain('dutyRoster.autoFill');
      expect(markup).not.toContain('dutyRoster.resetWeek');
      expect(markup).not.toContain('dutyRoster.publish');
    });

    it('should disable every cell for the supervisor', async () => {
      const fixture = await build([ConsoleAuthority.SUPERVISOR, ConsoleAuthority.USER]);
      const cells = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.cell'));

      expect(cells.length).toBe(49);
      expect(cells.every(cell => cell.disabled)).toBe(true);
    });

    it('should leave the cells live for the administrator', async () => {
      const fixture = await build([ConsoleAuthority.ADMIN, ConsoleAuthority.USER]);
      const cells = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.cell'));

      expect(cells.length).toBe(49);
      expect(cells.some(cell => cell.disabled)).toBe(false);
    });
  });

  describe('the message desk', () => {
    const build = async (authorities: string[]): Promise<ComponentFixture<MessageDesk>> => {
      provideConsoleTesting([route]);
      signInAs(authorities);
      const fixture = TestBed.createComponent(MessageDesk);
      fixture.componentInstance.ngOnInit();
      await settle();
      fixture.detectChanges();
      // *abfHasAnyAuthority clears its view from an effect, which flushes on
      // the following pass; reading the DOM after a single detectChanges()
      // sees the markup as it was before the authority was applied.
      await settle();
      fixture.detectChanges();
      return fixture;
    };

    it('should hide mark-all-read from the supervisor', async () => {
      expect(html(await build([ConsoleAuthority.ADMIN]))).toContain('messageDesk.markAllRead');
      expect(html(await build([ConsoleAuthority.SUPERVISOR]))).not.toContain('messageDesk.markAllRead');
    });

    it('should still let the supervisor read and filter the queue', async () => {
      const fixture = await build([ConsoleAuthority.SUPERVISOR]);
      expect(fixture.componentInstance.messages().length).toBe(12);

      fixture.componentInstance.toggleChip('status', 'NEW');
      await settle();
      expect(fixture.componentInstance.messages().length).toBe(3);
    });
  });

  describe('the task board', () => {
    const build = async (authorities: string[]): Promise<ComponentFixture<TaskBoard>> => {
      provideConsoleTesting([route]);
      signInAs(authorities);
      const fixture = TestBed.createComponent(TaskBoard);
      fixture.componentInstance.ngOnInit();
      await settle();
      fixture.detectChanges();
      // *abfHasAnyAuthority clears its view from an effect, which flushes on
      // the following pass; reading the DOM after a single detectChanges()
      // sees the markup as it was before the authority was applied.
      await settle();
      fixture.detectChanges();
      return fixture;
    };

    it('should hide the new-task button from the supervisor', async () => {
      expect(html(await build([ConsoleAuthority.ADMIN]))).toContain('taskBoard.newTask');
      expect(html(await build([ConsoleAuthority.SUPERVISOR]))).not.toContain('taskBoard.newTask');
    });

    it('should still show the supervisor all three columns of work', async () => {
      const fixture = await build([ConsoleAuthority.SUPERVISOR]);
      const board = fixture.componentInstance.board();
      expect(board.map(column => column.items.length)).toEqual([5, 4, 4]);
    });
  });

  describe('the topbar quick-add', () => {
    const build = async (authorities: string[]): Promise<ComponentFixture<Topbar>> => {
      provideConsoleTesting([route]);
      signInAs(authorities);
      const fixture = TestBed.createComponent(Topbar);
      await settle();
      fixture.detectChanges();
      // *abfHasAnyAuthority clears its view from an effect, which flushes on
      // the following pass; reading the DOM after a single detectChanges()
      // sees the markup as it was before the authority was applied.
      await settle();
      fixture.detectChanges();
      return fixture;
    };

    it('should be offered to the administrator only', async () => {
      expect(html(await build([ConsoleAuthority.ADMIN]))).toContain('abf-quick-add');
      expect(html(await build([ConsoleAuthority.SUPERVISOR]))).not.toContain('abf-quick-add');
      expect(html(await build([ConsoleAuthority.DESK]))).not.toContain('abf-quick-add');
    });
  });

  describe('the message thread', () => {
    const build = async (authorities: string[]): Promise<ComponentFixture<MessageThread>> => {
      provideConsoleTesting([route]);
      signInAs(authorities);
      const fixture = TestBed.createComponent(MessageThread);
      fixture.componentRef.setInput('id', '4');
      fixture.componentInstance.ngOnInit();
      await settle(8);
      fixture.detectChanges();
      await settle();
      fixture.detectChanges();
      return fixture;
    };

    // Quoted so that "…thread.send" does not also match "…thread.sender",
    // which is the read-only Sender panel and stays visible for everyone.
    const key = (name: string): string => `"messageDesk.thread.${name}"`;

    it('should hide the reply box and every desk action from the supervisor', async () => {
      const markup = html(await build([ConsoleAuthority.SUPERVISOR]));

      expect(markup).not.toContain(key('send'));
      expect(markup).not.toContain(key('raiseTask'));
      expect(markup).not.toContain(key('markReplied'));
      expect(markup).not.toContain(key('markUnread'));
      expect(markup).not.toContain(key('escalate'));
    });

    it('should show them to the administrator', async () => {
      const markup = html(await build([ConsoleAuthority.ADMIN]));

      expect(markup).toContain(key('send'));
      expect(markup).toContain(key('raiseTask'));
      expect(markup).toContain(key('escalate'));
    });

    it('should still show the supervisor the read-only sender panel', async () => {
      // Gating removes what writes, not what informs.
      expect(html(await build([ConsoleAuthority.SUPERVISOR]))).toContain(key('sender'));
    });

    it('should still let the supervisor read the message', async () => {
      const fixture = await build([ConsoleAuthority.SUPERVISOR]);
      expect(fixture.componentInstance.message()?.subject).toContain('Duty roster clash');
    });
  });
});
