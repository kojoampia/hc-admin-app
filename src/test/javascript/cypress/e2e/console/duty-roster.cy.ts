// e2e-fixture: mutating
// The `write actions` block cycles a cell, deletes and re-creates assignments and publishes the
// week. It reconciles all of that in `afterEach` and is the one file here that does — but the
// reconcile cannot give an assignment its seeded id back (see the note on that block), so a stack
// this has run against carries duplicate rows until it is rebuilt.

/**
 * The duty-roster grid, against the seeded quality stack.
 *
 * WHY THIS WAS REWRITTEN (2026-09-01). Every figure here was `week-2026-08-03`'s. The `test` seed
 * grew on 2026-08-18 from one roster week to fifteen — twelve before the original and two after —
 * and `CurrentRosterWeekService.inForce()` returns the latest week whose `startDate` is not in the
 * future, so the grid moved to `week-2026-08-17` and the old numbers stopped describing anything.
 * Five of the seven specs were affected: three asserted figures the stack cannot produce, one
 * selected an element that no longer exists at 100% cover, and one passed vacuously.
 *
 * SO MOST OF WHAT FOLLOWS IS DERIVED FROM THE GRID rather than hard-coded, because a spec whose
 * expectations are transcribed from a fixture goes stale the next time the fixture grows and says
 * nothing while it does. The stat tiles are checked against the cells they summarise, which is a
 * real assertion — it catches a mis-computed statistic — and cannot rot. Exactly one spec states
 * absolute numbers, deliberately, and carries the command to recompute them.
 *
 * THE MUTATING SPECS PUT THE WEEK BACK. They share one database, Cypress does not reseed between
 * tests, and `DevelopmentDataInitializer` only upserts the fixture at application start — so until
 * 2026-09-01 this file was not runnable twice. Everything that writes now lives in the
 * `write actions` block, which snapshots the week's assignments in `beforeEach` and reconciles them
 * in `afterEach`. See the note on that block for what the reconcile can and cannot restore.
 */

/** The one place absolute figures live. Recompute after any change to `hc-admin-ms-data.json`:
 *
 *   python3 - <<'PY'
 *   import json, datetime
 *   d = json.load(open('api/src/main/resources/data/hc-admin-ms-data.json'))['test']
 *   wk = max([w for w in d['rosterWeeks']
 *             if datetime.date.fromisoformat(w['startDate']) <= datetime.date.today()],
 *            key=lambda w: w['startDate'])
 *   ids = {p['id'] for p in d['professionals'] if p.get('status') != 'PENDING'}
 *   ref = lambda v: v['id'] if isinstance(v, dict) else v
 *   cells = [s for s in d['shiftAssignments']
 *            if ref(s['week']) == wk['id'] and ref(s['professional']) in ids]
 *   print(repr(wk['label']), '|', len(ids), 'staff |', len(cells), 'planned |',
 *         len([c for c in cells if c['shift'] != 'OFF']), 'worked')
 *   PY
 */
const SEEDED = {
  week: 'Week of 17 August 2026',
  staff: 7, // 9 professionals less the 2 with status PENDING, which buildRows() drops
  cells: 49, // staff x 7 days
  planned: 49, // every slot filled — this week is fully covered
};

/**
 * THE WORKED-SHIFT COUNT IS STILL NOT ASSERTED AS AN ABSOLUTE, though it is now only history that
 * stops it.
 *
 * <p>On a pristine seed it is 35. Before the reconcile below existed, `autoFill()` left permanent
 * residue — assignments under generated ids that no restart removes, because the initializer
 * upserts the seed's fixed ids rather than reconciling the collection. Measured 2026-09-01:
 * `week-2026-08-17` should hold 63 assignments and held 99. `buildRows()` takes the first match per
 * cell, so a leftover row can shadow a seeded OFF and the count reads 36.
 *
 * <p>Nothing here leaks any more, so a stack seeded after this change will read 35. A stack these
 * specs have already run against will not, and only `./startup.sh --clean` fixes that. Until the
 * quality volume has been dropped, the count is checked for internal consistency against the grid
 * instead — which is true on a dirty stack and still fails if `workedShifts` is computed wrongly.
 */

/** Two professionals this file addresses by name, because their status is the thing under test. */
const ACTIVE = 'p1'; // ACTIVE, and first by `sort: id,asc`, so auto-fill must reach it
const SUSPENDED = 'p9'; // SUSPENDED, so auto-fill must refuse it

