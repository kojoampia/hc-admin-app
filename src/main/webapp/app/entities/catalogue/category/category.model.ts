export interface ICategory {
  id: string;
  name?: string | null;
  description?: string | null;
  iconKey?: string | null;
}

export type NewCategory = Omit<ICategory, 'id'> & { id: null };

/**
 * One category's activity tally, from `GET /api/categories/summary`.
 *
 * Counted on the activity side rather than by resolving `Category.activities`, which is a DBRef set
 * — a page of categories carries references, not totals, and resolving them to count them would
 * fetch the whole catalogue to display six numbers.
 *
 * `live` is carried beside `activities` because the screen's job is controlling what is live: a card
 * reading "Equipment · 3" when only one activity can be booked overstates the catalogue.
 */
export interface ICategoryActivityCount {
  categoryId: string;
  activities: number;
  live: number;
}

export interface ICategorySummary {
  categories: ICategoryActivityCount[];
}
