import { Pipe, PipeTransform } from '@angular/core';

/** The shapes a record can carry a readable name in, in the order they are preferred. */
interface Labelled {
  id?: string | null;
  name?: string | null;
  label?: string | null;
  subject?: string | null;
  licenceNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  streetAddress?: string | null;
  cityState?: string | null;
  digitalAddress?: string | null;
  profile?: Labelled | null;
}

/**
 * How the console names one record when it is offered as a choice.
 *
 * <p>The generated relationship pickers bind whatever field the generator reached for first, which
 * is the primary key more often than not: choosing a patient meant choosing between
 * `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` and eleven others, and choosing a clinician meant reading
 * licence numbers. Both are correct data and neither is an answer to "which person".
 *
 * <p>One pipe rather than a per-entity expression in each template, for the same reason the back
 * link lives in one place: there are twenty-one of these pickers today, a newly generated entity
 * arrives with more, and a rule applied by hand is a rule that stops being applied.
 *
 * <p>It falls back rather than blanking. A professional with no profile yet still shows their
 * licence number, and anything with no readable field at all still shows its id — a picker with
 * empty options is worse than one with ugly ones.
 */
@Pipe({
  name: 'abfRecordLabel',
})
export default class RecordLabelPipe implements PipeTransform {
  transform(record: Labelled | null | undefined): string {
    if (!record) {
      return '';
    }

    // A person is named on their Profile, not on the Patient or Professional that points at it.
    const person = fullName(record.profile) || fullName(record);
    if (person) {
      return person;
    }

    // `??` is wrong here: a record can carry an empty string, and an empty option is exactly what
    // this pipe exists to prevent. The first non-empty candidate wins.
    const candidates = [
      record.name,
      record.label,
      record.subject,
      [record.streetAddress, record.cityState].filter(Boolean).join(', '),
      record.digitalAddress,
      record.licenceNumber,
      record.id,
    ];
    return candidates.find(candidate => Boolean(candidate?.trim())) ?? '';
  }
}

function fullName(record: Labelled | null | undefined): string {
  return [record?.firstName, record?.lastName].filter(Boolean).join(' ').trim();
}
