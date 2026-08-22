import { describe, expect, it } from 'vitest';

import RecordLabelPipe from './record-label.pipe';

/**
 * How a record is named when it is offered as a choice.
 *
 * <p>The generated pickers bound whatever field the generator reached for first, which was the
 * primary key more often than not: choosing a patient meant choosing between
 * `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` and eleven others. Both correct data and no answer at all
 * to "which person".
 *
 * <p>The ordering below is the whole of the pipe, so it is what is asserted — particularly the
 * fallbacks, because the failure they prevent is a picker of blank options, which looks like a
 * loading bug rather than a naming one.
 */
describe('abfRecordLabel', () => {
  const pipe = new RecordLabelPipe();

  it('names a person from the profile the record points at', () => {
    expect(pipe.transform({ id: 'p1', profile: { id: 'pr1', firstName: 'Efua', lastName: 'Mensah' } })).toBe('Efua Mensah');
  });

  it('names a profile from its own fields', () => {
    expect(pipe.transform({ id: 'pr1', firstName: 'Kwesi', lastName: 'Owusu' })).toBe('Kwesi Owusu');
  });

  /** A person outranks everything else: a Professional has both a name and a licence number. */
  it('prefers the person over the licence number', () => {
    expect(
      pipe.transform({ id: 'x', licenceNumber: 'NMC/RN/2019/4471', profile: { id: 'pr', firstName: 'Ama', lastName: 'Boateng' } }),
    ).toBe('Ama Boateng');
  });

  /** And falls back to it, because a clinician can exist before their profile does. */
  it('falls back to the licence number when there is no profile yet', () => {
    expect(pipe.transform({ id: 'x', licenceNumber: 'NMC/RN/2019/4471' })).toBe('NMC/RN/2019/4471');
  });

  it.each([
    [{ id: 'v1', name: 'GoldStar Pharmacy' }, 'GoldStar Pharmacy'],
    [{ id: 'w1', label: '2026-W34' }, '2026-W34'],
    [{ id: 'm1', subject: 'Home visit rescheduling request' }, 'Home visit rescheduling request'],
  ])('names %o by its own field', (record, expected) => {
    expect(pipe.transform(record)).toBe(expected);
  });

  it('builds a readable address from its parts', () => {
    expect(pipe.transform({ id: 'a1', streetAddress: '14 Ring Road East', cityState: 'Accra' })).toBe('14 Ring Road East, Accra');
  });

  it('uses the digital address when there is no street one', () => {
    expect(pipe.transform({ id: 'a2', digitalAddress: 'GA-183-4471' })).toBe('GA-183-4471');
  });

  /**
   * An empty string is not a name.
   *
   * <p>`??` would stop at one and render a blank option — the exact failure this replaces, arrived
   * at from the other direction.
   */
  it('skips empty fields rather than rendering a blank option', () => {
    expect(pipe.transform({ id: 'a3', name: '', label: '   ', subject: 'Fallback subject' })).toBe('Fallback subject');
  });

  /** The last resort is the id: an ugly option beats an invisible one. */
  it('falls back to the id when the record has no readable field', () => {
    expect(pipe.transform({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  });

  it.each([null, undefined])('renders nothing for %s', record => {
    expect(pipe.transform(record)).toBe('');
  });
});
