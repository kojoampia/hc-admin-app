import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { ITask } from 'app/entities/operations/task/task.model';
import { Priority } from 'app/entities/enumerations/priority.model';
import { TaskState } from 'app/entities/enumerations/task-state.model';

import TaskBoard from './task-board';

/**
 * The board's filter, and the one thing the board was quietly not saying.
 *
 * <p>Item 24: it had a search box and no filter. The filter runs in the browser, which is the
 * opposite of every list in the console and is deliberate — the board holds the whole collection so
 * that moving a card between columns needs no round trip, and a server-side filter would refetch
 * three columns to answer a question about rows already in memory.
 *
 * <p>It filters by priority and owner, never by state: the columns <em>are</em> the state, and a
 * board filtered to TODO is a board with two empty columns.
 */
describe('task board filters', () => {
  let component: TaskBoard;
  let httpMock: HttpTestingController;

  const task = (id: string, state: keyof typeof TaskState, priority: keyof typeof Priority, owner?: string): Partial<ITask> => ({
    id,
    title: `Task ${id}`,
    state,
    priority,
    owner: owner ? { id: owner, licenceNumber: `GH-${owner}` } : null,
  });

  const board = (tasks: Partial<ITask>[], total = tasks.length): void => {
    const requests = httpMock.match(
      (request: HttpRequest<unknown>) =>
        request.url.includes('tasks') && request.method === 'GET' && !request.url.includes('professionals'),
    );
    requests.forEach(request => request.flush(tasks, { headers: { 'X-Total-Count': String(total) } }));
    httpMock.match((request: HttpRequest<unknown>) => request.url.includes('professionals')).forEach(request => request.flush([]));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    });
    component = TestBed.runInInjectionContext(() => new TaskBoard());
    httpMock = TestBed.inject(HttpTestingController);
    component.ngOnInit();
    board([
      task('t1', 'TODO', 'HIGH', 'p1'),
      task('t2', 'TODO', 'LOW', 'p2'),
      task('t3', 'DOING', 'HIGH', 'p2'),
      task('t4', 'DONE', 'NORMAL'),
    ]);
  });

  it('narrows every column at once when a priority is chosen', () => {
    component.togglePriority('HIGH');

    expect(component.board().map(column => column.items.map(item => item.id))).toEqual([['t1'], ['t3'], []]);
  });

  it('filters by owner, and offers only owners who hold a card', () => {
    expect(component.owners().map(person => person.id)).toEqual(['p1', 'p2']);

    component.onOwner('p2');

    expect(component.board().flatMap(column => column.items.map(item => item.id))).toEqual(['t2', 't3']);
  });

  /** Two filters narrow together; neither replaces the other. */
  it('intersects the priority and owner filters', () => {
    component.togglePriority('HIGH');
    component.onOwner('p2');

    expect(component.board().flatMap(column => column.items.map(item => item.id))).toEqual(['t3']);
  });

  it('clears a priority when its chip is pressed again', () => {
    component.togglePriority('HIGH');
    component.togglePriority('HIGH');

    expect(component.board().flatMap(column => column.items).length).toBe(4);
  });

  /**
   * A task carrying no priority is NORMAL, the value the card already draws it as.
   *
   * <p>Treated as "no priority" instead, it would vanish from every priority filter and from none
   * of the counts, which is the kind of disappearance nobody reports as a bug.
   */
  it('treats a task with no priority as NORMAL', () => {
    component.tasks.set([{ id: 't9', title: 'Untriaged', state: 'TODO' }]);
    component.togglePriority('NORMAL');

    expect(component.board()[0].items.map(item => item.id)).toEqual(['t9']);
  });

  /** The board is one page, and says so when that page is not the whole backlog. */
  it('says when it is showing less than the whole board', () => {
    expect(component.isTruncated()).toBe(false);

    component.load();
    board([task('t1', 'TODO', 'HIGH')], 260);

    expect(component.isTruncated()).toBe(true);
  });
});
