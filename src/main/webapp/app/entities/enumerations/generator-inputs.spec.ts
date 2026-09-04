import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `hc-admin.jdl` and `.jhipster/*.json` declare exactly the values the enums in this folder have.
 *
 * <p><b>This is the file that would have caught the 2026-09-04 superset-enum change.</b> Three
 * generator inputs were left on the four-value `ShiftType` — `hc-admin.jdl`,
 * `.jhipster/ShiftAssignment.json` and (in `api/`) the `WageRate` entity — and nothing in either
 * repository read either kind of file, so the whole set was green.
 *
 * <p><b>The `app/` half is the dangerous one, which is why this exists as well as the Java test.</b>
 * These are generator inputs, not documentation: `jhipster entity ShiftAssignment` emits
 * `shift-type.model.ts` *and* `i18n/en/operations-shiftType.json` from the same `fieldValues`
 * string. Both come back at four values **together**, so `enum-coverage.spec.ts` beside this file
 * still passes — the dictionary and the enum agree perfectly, at the wrong set — and
 * `enum-labels.spec.ts` never asks the enums anything. The only thing that would have complained is
 * a `tsc` error on `ShiftType.FLEXIBLE` in `console/wage-rates/wage-rates.ts`, which is one screen's
 * accident rather than a check.
 *
 * <p><b>Nothing here is a list of names.</b> The enums are found by reading the folder, the
 * generator inputs by walking `.jhipster` and the JDL, and the pairing by the type name the input
 * declares. Adding a value to an enum a generator input names fails this test until the input is
 * updated, and a whole new enum-typed field is covered on the day it is generated with nobody
 * having edited this file. The estate's own lesson: `PaginationIT` named twenty-three paths and
 * eight endpoints went unpaginated behind it.
 *
 * <p><b>Order is part of the contract</b>, not only membership — the generator emits the constants
 * in the order the input lists them, so a set comparison would pass on an input that regenerates a
 * differently-ordered enum, and `SHIFT_CYCLE` reads that order.
 *
 * <p><b>Enums no generator input names are not covered, and that is stated rather than implied.</b>
 * `FacilityType` has a model here and appears in no `.jhipster` file and in no JDL enum
 * declaration, because the console shows no `Facility` screen — nothing regenerates it, so it has
 * no input to drift from. The same honesty applies to fields: this checks enum *values*, not that
 * an entity's field list is complete. The field-level guard is `api/`'s `JdlEntityFieldsTest`,
 * where a domain class exists to reflect on; `WageRate` has no `.jhipster` file and no JDL entity
 * on this side at all.
 */
describe('generator inputs', () => {
  const ENUMS = 'src/main/webapp/app/entities/enumerations';
  const DEFINITIONS = '.jhipster';
  const JDL = 'hc-admin.jdl';

  /** Block and line comments removed, so a commented-out declaration is not read as one. */
  const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

  const split = (values: string): string[] =>
    values
      .split(',')
      .map(value => value.trim())
      .filter(value => value.length > 0);

  /**
   * Every `export enum` in this folder, name to values in declaration order.
   *
   * <p>Read off disk and parsed rather than imported, for the same reason `branding.spec.ts` reads
   * its files: an import list is a hand-maintained enumeration of what is covered, and this file's
   * whole subject is inputs that fall behind one. The generated shape is fixed —
   * `export enum X {` then `KEY = 'KEY',` — so a parser is enough.
   */
  const enums = (): Record<string, string[]> => {
    const found: Record<string, string[]> = {};
    for (const file of readdirSync(ENUMS).filter(name => name.endsWith('.model.ts'))) {
      const source = stripComments(readFileSync(`${ENUMS}/${file}`, 'utf8'));
      const declaration = /export enum (\w+) \{([^}]*)\}/.exec(source);
      if (declaration) {
        found[declaration[1]] = [...declaration[2].matchAll(/(\w+)\s*=/g)].map(match => match[1]);
      }
    }
    return found;
  };

  /** One enum declaration in a generator input: where it is, what it names, and what it says. */
  interface Declaration {
    where: string;
    type: string;
    values: string[];
  }

  const fromDefinitions = (): Declaration[] =>
    readdirSync(DEFINITIONS)
      .filter(name => name.endsWith('.json'))
      .flatMap(name => {
        const entity = JSON.parse(readFileSync(`${DEFINITIONS}/${name}`, 'utf8')) as {
          fields?: { fieldName: string; fieldType: string; fieldValues?: string }[];
        };
        return (entity.fields ?? [])
          .filter(field => field.fieldValues !== undefined)
          .map(field => ({
            where: `${DEFINITIONS}/${name} field '${field.fieldName}'`,
            type: field.fieldType,
            values: split(field.fieldValues!),
          }));
      });

  const fromJdl = (): Declaration[] =>
    [...stripComments(readFileSync(JDL, 'utf8')).matchAll(/\benum\s+(\w+)\s*\{([^}]*)\}/g)].map(match => ({
      where: `${JDL} enum ${match[1]}`,
      type: match[1],
      values: split(match[2]),
    }));

  const declarations = [...fromDefinitions(), ...fromJdl()];
  const models = enums();

  it('finds enums and generator inputs to check', () => {
    // A sweep that silently matches nothing passes forever. Floors, not totals: exact counts would
    // be the hand-maintained list this file exists to avoid.
    expect(Object.keys(models).length).toBeGreaterThan(10);
    expect(fromDefinitions().length).toBeGreaterThan(10);
    expect(fromJdl().length).toBeGreaterThan(10);
  });

  it.each(declarations.map((declaration): [string, Declaration] => [declaration.where, declaration]))(
    '%s declares exactly the values of the enum it names',
    (_where, declaration) => {
      // Named rather than counted, so the failure says which input to edit and to what. A missing
      // model is reported as such: an input naming a type this folder has no enum for regenerates
      // one, which is a different fix from a value list that has fallen behind.
      expect(models[declaration.type], `${declaration.where} names ${declaration.type}, which is no enum in ${ENUMS}`).toBeDefined();
      expect(declaration.values).toEqual(models[declaration.type]);
    },
  );
});
