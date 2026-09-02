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
  const authPage = read('_auth-page.scss');

  /** The premise the rest of this file rests on. */
  it('reaches _console-admin and not _console-components', () => {
    expect(globalScss).toContain("@import 'console-admin'");
    expect(globalScss).not.toContain("@import 'console-components'");
  });

  /**
   * `_auth-page.scss` is the third file and follows the same rule as `_console-components.scss`: it
   * is imported per component, by `login.scss` and by the two password-reset screens. It holds the
   * full-bleed two-panel layout those three share, which was `login.scss`'s alone until the reset
   * screens were built on 2026-09-02.
   *
   * <p>Going global would be the more obvious mistake here rather than the less: `.field` and
   * `.auth-card` are generic enough to collide with a console screen, and `.auth`'s `min-height:
   * 100vh` inside the shell would push every page to full height.
   */
  it('imports _auth-page per component and not globally', () => {
    expect(globalScss).not.toContain("@import 'auth-page'");

    for (const stylesheet of [
      'src/main/webapp/app/login/login.scss',
      'src/main/webapp/app/account/reset/request/password-reset-request.scss',
      'src/main/webapp/app/account/reset/finish/password-reset-finish.scss',
    ]) {
      expect(readFileSync(stylesheet, 'utf8')).toContain("@import 'auth-page'");
    }

    // And the layout lives there rather than in either console file, so a restyle of one auth page
    // is a restyle of all three.
    expect(authPage).toContain('.auth-card');
    expect(consoleAdmin).not.toContain('.auth-card');
    expect(consoleComponents).not.toContain('.auth-card');
  });

  /**
   * The generated update components declare no `styleUrl`, so anything they use has to be global.
   */
  it.each(['.abf-form', '.abf-steps'])('defines %s globally', selector => {
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
