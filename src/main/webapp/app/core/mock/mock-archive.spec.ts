import { HttpParams } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { buildDatabase } from './mock-db';
import { queryCollection } from './mock-query';

/**
 * The archive filter, end to end through the query layer the list components use.
 *
 * The component specs assert which parameters get sent; this asserts that those
 * parameters actually partition the collection. Both halves matter: a filter
 * that sends the right query and matches nothing looks identical to an empty
 * directory.
 */
const q = (fromString: string): HttpParams => new HttpParams({ fromString });

describe('archive filtering', () => {
  for (const collection of ['patients', 'professionals', 'vendors']) {
    describe(collection, () => {
      it('splits into two non-empty halves that sum to the whole collection', () => {
        const rows = buildDatabase()[collection];
        const active = queryCollection(rows, q('isArchived.notEquals=true&size=1000'));
        const archived = queryCollection(rows, q('isArchived.equals=true&size=1000'));

        expect(archived.total).toBeGreaterThan(0);
        expect(active.total).toBeGreaterThan(0);
        expect(active.total + archived.total).toBe(rows.length);
      });

      it('never shows the same record in both halves', () => {
        const rows = buildDatabase()[collection];
        const ids = (result: { rows: unknown[] }): unknown[] => result.rows.map(row => (row as { id: unknown }).id);
        const active = ids(queryCollection(rows, q('isArchived.notEquals=true&size=1000')));
        const archived = ids(queryCollection(rows, q('isArchived.equals=true&size=1000')));

        expect(active.filter(id => archived.includes(id))).toEqual([]);
      });
    });
  }

  /**
   * Why the active list uses notEquals rather than equals=false.
   *
   * A record stored before isArchived existed carries no value at all, and
   * `.equals=false` compares against the empty string, so it matches nothing.
   * Using it would empty the directory on the day this shipped.
   */
  it('treats a record with no isArchived at all as active', () => {
    const legacy = [{ id: 'written-before-the-field-existed' }];

    expect(queryCollection(legacy, q('isArchived.notEquals=true')).total).toBe(1);
    expect(queryCollection(legacy, q('isArchived.equals=false')).total).toBe(0);
  });
});
