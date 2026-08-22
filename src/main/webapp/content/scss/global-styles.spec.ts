import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Which stylesheet a shared class has to live in, and why getting it wrong is invisible.
 *
 * <p>`global.scss` imports `_console-admin.scss` and nothing else from this folder.
 * `_console-components.scss` is imported **per component**, because Angular scopes a component's
 * styles and that import is the only way its classes reach that template.
 *
 * <p>So a class used by a screen whose component has no stylesheet of its own — every generated
 * create/edit form — must be in the global file. Putting it in the other one compiles, lints,
 * type-checks, passes every test and ships a form that renders as an unstyled column of full-width
 * inputs. That is exactly what happened to the form restyle, and it reached the quality stack before
 * anybody saw it.
 */
describe('global stylesheet', () => {
  const read = (name: string): string => readFileSync(`src/main/webapp/content/scss/${name}`, 'utf8');

  const globalScss = read('global.scss');
  const consoleAdmin = read('_console-admin.scss');
  const consoleComponents = read('_console-components.scss');

  /** The premise the rest of this file rests on. */
  it('reaches _console-admin and not _console-components', () => {
    expect(globalScss).toContain("@import 'console-admin'");
    expect(globalScss).not.toContain("@import 'console-components'");
  });

  /**
   * The generated update components declare no `styleUrl`, so anything they use has to be global.
   */
  it.each(['.abf-form'])('defines %s globally', selector => {
    expect(consoleAdmin).toContain(selector);
    expect(consoleComponents).not.toContain(selector);
  });

  /**
   * The form idiom re-states the card and section head inside `.abf-form` rather than reusing the
   * component-scoped ones. If that scoping is ever removed, the duplication should go with it —
   * this pins the reason it exists.
   */
  it('carries the card and section head the forms depend on', () => {
    const form = consoleAdmin.slice(consoleAdmin.indexOf('.abf-form {'));
    expect(form).toContain('.sec-head');
    expect(form).toContain('.card-pad');
  });
});