/**
 * Rows are addressed by whose row they are, not by index.
 *
 * <p>`.eq(6)` was p9 only for as long as the fixture held exactly p1..p9 with two of them PENDING.
 * A tenth professional sorts `p1, p10, p2, …` and silently moves every index after the first, and
 * the resulting failure ("expected not to have class 'on'") names nothing that would lead you to
 * the row having moved. The professional link is the only thing in the row that carries an id.
 */
const rowOf = (professionalId: string): string => `[data-cy="rosterGrid"] tbody tr:has(a[href="/professional/${professionalId}/view"])`;
const mondayOf = (professionalId: string): string => `${rowOf(professionalId)} .cell:first`;

interface SeededAssignment {
  id: string;
  dayIndex: number;
  shift: string;
  professional?: { id?: string };
}

describe('duty roster', () => {
  beforeEach(() => {
    cy.signInAs('ops');
    cy.visit('/duty-roster');
    // Not `[data-cy="rosterGrid"]` — the table is unconditional and exists on first paint with
    // only the @empty row inside it, so waiting on it is waiting on nothing.
    cy.get('.cell').should('have.length.at.least', 1);
  });

  /**
   * The tiles are computations over the grid, so check them against it. This is what the old
   * figure-by-figure spec should have been: it survives the fixture changing, and still fails if
   * `unassignedSlots`, `coverPercent` or `workedShifts` is wrong.
   */
  it('should show stat tiles that agree with the grid they summarise', () => {
    cy.get('.cell').then($cells => {
      const total = $cells.length;
      const filled = $cells.filter('.on').length;
      const worked = $cells.filter('.cell--day, .cell--evening, .cell--night').length;

      // `have.text` on the tile's own <b>, not `contain.text` on the tile: the tile's text is the
      // number followed by a label, and `contain.text('0')` is satisfied by a rendered 10 or 20.
      cy.contains('.stat', 'Unassigned slots')
        .find('b')
        .should('have.text', String(total - filled));
      cy.contains('.stat', 'Week planned')
        .find('b')
        .should('have.text', `${Math.round((filled / total) * 100)}%`);
      cy.contains('.stat', 'Shifts this week').find('b').should('have.text', String(worked));
    });

    cy.get('[data-cy="rosterGrid"] tbody tr:not(.tally)').then($rows => {
      cy.contains('.stat', 'Rostered staff').find('b').should('have.text', String($rows.length));
    });
  });

  /** The anchor. Without it the derived checks above would pass against an empty grid. */
  it('should render the seeded week, fully covered', () => {
    cy.contains(SEEDED.week).should('exist');
    cy.get('[data-cy="rosterGrid"] tbody tr:not(.tally)').should('have.length', SEEDED.staff);
    cy.get('.cell').should('have.length', SEEDED.cells);
    cy.get('.cell.on').should('have.length', SEEDED.planned);
    cy.get('.cell').not('.on').should('have.length', 0);
    cy.contains('.stat', 'Unassigned slots').find('b').should('have.text', '0');
    cy.contains('.stat', 'Week planned').find('b').should('have.text', '100%');
  });

  it('should give every rosterable professional a row, seven days wide, plus one tally row', () => {
    cy.get('[data-cy="rosterGrid"] tbody tr.tally').should('have.length', 1);
    cy.get('[data-cy="rosterGrid"] tbody tr:not(.tally)').should('have.length', SEEDED.staff);
    cy.get('.cell').should('have.length', SEEDED.staff * 7);
  });

  /**
   * The tally flags a day with fewer than three on duty. The seeded week's thinnest day has four,
   * so nothing is flagged — which is worth asserting rather than skipping, because the previous
   * version of this spec asserted the flag DOES render and had been failing ever since the fixture
   * changed. If a future fixture drops a day below three this turns red and should be read as the
   * fixture changing, not the flag breaking.
   */
  it('should raise no short-staffing flag for a week with four or more on duty every day', () => {
    cy.get('.tally-cell').should('have.length', 7);
    cy.get('.tally-cell b.short').should('not.exist');
    cy.get('.tally-cell b').each($count => {
      expect(Number($count.text().trim())).to.be.at.least(3);
    });
  });

  it('should hide every write control from the supervisor', () => {
    cy.signInAs('sup');
    cy.visit('/duty-roster');

    // The grid first. `*abfHasAnyAuthority` renders nothing until the account signal is populated,
    // so a `should('not.exist')` issued straight after cy.visit is satisfied by the page not having
    // loaded yet and passes for an admin too.
    cy.get('.cell').should('have.length', SEEDED.cells);

    cy.contains('button', 'Auto-fill gaps').should('not.exist');
    cy.contains('button', 'Reset week').should('not.exist');
    cy.contains('button', 'Publish').should('not.exist');
    // Planning writes a round to another stack entirely, so it is the last control that should
    // ever be reachable by a read-only account.
    cy.get('[data-cy="openPlanner"]').should('not.exist');
    cy.get('.cell:not([disabled])').should('have.length', 0);
  });

  // --- the specs below write ---------------------------------------------------------------------

  /**
   * Everything that mutates, with the week put back afterwards.
   *
   * <p><b>What the reconcile restores exactly:</b> which cell holds which shift, and therefore
   * every count, percentage and class this file asserts. Anything created is deleted; anything
   * edited is patched back; anything deleted is re-created.
   *
   * <p><b>What it cannot restore is the id.</b> `POST /shift-assignments` rejects a body carrying
   * one and `PUT` 404s on a row that no longer exists, so a re-created assignment comes back under
   * a generated Mongo id rather than its seeded `shift-2026-08-17-p1`. At the next application
   * start the initializer upserts the seeded id alongside it and the week holds a duplicate pair —
   * same professional, same day, same shift. `buildRows()` takes the first match per cell, so the
   * grid is identical either way and every assertion here still holds; only the raw document count
   * differs, and nothing asserts that. Clearing it needs `./startup.sh --clean`.
   */
  describe('write actions', () => {
    let weekBefore: { id: string; published: boolean };
    let assignmentsBefore: SeededAssignment[];

    beforeEach(() => {
      cy.adminApi('GET', '/roster-weeks/current')
        .then(({ body }) => {
          weekBefore = body;
          return cy.adminApi('GET', `/shift-assignments?weekId.equals=${body.id}&size=500`);
        })
        .then(({ body }) => {
          assignmentsBefore = body;
        });
    });

    afterEach(() => {
      cy.adminApi('GET', `/shift-assignments?weekId.equals=${weekBefore.id}&size=500`).then(({ body }) => {
        const present = new Map<string, SeededAssignment>((body as SeededAssignment[]).map(a => [a.id, a]));
        const seeded = new Set(assignmentsBefore.map(a => a.id));

        (body as SeededAssignment[])
          .filter(a => !seeded.has(a.id))
          .forEach(a => {
            cy.adminApi('DELETE', `/shift-assignments/${a.id}`);
          });

        assignmentsBefore.forEach(a => {
          const now = present.get(a.id);
          if (!now) {
            cy.adminApi('POST', '/shift-assignments', { ...a, id: null });
          } else if (now.shift !== a.shift) {
            cy.adminApi('PATCH', `/shift-assignments/${a.id}`, { id: a.id, shift: a.shift });
          }
        });
      });
      // PUT rather than PATCH: it restores `publishedAt` too, which PATCH would leave stamped.
      cy.adminApi('PUT', `/roster-weeks/${weekBefore.id}`, weekBefore);
    });

    /** `SHIFT_CYCLE` from duty-roster.ts: unassigned -> DAY -> EVENING -> NIGHT -> OFF -> unassigned. */
    const NEXT_SHIFT: Record<string, string> = {
      'cell--day': 'cell--evening',
      'cell--evening': 'cell--night',
      'cell--night': 'cell--off',
    };

    const shiftClassOf = ($cell: JQuery<HTMLElement>): string =>
      ($cell.attr('class') ?? '').split(/\s+/).find(c => c.startsWith('cell--')) ?? '';

    /**
     * Cycling advances a cell one step through the shift order.
     *
     * <p><b>The expected result is derived from what is on screen, not from the fixture.</b> An
     * earlier draft asserted the first cell was EVENING because that is what `hc-admin-ms-data.json`
     * says; on a stack these specs had already run against it was NIGHT.
     *
     * <p>It deliberately picks a cell that is neither OFF nor unassigned, so the click is a PATCH
     * rather than a delete-and-recreate. That keeps the assignment's seeded id, which is the one
     * thing the reconcile above cannot give back.
     */
    it('should cycle a cell to the next shift in the order', () => {
      cy.get(`${rowOf(ACTIVE)} .cell.on`)
        .not('.cell--off')
        .first()
        .as('cell');

      cy.get('@cell').then($cell => {
        const before = shiftClassOf($cell);
        const after = NEXT_SHIFT[before];
        expect(after, `a next shift for ${before}`).to.be.a('string');

        cy.get('@cell').click();
        cy.get('@cell').should('have.class', after);
      });
    });

    /**
     * Auto-fill fills the gaps it may and refuses the ones it may not.
     *
     * <p>This spec has passed for the wrong reason twice. First it asserted unassigned was not
     * `'10'`, vacuously true once the seeded week reached 100% cover. Then it opened a single gap
     * on `p9` (SUSPENDED) and asserted the gap survived — but `autoFill()` skips every non-ACTIVE
     * row, so with no ACTIVE gap on the grid `creates` was empty and the method returned without
     * issuing one request. Emptying its body left the spec green: it could not tell "correctly
     * refused the suspended row" from "did nothing at all".
     *
     * <p>So it now opens <b>two</b> gaps — one auto-fill must close, one it must leave — and the
     * pair is what makes either half mean anything.
     */
    it('should fill an active professional and leave a suspended one alone', () => {
      // Every row for that cell, not just the seeded one: a stack these specs have run against
      // before carries duplicates under generated ids, and `buildRows()` would show one of those
      // and the gap would never open. The reconcile re-creates whatever this removes.
      const openGap = (professionalId: string): void => {
        const monday = assignmentsBefore.filter(a => a.professional?.id === professionalId && a.dayIndex === 0);
        expect(monday, `a seeded Monday for ${professionalId}`).to.have.length.of.at.least(1);
        monday.forEach(a => {
          cy.adminApi('DELETE', `/shift-assignments/${a.id}`);
        });
      };

      openGap(ACTIVE);
      openGap(SUSPENDED);
      cy.reload();
      cy.get('.cell').not('.on').should('have.length', 2);

      cy.contains('button', 'Auto-fill gaps').click();

      // The active row's gap is closed, at the rotation `order[(dayIndex + rowIndex) % 3]` gives
      // the first row's Monday...
      cy.get(mondayOf(ACTIVE), { timeout: 10000 }).should('have.class', 'cell--day');
      // ...and the suspended row's is the only one left on the grid.
      cy.get(mondayOf(SUSPENDED)).should('not.have.class', 'on');
      cy.get('.cell').not('.on').should('have.length', 1);
    });

    /**
     * Publishing stamps the week, after which the button has nothing left to do.
     *
     * <p>It used to branch on the button's state and, when it found it disabled, assert that it was
     * disabled. `published` is persisted and the seed only upserts it at application start, so
     * after the first run that was the branch every run took — and breaking `publish()` outright
     * left the spec green. The week is now put into the state the spec needs, and the reconcile
     * above puts it back.
     */
    it('should publish the week', () => {
      cy.adminApi('PATCH', `/roster-weeks/${weekBefore.id}`, { id: weekBefore.id, published: false });
      cy.reload();
      cy.get('.cell').should('have.length.at.least', 1);

      cy.get('.cell')
        .filter('.cell--day, .cell--evening, .cell--night')
        .its('length')
        .then(workedBefore => {
          cy.contains('button', 'Publish').should('be.enabled').click();
          cy.contains('button', 'Publish', { timeout: 10000 }).should('be.disabled');
          cy.adminApi('GET', `/roster-weeks/${weekBefore.id}`).then(response => {
            expect(response.body.published).to.eq(true);
            // The publication time is the SERVER's, since 2026-09-04 (decision 8). The console no
            // longer sends one, so a stamped value here is the api's own — and its absence would
            // mean the derivation never ran, which nothing else on this screen would show.
            expect(response.body.publishedAt, 'publishedAt is stamped server-side').to.be.a('string');
            expect(new Date(response.body.publishedAt).getTime()).to.be.greaterThan(Date.now() - 5 * 60 * 1000);
          });

          // Publishing alters no assignment. Counted before the click, or this compares the grid
          // with a tile computed from the same signals and would agree however both had moved.
          cy.get('.cell').filter('.cell--day, .cell--evening, .cell--night').should('have.length', workedBefore);
          cy.contains('.stat', 'Shifts this week').find('b').should('have.text', String(workedBefore));
        });
    });
  });
});
