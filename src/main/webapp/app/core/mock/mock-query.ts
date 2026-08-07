import { HttpParams } from '@angular/common/http';

/**
 * The query contract JHipster's generated services actually send.
 *
 * Getting this right is the whole reason no generated `*.service.ts` or
 * `*-list.component.ts` needed editing: they build these parameters, read
 * `X-Total-Count` and `Link` back, and neither knows nor cares that the
 * answer came from memory.
 *
 * Supported:
 *   page=<0-based>  size=<n>
 *   sort=<field>,<asc|desc>            repeatable, applied left to right
 *   <field>.contains=<substring>       case-insensitive
 *   <field>.equals=<value>
 *   <field>.in=<value>                 repeatable, OR within one field
 *   <field>.specified=<true|false>
 *   <field>.greaterThan / .lessThan    numbers and ISO dates
 */

export const DEFAULT_PAGE_SIZE = 20;

export interface PageResult<T> {
  /** The rows for the requested page. */
  readonly rows: T[];
  /** Rows matching the filter across the whole collection, before paging. */
  readonly total: number;
  /** 0-based. */
  readonly page: number;
  readonly size: number;
  readonly totalPages: number;
}

type Comparable = string | number | boolean | null | undefined;

/**
 * A comparison-safe string for an arbitrary value.
 *
 * `String(someObject)` yields "[object Object]", which sorts and matches
 * every object identically — silently, and only for the relationship fields
 * where it matters most. Anything without a usable primitive form is treated
 * as having no value instead.
 */
const stringify = (value: unknown): string => {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'object') {
    // dayjs and Date answer valueOf() with an epoch number; anything whose
    // valueOf is still an object has no comparable form.
    const primitive: unknown = (value as { valueOf(): unknown }).valueOf();
    return primitive === value ? '' : stringify(primitive);
  }
  return '';
};

