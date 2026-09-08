import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * **No screen in this console names a record by a fragment of its id.**
 *
 * Backlog item 45 was a patient directory row reading `68b4f2a19c3d5e7f81a02c44` under an avatar
 * chip reading `68`. It is not a hash and nothing was corrupt: `Patient.profile` was absent, every
 * binding was `patient.profile?.…`, and the fallback was total. An operator reported it from
 * production as a broken record, which is the correct reading of what was on the screen.
 *
 * The fix removed it from the patient list and the patient record — **and it was still in the
 * professional list, the professional record and the vendor record**, which the review of that fix
 * found. Two component-level absence assertions could not have caught that, because they assert
 * about the two components they are in. This is the generalisation: one rule, over every screen that
 * could carry the defect, so the next screen is covered on the commit that creates it rather than on
 * the commit that notices.
 *
 * It is the same argument `PaginationIT` makes on the api and for the same reason —
 * **a test whose coverage has to be extended by hand silently stops covering things** — and the same
 * argument as `LogPseudonymTest`'s discovered file set. Do not replace the walk with a list.
 *
 * ## What it forbids, and what it deliberately does not
 *
 * Only an `id` cut into text. It says nothing about `displayName` falling back to a whole id — the
 * professional list does, behind a required licence number, and a licence number is a readable
 * identifier in a licence directory. The defect is specifically *taking a fragment of an opaque
 * identifier and presenting it as somebody's initials*, which no amount of context makes legible.
 *
 * ## Why that exclusion was not widened when it was questioned, 2026-09-08
 *
 * Backlog item 49 proposed exactly that widening — fail on a bare `?? x.id` in any display path —
 * against the two sites it read as defects, `patient/list`'s `clinicalLead` and `professional/list`'s
 * `displayName`. **Neither is reachable, and the exclusion above is why.** Fourteen expressions had
 * this shape when that was checked, and at thirteen of them the candidate in front of `?? x.id` is
 * required on the api: `licenceNumber` is `@NotNull` on `Professional`, and `name` is `@NotNull` on
 * `Vendor`, `Hub`, `Team`, `ServicePlan`, `Angel`, `Document` and `Facility`. Nothing can strip one
 * either, because `DatabaseConfiguration` registers a `ValidatingMongoEventListener`, so every
 * `save` — the REST surface, the seed initializer, any service — validates. `patient.clinicalLead`
 * is a second lock on the same door: it is a `@DBRef` to a `Professional` **document**, a clinician
 * known only from a domain event has no such document by design, and a dangling `@DBRef` reads
 * back as `null` rather than as a stub, so the row shows the established `—`.
 *
 * So widening it would have gone red on thirteen lines that cannot render an id, and the fix for
 * each would have been to remove a fallback nothing reaches. **A rule that fires only where it
 * cannot matter teaches that the rule is noise**, which is how the next real one gets silenced.
 *
 * **That argument alone does not settle it, and on its own it invites "then delete the thirteen
 * lines".** What settles it is the other half, which is that the proposed rule is badly *under*-
 * inclusive as well: `?? x.id` is one of several ways to put a whole id on a screen and not the
 * commonest. Measured on 2026-09-08, **56 templates under `src/main/webapp/app` carry a bare
 * `{{ x.id }}` interpolation** (68 occurrences), twelve of them in ten files inside the two roots
 * this sweep already walks — and at least five are a record named by nothing but its id, including
 * `entities/directory/profile/detail/profile-detail.html:74`,
 * `<a [routerLink]="['/address', …]">{{ profileRef.address?.id }}</a>`, where an Address's entire
 * identity as rendered is its ObjectId. Every one of them is invisible to any `?? .id` regex.
 *
 * So the rule item 49 asked for would have fired on thirteen dead lines and missed a live one four
 * directories away. **A rule that fires on dead lines and misses live ones is not the class of rule
 * the item asked for**, whatever is done about the false positives, and that is why the answer is
 * not "narrow it until the noise stops". Those five are not fixed here and are not this branch's
 * scope; they are named so that the next reader starts from the real shape of the problem.
 *
 * The discriminator is not syntactic and cannot be swept from here: it is whether the candidate
 * before the fallback is required, and that lives in another repository's Java. The fourteenth site,
 * the one where it was **not** — `professional-detail.html`'s heading, `fullName() ??
 * professionalRef.id`, where `Professional.profile` is an optional `@DBRef` — was found by reading
 * the api rather than by any sweep, and was fixed on 2026-09-08 rather than excused. Do not take
 * the count above as current; count it if you need it, the way `PaginationIT` refuses to state one.
 * It is worth knowing how it hid: item 45's
 * review changed the monogram beside that heading to an em dash and asserted `fullName()` is null
 * for a profile-less clinician, and the heading two lines below went on printing the ObjectId. The
 * assertion was about the component; the defect was in what the template did with a correct `null`.
 * `professional-detail.spec.ts` reads that heading out of the DOM now, for that reason.
 */
describe('directory records are never named by a fragment of their id', () => {
  /** Every screen that draws a record header or a directory row, walked rather than listed. */
  const ROOTS = ['src/main/webapp/app/entities/directory', 'src/main/webapp/app/console'];

  /**
   * `something.id` — or `id ?? '?'` — run through `.slice(...)`, which is the shape of all four
   * sites this rule was written for. Anchored on the property rather than on a variable name, so
   * renaming `professional` to `record` does not slip past it.
   */
  const ID_SLICE = /\bid\b[^;\n]{0,20}\)?\s*\.slice\s*\(/;

  const walk = (dir: string, found: string[] = []): string[] => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path, found);
      } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.html')) && !entry.name.endsWith('.spec.ts')) {
        found.push(path);
      }
    }
    return found;
  };

  const sources = ROOTS.flatMap(root => walk(root));

  /**
   * The discovery can fail as quietly as the rule can. A moved folder or a tightened extension
   * filter would leave this passing over nothing at all, so the walk is pinned against the files the
   * rule exists for before anything is asserted about their contents.
   *
   * **Templates are pinned as well as components**, since 2026-09-08. Every path here was a `.ts`,
   * so dropping `.html` from the filter above — the likeliest way to tighten it — would have left
   * this case green over half the screen. That is not hypothetical on this rule: the one live
   * id-as-a-name this sweep did not catch was an interpolation in `professional-detail.html`, and
   * a rendering defect lives in the template more often than in the class.
   *
   * `arrayContaining` is a floor, so an unpinned file is walked rather than skipped and nothing
   * here is a defect on its own. The two list templates were pinned on 2026-09-08 anyway:
   * `professional/list/professional.html` is the screen backlog item 49 reported, so a reader
   * checking whether the sweep covers what the item named should find it stated rather than have to
   * derive it from the walk, and `vendor/list/vendor.html` is its sibling under the same rule.
   */
  it('finds the screens it is meant to be sweeping', () => {
    expect(sources).toEqual(
      expect.arrayContaining([
        join('src/main/webapp/app/entities/directory/patient/list', 'patient.ts'),
        join('src/main/webapp/app/entities/directory/patient/list', 'patient.html'),
        join('src/main/webapp/app/entities/directory/patient/detail', 'patient-detail.ts'),
        join('src/main/webapp/app/entities/directory/patient/detail', 'patient-detail.html'),
        join('src/main/webapp/app/entities/directory/professional/list', 'professional.ts'),
        join('src/main/webapp/app/entities/directory/professional/list', 'professional.html'),
        join('src/main/webapp/app/entities/directory/professional/detail', 'professional-detail.ts'),
        join('src/main/webapp/app/entities/directory/professional/detail', 'professional-detail.html'),
        join('src/main/webapp/app/entities/directory/vendor/list', 'vendor.html'),
        join('src/main/webapp/app/entities/directory/vendor/detail', 'vendor-detail.ts'),
        join('src/main/webapp/app/entities/directory/vendor/detail', 'vendor-detail.html'),
        join('src/main/webapp/app/console/dashboard', 'dashboard.ts'),
      ]),
    );
  });

  it('slices no record id into initials, anywhere', () => {
    const offenders = sources
      .map(path => ({ path, text: readFileSync(path, 'utf8') }))
      .flatMap(({ path, text }) =>
        text
          .split('\n')
          .map((line, index) => ({ path, line: line.trim(), number: index + 1 }))
          // Comments are where this rule is explained, in five files. Reading them as violations
          // would make the explanation the thing that fails.
          .filter(({ line }) => !line.startsWith('*') && !line.startsWith('//') && !line.startsWith('<!--'))
          .filter(({ line }) => ID_SLICE.test(line)),
      )
      .map(offender => `${offender.path}:${offender.number}  ${offender.line}`);

    expect(
      offenders,
      'a record id sliced into text is backlog item 45: two hex characters of a Mongo ObjectId ' +
        'presented as somebody\'s initials. Return "—" instead — a chip is a monogram or it is nothing.',
    ).toEqual([]);
  });
});
