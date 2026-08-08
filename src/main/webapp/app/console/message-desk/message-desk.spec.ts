import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { TaskService } from 'app/entities/operations/task/service/task.service';
import { MessageService } from 'app/entities/operations/message/service/message.service';
import { ConsoleAuthority } from 'app/shared/auth/console-role';

import { consoleActivatedRoute, provideConsoleTesting, settle, signInAs } from '../shared/console-testing';
import MessageDesk from './message-desk';
import MessageThread from './message-thread';

describe('MessageDesk', () => {
  let fixture: ComponentFixture<MessageDesk>;
  let component: MessageDesk;

  beforeEach(async () => {
    provideConsoleTesting([consoleActivatedRoute]);
    signInAs([ConsoleAuthority.ADMIN, ConsoleAuthority.USER]);

    fixture = TestBed.createComponent(MessageDesk);
    component = fixture.componentInstance;
    component.ngOnInit();
    await settle();
  });

  it('should load the queue with the total from the header, not the page length', () => {
    expect(component.totalItems()).toBe(12);
    expect(component.messages().length).toBe(12);
  });

  it('should count each status across the collection', () => {
    // The prototype's twelve messages: 3 new, 3 read, 6 replied.
    expect(component.counts()).toEqual({ NEW: 3, READ: 3, REPLIED: 6 });
  });

  it('should order the desk newest first', () => {
    const dates = component.messages().map(message => message.sentAt?.valueOf() ?? 0);
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
  });

  it('should filter by status server-side, keeping the total honest', async () => {
    component.toggleChip('status', 'NEW');
    await settle();

    expect(component.messages().length).toBe(3);
    expect(component.totalItems()).toBe(3);
    expect(component.messages().every(message => message.status === 'NEW')).toBe(true);
  });

  it('should replace rather than accumulate a filter within one dimension', async () => {
    component.toggleChip('status', 'NEW');
    await settle();
    component.toggleChip('status', 'READ');
    await settle();

    // Two statuses ANDed would match nothing; the second choice replaces the first.
    expect(component.chips().length).toBe(1);
    expect(component.messages().length).toBe(3);
    expect(component.messages().every(message => message.status === 'READ')).toBe(true);
  });

  it('should combine a status and a priority filter', async () => {
    component.toggleChip('status', 'REPLIED');
    await settle();
    component.toggleChip('priority', 'HIGH');
    await settle();

    expect(component.chips().length).toBe(2);
    expect(component.messages().every(message => message.status === 'REPLIED' && message.priority === 'HIGH')).toBe(true);
  });

  it('should clear every filter at once', async () => {
    component.toggleChip('status', 'NEW');
    await settle();
    component.clearFilters();
    await settle();

    expect(component.chips()).toEqual([]);
    expect(component.totalItems()).toBe(12);
  });

  it('should mark every unread message read and move the counts', async () => {
    component.markAllRead();
    await settle(12);

    expect(component.messages().some(message => message.status === 'NEW')).toBe(false);
    expect(component.counts().NEW).toBe(0);
    expect(component.counts().READ).toBe(6);
  });

  it('should reset to page one when a filter changes', async () => {
    // Set the signal directly rather than through navigateToPage: with twelve
    // messages and a page size of twenty there is only one page, and
    // NgbPagination correctly clamps a request for page 2 straight back to 1,
    // which would make this assertion vacuous.
    component.page.set(3);

    component.toggleChip('status', 'REPLIED');
    await settle();

    // Staying on page 3 of a smaller result set would show an empty screen.
    expect(component.page()).toBe(1);
    expect(component.messages().length).toBe(6);
  });

  it('should reset to page one when the search term changes', async () => {
    component.page.set(2);
    component.onSearch('roster');
    // The search is debounced 300ms, so this needs real time to elapse.
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(component.page()).toBe(1);
    expect(component.messages().every(message => /roster/i.test(message.subject ?? ''))).toBe(true);
  });
});

describe('MessageThread', () => {
  let fixture: ComponentFixture<MessageThread>;
  let component: MessageThread;
  let messageService: MessageService;
  let taskService: TaskService;

  const openThread = async (id: string): Promise<void> => {
    fixture = TestBed.createComponent(MessageThread);
    fixture.componentRef.setInput('id', id);
    component = fixture.componentInstance;
    component.ngOnInit();
    await settle(8);
  };

  beforeEach(() => {
    provideConsoleTesting([consoleActivatedRoute]);
    signInAs([ConsoleAuthority.ADMIN, ConsoleAuthority.USER]);
    messageService = TestBed.inject(MessageService);
    taskService = TestBed.inject(TaskService);
  });

  it('should mark an unread thread read on open', async () => {
    await openThread('m1');

    expect(component.message()?.status).toBe('READ');
    // Not just in the component — the change was persisted.
    const stored = await firstValueFrom(messageService.find('m1'));
    expect(stored.status).toBe('READ');
  });

  it('should leave an already-replied thread alone', async () => {
    await openThread('m7');
    expect(component.message()?.status).toBe('REPLIED');
  });

  it('should flip the thread to replied when a reply is sent', async () => {
    await openThread('m2');
    component.reply.set('Thank you, the upgrade takes effect next month.');
    component.send();
    await settle(8);

    const stored = await firstValueFrom(messageService.find('m2'));
    expect(stored.status).toBe('REPLIED');
  });

  it('should refuse to send an empty reply', async () => {
    await openThread('m3');
    component.reply.set('   ');
    component.send();
    await settle(8);

    const stored = await firstValueFrom(messageService.find('m3'));
    expect(stored.status).not.toBe('REPLIED');
  });

  it('should raise a task linked back to the message', async () => {
    await openThread('m1');
    const before = await firstValueFrom(taskService.query({ page: 0, size: 200 }));

    component.raiseTask();
    await settle(8);

    const after = await firstValueFrom(taskService.query({ page: 0, size: 200 }));
    expect((after.body ?? []).length).toBe((before.body ?? []).length + 1);

    const raised = (after.body ?? []).find(task => task.sourceMessage?.id === 'm1');
    expect(raised).toBeDefined();
    expect(raised?.state).toBe('TODO');
    expect(raised?.title).toContain('Home visit rescheduling request');
  });

  it('should lift a low-priority message to a normal-priority follow-up', async () => {
    // m7 is LOW. A low-priority thank-you still deserves a normal task.
    await openThread('m7');
    component.raiseTask();
    await settle(8);

    const tasks = await firstValueFrom(taskService.query({ page: 0, size: 200 }));
    const raised = (tasks.body ?? []).find(task => task.sourceMessage?.id === 'm7');
    expect(raised?.priority).toBe('NORMAL');
  });

  it('should escalate by writing the priority, not by showing a toast', async () => {
    await openThread('m2');
    expect(component.message()?.priority).toBe('NORMAL');

    component.escalate();
    await settle(8);

    const stored = await firstValueFrom(messageService.find('m2'));
    expect(stored.priority).toBe('HIGH');
  });

  it('should surface a missing thread rather than rendering an empty one', async () => {
    await openThread('9999');
    expect(component.notFound()).toBe(true);
    expect(component.message()).toBeNull();
  });
});