const walk = (row: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => {
    if (value == null || typeof value !== 'object') {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, row);

/**
 * Reach into a row by dotted path, so `plan.name` sorts and filters.
 *
 * Also honours JHipster's relationship-filter convention: the generated
 * clients send `weekId.equals=1`, not `week.id.equals=1`, so a `<name>Id`
 * field that does not exist literally falls back to `<name>.id`. Without
 * this every relationship filter silently matches nothing — which reads as
 * "there is no data" rather than "the filter was not understood".
 */
export const valueAt = (row: unknown, path: string): unknown => {
  const direct = walk(row, path);
  if (direct !== undefined) {
    return direct;
  }
  const relationship = /^(.*)Id$/.exec(path);
  return relationship ? walk(row, `${relationship[1]}.id`) : undefined;
};

const asComparable = (value: unknown): Comparable => {
  if (value == null) {
    return value;
  }
  if (typeof value === 'object') {
    // dayjs and Date both answer valueOf() with an epoch number.
    const primitive: unknown = (value as { valueOf(): unknown }).valueOf();
    return typeof primitive === 'object' ? stringify(value) : (primitive as Comparable);
  }
  return value as Comparable;
};

const compare = (a: unknown, b: unknown): number => {
  const left = asComparable(a);
  const right = asComparable(b);

  // Nulls sort last regardless of direction, so an empty cell never
  // displaces a real value at the top of a column.
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }
  return String(left).localeCompare(String(right), 'en', { numeric: true, sensitivity: 'base' });
};

export interface SortTerm {
  readonly field: string;
  readonly descending: boolean;
}

/** `sort=lastName,asc` → `{ field: 'lastName', descending: false }`. */
export const parseSort = (params: HttpParams): SortTerm[] => {
  // getAll returns null, not [], when the parameter is absent.
  const terms = params.getAll('sort') ?? [];
  return terms.filter(Boolean).map(term => {
    const [field, direction] = term.split(',');
    return { field, descending: (direction || 'asc').toLowerCase() === 'desc' };
  });
};

/**
 * Sort by every term, left to right. Later terms only break ties in earlier
 * ones — a single pass with a chained comparator, not repeated sorts.
 */
export const applySort = <T>(rows: readonly T[], terms: readonly SortTerm[]): T[] => {
  if (terms.length === 0) {
    return [...rows];
  }
  return [...rows].sort((a, b) => {
    for (const term of terms) {
      const left = valueAt(a, term.field);
      const right = valueAt(b, term.field);

      // Nulls sort last in BOTH directions, so this is decided before the
      // descending flip. Letting `compare`'s null result be negated would put
      // every empty cell at the top of a descending column — the one place
      // they are most conspicuous and least useful.
      const leftIsNull = left == null;
      const rightIsNull = right == null;
      if (leftIsNull !== rightIsNull) {
        return leftIsNull ? 1 : -1;
      }
      if (leftIsNull) {
        continue;
      }

      const result = compare(left, right);
      if (result !== 0) {
        return term.descending ? -result : result;
      }
    }
    return 0;
  });
};

const RESERVED = new Set(['page', 'size', 'sort', 'abfLatency', 'cacheBuster']);

/**
 * Apply every `field.operator=value` parameter. All of them must match — the
 * filters are ANDed across fields, ORed within a repeated `.in`.
 */
export const applyFilters = <T>(rows: readonly T[], params: HttpParams): T[] => {
  const predicates: ((row: T) => boolean)[] = [];

  for (const key of params.keys()) {
    if (RESERVED.has(key)) {
      continue;
    }
    const separator = key.lastIndexOf('.');
    if (separator < 0) {
      continue;
    }
    const field = key.slice(0, separator);
    const operator = key.slice(separator + 1);
    const values = params.getAll(key) ?? [];
    if (values.length === 0) {
      continue;
    }

    switch (operator) {
      case 'contains':
        predicates.push(row => {
          const actual = valueAt(row, field);
          return actual != null && stringify(actual).toLowerCase().includes(values[0].toLowerCase());
        });
        break;
      case 'doesNotContain':
        predicates.push(row => {
          const actual = valueAt(row, field);
          return actual == null || !stringify(actual).toLowerCase().includes(values[0].toLowerCase());
        });
        break;
      case 'equals':
        predicates.push(row => stringify(valueAt(row, field)) === values[0]);
        break;
      case 'notEquals':
        predicates.push(row => stringify(valueAt(row, field)) !== values[0]);
        break;
      case 'in':
        predicates.push(row => values.includes(stringify(valueAt(row, field))));
        break;
      case 'notIn':
        predicates.push(row => !values.includes(stringify(valueAt(row, field))));
        break;
      case 'specified': {
        const wanted = values[0] === 'true';
        predicates.push(row => (valueAt(row, field) != null) === wanted);
        break;
      }
      case 'greaterThan':
        predicates.push(row => compare(valueAt(row, field), values[0]) > 0);
        break;
      case 'greaterThanOrEqual':
        predicates.push(row => compare(valueAt(row, field), values[0]) >= 0);
        break;
      case 'lessThan':
        predicates.push(row => compare(valueAt(row, field), values[0]) < 0);
        break;
      case 'lessThanOrEqual':
        predicates.push(row => compare(valueAt(row, field), values[0]) <= 0);
        break;
      default:
        // An operator we do not implement must not silently drop every row.
        // Ignoring it returns a superset, which is the safe direction.
        break;
    }
  }

  return predicates.length === 0 ? [...rows] : rows.filter(row => predicates.every(predicate => predicate(row)));
};

/**
 * Filter, then sort, then slice. Order matters: sorting before filtering
 * would still be correct but wastes work, and paging before either would
 * return the wrong rows entirely.
 */
export const queryCollection = <T>(rows: readonly T[], params: HttpParams): PageResult<T> => {
  const filtered = applyFilters(rows, params);
  const sorted = applySort(filtered, parseSort(params));

  const size = Math.max(1, Number(params.get('size') ?? DEFAULT_PAGE_SIZE));
  const requestedPage = Number(params.get('page') ?? 0);
  const totalPages = Math.max(1, Math.ceil(sorted.length / size));

  // A page past the end returns empty rather than clamping: clamping would
  // quietly show page 1 to someone who asked for page 9 and looks like data
  // loss in the other direction.
  const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
  const start = page * size;

  return {
    rows: sorted.slice(start, start + size),
    total: sorted.length,
    page,
    size,
    totalPages,
  };
};

/**
 * The RFC 5988 `Link` header JHipster's `PaginationUtil` emits and its
 * clients parse. Only the relations that exist are included — no `next` on
 * the last page, no `prev` on the first.
 */
export const buildLinkHeader = (url: string, params: HttpParams, result: PageResult<unknown>): string => {
  const linkTo = (page: number): string => {
    const withPage = params.set('page', String(page)).set('size', String(result.size));
    return `<${url}?${withPage.toString()}>`;
  };

  const links: string[] = [];
  const lastPage = result.totalPages - 1;

  if (result.page < lastPage) {
    links.push(`${linkTo(result.page + 1)}; rel="next"`);
  }
  if (result.page > 0) {
    links.push(`${linkTo(result.page - 1)}; rel="prev"`);
  }
  links.push(`${linkTo(lastPage)}; rel="last"`);
  links.push(`${linkTo(0)}; rel="first"`);

  return links.join(',');
};
