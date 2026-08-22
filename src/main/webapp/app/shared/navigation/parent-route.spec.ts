import { describe, expect, it } from 'vitest';

import { parentOf } from './parent-route';

/**
 * Where "back" goes, which is the whole of this feature.
 *
 * <p>The link is rendered once in the topbar, so this function is the only thing deciding what
 * every screen in the console does when somebody presses it. It is a pure function of the URL for
 * that reason: the alternative — browser history — cannot be asserted, and on a fresh tab or
 * straight after signing in it leads out of the console entirely.
 */
describe('parentOf', () => {
  /** A destination reachable from the sidebar has no "back": it is where back would go. */
  it.each(['/dashboard', '/patient', '/message-desk', '/task-board', '/wage-rates', '/account', '/'])('offers no back link on %s', url => {
    expect(parentOf(url)).toBeNull();
  });

  it('sends a create form back to the list', () => {
    expect(parentOf('/patient/new')?.commands).toEqual(['/', 'patient']);
  });

  it('sends a record back to the list', () => {
    expect(parentOf('/patient/p1/view')?.commands).toEqual(['/', 'patient']);
  });

  /**
   * An edit screen goes back to the record, not to the list.
   *
   * <p>It is the one hop where the two differ, and the record is the right answer: somebody editing
   * arrived from the record, and returning past it to the list loses their place in a directory
   * that may be several pages long.
   */
  it('sends an edit form back to the record it is editing', () => {
    expect(parentOf('/patient/p1/edit')?.commands).toEqual(['/', 'patient', 'p1', 'view']);
  });

  /**
   * `credential` has no detail route — it is the gateway's Account, listed and edited but never
   * shown on its own. Its edit form has to fall back to the list or the link points at a 404.
   */
  it('sends an edit form back to the list when the entity has no record screen', () => {
    expect(parentOf('/credential/c1/edit')?.commands).toEqual(['/', 'credential']);
  });

  /** The message desk addresses a thread with a bare id and no action segment. */
  it('sends a message thread back to the desk', () => {
    expect(parentOf('/message-desk/m1')?.commands).toEqual(['/', 'message-desk']);
  });

  it('handles a nested root like the admin screens', () => {
    expect(parentOf('/admin/user-management/kojo/view')?.commands).toEqual(['/', 'admin', 'user-management']);
    expect(parentOf('/admin/user-management/new')?.commands).toEqual(['/', 'admin', 'user-management']);
  });

  /**
   * The five admin screens are destinations too, and their routes are two segments long.
   *
   * <p>A rule that counted segments alone offered them a back link to `/admin` — a `loadChildren`
   * parent with no component of its own, so pressing it left the shell up and the content area
   * blank. Found by pressing it.
   */
  it.each(['/admin/user-management', '/admin/health', '/admin/metrics', '/admin/configuration', '/admin/logs'])(
    'offers no back link on %s, which the sidebar lists',
    url => {
      expect(parentOf(url)).toBeNull();
    },
  );

  /**
   * And nothing else may land on `/admin` either.
   *
   * <p>`/admin/docs` is a real route the sidebar does not list, so the destination rule above does
   * not cover it; without naming `admin` as a non-screen it would still link to the blank page.
   */
  it('never sends anybody to a route that renders nothing', () => {
    expect(parentOf('/admin/docs')).toBeNull();
  });

  /**
   * The label comes from the sidebar's own list, so the back link and the menu entry cannot end up
   * calling the same screen two different things.
   */
  it('names the destination from the navigation where there is an entry for it', () => {
    expect(parentOf('/patient/p1/view')).toMatchObject({
      label: 'global.action.backTo',
      params: { name: 'global.menu.console.patients' },
    });
  });

  /** An entity with no sidebar entry falls back to a plain "Back" rather than a guessed name. */
  it('does not invent a name for a destination the sidebar does not list', () => {
    expect(parentOf('/address/a1/view')?.label).toBe('global.action.back');
  });

  it('names the record hop distinctly', () => {
    expect(parentOf('/patient/p1/edit')?.label).toBe('global.action.backToRecord');
  });

  /** Query strings carry the directory's filter and page; they must not confuse the segments. */
  it('ignores a query string and a fragment', () => {
    expect(parentOf('/patient/p1/view?page=3&status=PENDING#top')?.commands).toEqual(['/', 'patient']);
  });
});
