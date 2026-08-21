import { Pipe, PipeTransform } from '@angular/core';

import dayjs from 'dayjs/esm';

/**
 * The clock time alone, for a list already showing the date.
 *
 * `formatMediumDatetime` renders `5 Aug 2026 08:12:00` — the whole stamp on one line, seconds
 * included. On a desk sorted by arrival the discriminator between two messages on one day is the
 * time, and the date beside it is the same word repeated down the column, so the two are rendered
 * as two lines rather than one long one. Seconds are dropped: nothing here is ordered by them, and
 * they read as precision the desk does not have.
 */
@Pipe({
  name: 'formatTimeOfDay',
})
export default class FormatTimeOfDayPipe implements PipeTransform {
  transform(day: dayjs.Dayjs | null | undefined): string {
    return day ? day.format('HH:mm') : '';
  }
}
