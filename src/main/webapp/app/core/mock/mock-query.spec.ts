import { describe, expect, it } from 'vitest';
import { HttpParams } from '@angular/common/http';

import { applyFilters, applySort, buildLinkHeader, parseSort, queryCollection, valueAt } from './mock-query';

interface Row {
  id: number;
  name: string;
  rank: number | null;
  plan?: { id: number; name: string } | null;
}

const rows: Row[] = [
  { id: 1, name: 'Ama Boateng', rank: 3, plan: { id: 2, name: 'Bridge Plus' } },
  { id: 2, name: 'kwesi owusu', rank: 1, plan: { id: 1, name: 'Bridge Essential' } },
  { id: 3, name: 'Akosua Danso', rank: 2, plan: { id: 2, name: 'Bridge Plus' } },
  { id: 4, name: 'Yaw Antwi', rank: null, plan: null },
];

const params = (query: string): HttpParams => new HttpParams({ fromString: query });

describe('mock-query', () => {
  describe('valueAt', () => {
    it('should read a dotted path', () => {
      expect(valueAt(rows[0], 'plan.name')).toBe('Bridge Plus');
    });

    it('should return undefined rather than throw when the path runs off the object', () => {
      expect(valueAt(rows[3], 'plan.name')).toBeUndefined();
      expect(valueAt(rows[0], 'plan.name.nope')).toBeUndefined();
    });

    it("should resolve JHipster's <relationship>Id convention to <relationship>.id", () => {
      // The generated clients send `planId.equals=2`, never `plan.id.equals=2`.
      // Without this the filter matches nothing and the screen looks empty.
      expect(valueAt(rows[0], 'planId')).toBe(2);
      expect(valueAt(rows[3], 'planId')).toBeUndefined();
    });

    it('should prefer a real field over the relationship fallback', () => {
      expect(valueAt({ planId: 99, plan: { id: 2 } }, 'planId')).toBe(99);
    });
  });

  describe('parseSort', () => {
    it('should parse direction, defaulting to ascending', () => {
      expect(parseSort(params('sort=name,desc&sort=id'))).toEqual([
        { field: 'name', descending: true },
        { field: 'id', descending: false },
      ]);
    });

    it('should return no terms when sort is absent', () => {
      // HttpParams.getAll returns null, not [], for a missing parameter.
      expect(parseSort(params(''))).toEqual([]);
    });
  });

  describe('applySort', () => {
    it('should sort case-insensitively and numerically aware', () => {
      const sorted = applySort(rows, [{ field: 'name', descending: false }]);
      expect(sorted.map(row => row.id)).toEqual([3, 1, 2, 4]);
    });

    it('should sort nulls last in both directions', () => {
      expect(applySort(rows, [{ field: 'rank', descending: false }]).map(r => r.id)).toEqual([2, 3, 1, 4]);
      expect(applySort(rows, [{ field: 'rank', descending: true }]).map(r => r.id)).toEqual([1, 3, 2, 4]);
    });

    it('should use later terms only to break ties in earlier ones', () => {
      const sorted = applySort(rows, [
        { field: 'plan.name', descending: false },
        { field: 'name', descending: false },
      ]);
      // Bridge Essential first, then the two Bridge Plus rows by name, then null.
      expect(sorted.map(row => row.id)).toEqual([2, 3, 1, 4]);
    });

    it('should not mutate the source array', () => {
      const before = [...rows];
      applySort(rows, [{ field: 'name', descending: true }]);
      expect(rows).toEqual(before);
    });
  });

  describe('applyFilters', () => {
    it('should match .contains case-insensitively', () => {
      expect(applyFilters(rows, params('name.contains=aM')).map(r => r.id)).toEqual([1]);
    });

    it('should match .equals exactly', () => {
      expect(applyFilters(rows, params('rank.equals=2')).map(r => r.id)).toEqual([3]);
    });

    it('should OR within a repeated .in', () => {
      expect(applyFilters(rows, params('rank.in=1&rank.in=3')).map(r => r.id)).toEqual([1, 2]);
    });

    it('should AND across different fields', () => {
      expect(applyFilters(rows, params('planId.equals=2&name.contains=danso')).map(r => r.id)).toEqual([3]);
    });

    it('should treat .specified as a null check', () => {
      expect(applyFilters(rows, params('rank.specified=false')).map(r => r.id)).toEqual([4]);
      expect(applyFilters(rows, params('rank.specified=true')).map(r => r.id)).toEqual([1, 2, 3]);
    });

    it('should ignore page, size and sort rather than treating them as filters', () => {
      expect(applyFilters(rows, params('page=0&size=20&sort=name,asc')).length).toBe(rows.length);
    });

    it('should ignore an unimplemented operator instead of dropping every row', () => {
      // Returning a superset is the safe direction; silently returning nothing
      // is indistinguishable from an empty collection.
      expect(applyFilters(rows, params('name.soundsLike=ama')).length).toBe(rows.length);
    });

    it('should not collapse distinct objects to [object Object]', () => {
      // String({}) is "[object Object]" for every object, so a naive
      // implementation matches every relationship value against every other.
      expect(applyFilters(rows, params('plan.equals=%5Bobject+Object%5D')).length).toBe(0);
    });
  });

  describe('queryCollection', () => {
    it('should filter, then sort, then slice', () => {
      const result = queryCollection(rows, params('rank.specified=true&sort=rank,desc&page=0&size=2'));
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.rows.map(row => row.id)).toEqual([1, 3]);
    });

    it('should report the total across the whole filtered collection, not the page', () => {
      const result = queryCollection(rows, params('page=0&size=1'));
      expect(result.rows.length).toBe(1);
      expect(result.total).toBe(4);
    });

    it('should return an empty page past the end rather than clamping', () => {
      // Clamping would silently show page 1 to someone who asked for page 9,
      // which looks like data loss from the other direction.
      const result = queryCollection(rows, params('page=9&size=2'));
      expect(result.rows).toEqual([]);
      expect(result.total).toBe(4);
    });

    it('should default to a page size rather than returning everything', () => {
      expect(queryCollection(rows, params('')).size).toBeGreaterThan(0);
    });
  });

  describe('buildLinkHeader', () => {
    it('should omit prev on the first page and next on the last', () => {
      const first = buildLinkHeader('/api/patients', params('size=2'), queryCollection(rows, params('page=0&size=2')));
      expect(first).toContain('rel="next"');
      expect(first).not.toContain('rel="prev"');

      const last = buildLinkHeader('/api/patients', params('size=2'), queryCollection(rows, params('page=1&size=2')));
      expect(last).not.toContain('rel="next"');
      expect(last).toContain('rel="prev"');
    });

    it('should always offer first and last', () => {
      const link = buildLinkHeader('/api/patients', params('size=2'), queryCollection(rows, params('page=0&size=2')));
      expect(link).toContain('rel="first"');
      expect(link).toContain('rel="last"');
      expect(link).toContain('/api/patients?');
    });
  });
});
