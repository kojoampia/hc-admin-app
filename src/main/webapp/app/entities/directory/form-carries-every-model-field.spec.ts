import { existsSync, readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * **Every field on a directory entity's model is carried by that entity's edit form — backlog item
 * 139, generalising the guard item 135 built for `patient` alone.**
 *
 * Every directory entity's update screen saves with a `PUT`, and each resource persists the
 * deserialised body: no DTO, no merge against the stored document. So for these entities **a field in
 * the model and not in the form is a field an edit destroys**. It has happened four times:
 * `Patient.accountId` (item 115, loud — `@NotNull`, so the omission was a 400), `Patient.isArchived`
 * (item 135, silent), and then `Professional.isArchived` and `Vendor.isArchived` (item 139, silent,
 * found by asking item 135's question of the neighbours rather than by an incident).
 *
 * ## Why it is derived rather than three copies of itself
 *
 * Item 135's version named `Patient` in every case, so the two live instances one directory over went
 * on shipping while its own entity was green — and its own class comment asked for this file:
 * _"write the equivalent beside each, or generalise deliberately under that item."_ This walks the
 * entity folders on disk, so **a seventh directory entity is covered on the commit that creates it**
 * rather than on the commit that notices. Nothing here names an entity except the fail-closed floor
 * below, and that floor names **all six** that have an edit form today rather than only the three
 * whose loss item 139 measured — see `ENTITY_FOLDERS_WITH_AN_EDIT_FORM` for why. Naming only some of
 * them would let one of the rest leave the sweep in silence, which is this item's own defect class
 * reappearing inside the guard written for it.
 *
 * ⚠ **`import.meta.glob` was tried first and is NOT usable here — measured, not assumed.** An eager
 * glob over `./&#42;/update/&#42;-form.service.ts` returned all six entities when the spec was run alone and
 * **zero** in the full suite, from a byte-identical 6.08 kB chunk, so the difference is at runtime
 * rather than at build time under the `@angular/build:unit-test` builder. A discovery mechanism whose
 * answer depends on which other specs are running cannot gate anything. It failed **loudly** only
 * because of the fail-closed floor below; with a bare comparison it would have reported a clean sweep
 * over nothing. Do not reintroduce it.
 *
 * ⚠ **Scope is `entities/directory/` only, and that is a decision with a measurement behind it.**
 * Sweeping all of `entities/` on 2026-09-25 found two further gaps — `message` (6 fields:
 * `toAddress`, `recipientName`, `parentId`, `vendorId`, `patientId`, `professionalId`) and
 * `roster-week` (`publishedAt`) — **neither of which has been qualified**. Widening the walk today
 * would mean seven allowlist entries whose reasons nobody has established, and an allowlist that only
 * silences the sweep is worse than no sweep: it converts an open question into a recorded decision
 * that was never taken. Those two are filed for qualification. Widen `ENTITIES_ROOT` in the change
 * that answers them, not before.
 *
 * ## ⚠ What this guard asks, and the three things it does not
 *
 * It asks whether a **control is declared**, by reading each form service's `<Entity>FormGroupContent`
 * type. That is one step removed from "the control is constructed", and the step is closed by the
 * compiler rather than here: `new FormGroup<&lt;Entity&gt;FormGroupContent>({…})` requires the object
 * literal to supply every key of that type and permits no extra, so the type and the constructed
 * controls cannot differ without `npx ng build` failing. The link is asserted rather than assumed —
 * each file is checked to really construct its group from the type this file parsed.
 *
 * It does not ask whether the field is **sent**. That additionally requires each `get<Entity>` to stay
 * `form.getRawValue()`, and changing one to `form.value` would drop every disabled control while every
 * case here stayed green. The round trip is asserted on the wire, per entity, in `patient/`,
 * `professional/` and `vendor/`'s `archived-survives-an-edit.spec.ts`.
 *
 * And it is **blind, by construction, to a field that leaves BOTH sides at once** — a reachable state
 * rather than a theoretical one: each `<entity>.model.ts` and `update/<entity>-form.service.ts` are
 * both generated from `hc-admin.jdl` and `.jhipster/<Entity>.json`, so a field missing from those
 * regenerates out of the model and the form together and every case here stays green. `isArchived` was
 * in neither generator input for any of the three entities until items 135 and 139 added it. **The
 * guard for that case is not this file** — it is the per-entity specs named above, which name the
 * field explicitly and are therefore not satisfied by its disappearance. A field worth allowing for
 * here is worth naming in a spec of its own for exactly this reason.
 *
 * ## Why it reads source rather than a type or an object
 *
 * Property names are erased at runtime, so there is nothing to ask the framework for: a TypeScript
 * interface has no reflective form. The alternative on the form side — instantiating each service
 * through `TestBed` — needs a derived way to reach the classes, and the only one available is the
 * glob ruled out above.
 *
 * ⚠ **A parse that silently finds nothing is a guard that silently passes**, and a derived sweep has
 * that hazard multiplied by the number of entities: a walk that finds none reports nothing missing
 * across nothing. Hence the fail-closed case below, which must be the first one to go red, and the
 * parsers that throw rather than return an empty list.
 */
describe('Directory edit forms carry every model field', () => {
  const ENTITIES_ROOT = 'src/main/webapp/app/entities/directory';

  /**
   * Every directory folder that has an edit form today — a **floor**, not the sweep's input.
   *
   * ⚠ **This list does not decide what is swept.** The sweep walks `ENTITIES_ROOT` on disk, so a new
   * entity is covered on the commit that creates it without touching this file — which is the whole
   * point of item 139. What this list does is make the sweep's *shrinking* loud: each name is asserted
   * to still be found, so a folder that loses its form service to a rename, a move or a deletion turns
   * this file red instead of quietly dropping out of a walk that still reports a clean sweep.
   *
   * **Adding an entity needs no edit here; removing one needs a deliberate edit here.** That asymmetry
   * is the design. Do not replace it with a count — `>= 6` goes green when one folder leaves and
   * another arrives in the same change, which is precisely the case a count cannot see.
   *
   * `directory-link` is absent because it is read-only and has no `update/` at all.
   */
  const ENTITY_FOLDERS_WITH_AN_EDIT_FORM: readonly string[] = ['address', 'angel', 'patient', 'professional', 'profile', 'vendor'];

  /**
   * Fields deliberately in a model and not on that entity's form, with the reason for each.
   *
   * **An entry here is a written decision that a `PUT` may destroy that field**, so it needs a reason
   * that is true — and note that "the screen does not show it" is *not* such a reason: `id`,
   * `accountId` and `isArchived` are all carried disabled and shown nowhere. An allowlist that only
   * silences the sweep is worse than no sweep.
   *
   * ⚠ An entry is asserted to still be **needed**, not merely to name a real field: adding the control
   * turns the allowlist case red and asks for the entry to be deleted. A stale exemption silently
   * covers whatever field later takes the name.
   */
  const DELIBERATELY_NOT_ON_THE_FORM: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    vendor: {
      documents:
        'A `@DBRef` set the console never writes. It arrives nested on `GET /api/vendors/{id}` and is ' +
        'owned by `Document`, whose `vendor` back-reference `Vendor.setDocuments` rewrites. ⚠ The loss is ' +
        'REAL — `VendorResource.updateVendor` restores nothing from the stored document, so a console ' +
        'edit does overwrite the stored set — but a hidden control is the wrong remedy: round-tripping a ' +
        'whole nested collection through a form is a far larger stale write than the one it prevents. ' +
        'The right shape is the restore-from-stored rule `ProfessionalResource` already applies to ' +
        '`homeSpaceId` and `unavailabilityPeriods`, and it lives in the api repo. Qualified and filed ' +
        'under item 139 rather than closed here.',
      facilities:
        'Same shape and same reason as `documents` above — a `@DBRef` set, owned elsewhere, never ' +
        'written from this console, and wanting a server-side restore rather than a hidden control. ' +
        'Qualified and filed under item 139.',
    },
  };

  /** `directory-link` → `DirectoryLink`. */
  const pascalCase = (folder: string): string =>
    folder
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

  /** The generator's path for an entity's form service — `vendor` → `vendor/update/vendor-form.service.ts`. */
  const formServicePath = (folder: string): string => `${ENTITIES_ROOT}/${folder}/update/${folder}-form.service.ts`;

  /**
   * The entity folders, taken from the form services that exist on disk rather than from a list.
   *
   * A folder with no `update/<folder>-form.service.ts` has no edit form and nothing to compare —
   * `directory-link` is read-only and is absent for that reason, not by exclusion.
   */
  const entityFolders = (): string[] =>
    readdirSync(ENTITIES_ROOT, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(folder => existsSync(formServicePath(folder)))
      .sort();

  /** The property names declared on `I<Entity>`, read from the source that declares them. */
  const declaredOnTheModel = (folder: string): string[] => {
    const path = `${ENTITIES_ROOT}/${folder}/${folder}.model.ts`;
    if (!existsSync(path)) {
      // Not `[]`: an entity with a form service and no model beside it is a broken assumption in this
      // guard, and returning nothing would report it as a clean sweep.
      throw new Error(`no model file at ${path} for entity folder ${folder}`);
    }
    const source = readFileSync(path, 'utf8');
    const opening = source.indexOf(`export interface I${pascalCase(folder)} {`);
    if (opening === -1) {
      throw new Error(`no "export interface I${pascalCase(folder)} {" in ${path}`);
    }
    // The interface ends at the first brace in column zero after it — the files are Prettier-formatted,
    // so a nested closing brace is always indented.
    const closing = source.indexOf('\n}', opening);
    const body = source.slice(opening, closing === -1 ? undefined : closing);

    // Comments first: these interfaces' jsdoc quotes field names and contains colons, so a property
    // pattern run over the raw text would invent fields out of prose.
    const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    return [...withoutComments.matchAll(/^\s+(\w+)\??\s*:/gm)].map(match => match[1]);
  };

  /**
   * The controls the entity's form group declares, read from its `<Entity>FormGroupContent` type.
   *
   * The last check in here is the bridge the class comment promises: the type parsed is asserted to be
   * the one the group is really constructed from. Without it this would be a guard over a type that
   * might name nothing — which is the same failure as a parse returning `[]`, one level up.
   */
  const controlsOnTheForm = (folder: string): string[] => {
    const path = formServicePath(folder);
    const source = readFileSync(path, 'utf8');
    const typeName = `${pascalCase(folder)}FormGroupContent`;

    const opening = source.indexOf(`type ${typeName} = {`);
    if (opening === -1) {
      throw new Error(`no "type ${typeName} = {" in ${path}`);
    }
    const closing = source.indexOf('\n};', opening);
    const body = source.slice(opening, closing === -1 ? undefined : closing);
    const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const controls = [...withoutComments.matchAll(/^\s+(\w+)\??\s*:/gm)].map(match => match[1]);

    if (!source.includes(`new FormGroup<${typeName}>(`)) {
      throw new Error(`${path} does not construct its group as new FormGroup<${typeName}>(…), so this type governs nothing`);
    }

    return controls;
  };

  const allowedFor = (folder: string): string[] => Object.keys(DELIBERATELY_NOT_ON_THE_FORM[folder] ?? {});

  it('walks the entity folders at all — the positive control this guard is worthless without', () => {
    const folders = entityFolders();

    // ⚠ Every folder that has an edit form today is named, and the asymmetry is the whole design:
    // **adding an entity requires no edit here and removing one requires a deliberate edit here.**
    // The sweep's input is the disk, not this list — a seventh entity is covered by the walk on the
    // commit that creates it, which is what item 139 asked for. This list is only a floor, and it has
    // to name all six rather than the three whose loss item 139 measured: a floor of ">= 5 including
    // patient, professional and vendor" lets `address`, `angel` or `profile` lose its form service to
    // a rename or a move while the sweep stays green over one fewer entity. That is silent shrinkage
    // — the exact class this whole item is about, and the class the rejected glob demonstrated. It is
    // not hypothetical for `angel` in particular: the mutation that proved this guard derives at all
    // was a field planted on `IAngel`, reported as `angel.riskTier`.
    //
    // So a folder leaving this list is a line somebody deletes on purpose, with the reason in the
    // commit — not a number that quietly stops matching.
    for (const folder of ENTITY_FOLDERS_WITH_AN_EDIT_FORM) {
      expect(folders, `${folder} has lost its edit form or its folder, and the sweep would not have said so`).toContain(folder);
    }
    // Derived from the list above rather than written again, so the two cannot drift apart. A floor
    // rather than an equality: an equality fails on every legitimate new entity, which is the opposite
    // of the intent.
    expect(folders.length).toBeGreaterThanOrEqual(ENTITY_FOLDERS_WITH_AN_EDIT_FORM.length);

    // And every one of them must parse into something plausible on both sides. Without this, a model
    // or a form type renamed past the parse contributes an empty list and passes the sweep vacuously.
    for (const folder of folders) {
      const declared = declaredOnTheModel(folder);
      expect(declared, `parsed no fields from ${folder}.model.ts`).toContain('id');
      expect(declared.length, `implausibly few fields parsed from ${folder}.model.ts`).toBeGreaterThanOrEqual(3);

      const controls = controlsOnTheForm(folder);
      expect(controls, `parsed no controls from ${folder}-form.service.ts`).toContain('id');
      expect(controls.length, `implausibly few controls parsed from ${folder}-form.service.ts`).toBeGreaterThanOrEqual(3);
    }
  });

  it('declares a control for every field each model declares', () => {
    const folders = entityFolders();
    // Fail closed: do not report a clean sweep over nothing.
    expect(folders.length).toBeGreaterThanOrEqual(ENTITY_FOLDERS_WITH_AN_EDIT_FORM.length);

    const missing = folders.flatMap(folder => {
      const controls = controlsOnTheForm(folder);
      const allowed = allowedFor(folder);
      return declaredOnTheModel(folder)
        .filter(field => !controls.includes(field) && !allowed.includes(field))
        .map(field => `${folder}.${field}`);
    });

    // Named in the message because the failure this guard exists to produce is read by someone who has
    // just added a field and does not yet know that `PUT` makes it load-bearing.
    expect(missing, `in a directory model and not on its edit form, so a PUT would destroy it: ${missing.join(', ')}`).toEqual([]);
  });

  it('keeps the allowlist honest — every exemption names a real field that is still absent', () => {
    const folders = entityFolders();
    expect(folders.length).toBeGreaterThanOrEqual(ENTITY_FOLDERS_WITH_AN_EDIT_FORM.length);

    const stale = Object.entries(DELIBERATELY_NOT_ON_THE_FORM).flatMap(([folder, fields]) => {
      if (!folders.includes(folder)) {
        return [`${folder} (no such entity folder)`];
      }
      const declared = declaredOnTheModel(folder);
      const controls = controlsOnTheForm(folder);
      return Object.keys(fields)
        .filter(field => !declared.includes(field) || controls.includes(field))
        .map(field => `${folder}.${field}`);
    });

    // Two ways to be stale and both are silent. A name no model carries reads as a decision somebody
    // took about a field that no longer exists, and it silently covers whatever field later takes that
    // name. An exemption whose control now exists is a decision that has been reversed in code and not
    // in the list — harmless today, and the reason the next reader believes a false claim.
    expect(stale, `allowlist entries that are no longer true: ${stale.join(', ')}`).toEqual([]);

    // Every reason is written and non-trivial. A blank or placeholder reason is how an allowlist stops
    // being a record of decisions and becomes a way to make this file green.
    for (const [folder, fields] of Object.entries(DELIBERATELY_NOT_ON_THE_FORM)) {
      for (const [field, reason] of Object.entries(fields)) {
        expect(reason.length, `${folder}.${field} has no real reason recorded`).toBeGreaterThan(40);
      }
    }
  });

  it('declares no control for a field a model does not have', () => {
    // The mirror of the sweep above, and cheap. A control with no model field behind it puts a key in
    // the `PUT` body that the server deserialises into nothing — harmless today, but it is also the
    // signature of a field that was *renamed* on the model and not on the form, which the sweep above
    // reports as a missing field and this one localises to the stale name.
    const folders = entityFolders();
    expect(folders.length).toBeGreaterThanOrEqual(ENTITY_FOLDERS_WITH_AN_EDIT_FORM.length);

    const orphaned = folders.flatMap(folder => {
      const declared = declaredOnTheModel(folder);
      return controlsOnTheForm(folder)
        .filter(control => !declared.includes(control))
        .map(control => `${folder}.${control}`);
    });

    expect(orphaned, `on an edit form and not on the model behind it: ${orphaned.join(', ')}`).toEqual([]);
  });
});
