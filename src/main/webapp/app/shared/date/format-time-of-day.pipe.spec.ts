import { describe, expect, it } from 'vitest';

import dayjs from 'dayjs/esm';

import FormatTimeOfDayPipe from './format-time-of-day.pipe';

describe('FormatTimeOfDayPipe', () => {
  const formatTimeOfDayPipe = new FormatTimeOfDayPipe();

  it('should return an empty string when receive undefined', () => {
    expect(formatTimeOfDayPipe.transform(undefined)).toBe('');
  });

  it('should return an empty string when receive null', () => {
    expect(formatTimeOfDayPipe.transform(null)).toBe('');
  });

  it('should format the clock time as HH:mm', () => {
    expect(formatTimeOfDayPipe.transform(dayjs('2026-08-05T08:12:33'))).toBe('08:12');
  });

  /** 24-hour, so 13:05 is not "1:05" beside a 01:05 that means something else. */
  it('should use the 24-hour clock', () => {
    expect(formatTimeOfDayPipe.transform(dayjs('2026-08-05T17:40:00'))).toBe('17:40');
  });
});
