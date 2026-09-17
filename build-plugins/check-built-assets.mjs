// Asserts what `ng build` copied into target/classes/static, and what it did not.
//
// WHY THIS EXISTS. `angular.json` listed `src/main/webapp/content` as a bare string asset, which the
// builder expands to `{ glob: '**/*', input: …, output: 'content' }` — the whole directory, `scss/`
// included. So every production build published `content/scss/*.scss`: the BridgeCare token
// definitions, the `_bootstrap-variables` overrides and every layout decision in
// `_console-admin.scss`, fetchable by anyone who guesses the path at admin.abofonsa.com. Backlog item
// 114, which measured eight `.scss` in the output; RULE 2 then found a NINTH published file that
// counting one extension could not see — see the note on `SPEC_SOURCE` below.
//
// Nothing broke, nothing was a credential, and that is exactly why it survived from the scaffold
// commit: NO CHECK IN THIS REPOSITORY LOOKED AT BUILT OUTPUT AT ALL. `branding.spec.ts` comes closest
// and reads `src/main/webapp/`, which is the source tree — so it could not have seen this, and the
// one-line `ignore` that fixes it would have been guarded by nothing. hc-vendor found the same defect
// in its own tree (their row 31), fixed it, and recorded that hc-admin's instance had no owner; this
// file is their `check-built-assets.mjs` reduced to the two rules item 114 needs.
//
// WHY NOT A VITEST SPEC, even though item 114 nominates `branding.spec.ts`. `npm test` never produces
// `target/classes/static` — `ng test` is the Vitest builder and builds no bundle — so a spec over that
// directory is green on a stale tree and red on a clean checkout, and in CI it is strictly worse than
// that: `ci.yml` runs `npm test` BEFORE `npm run webapp:build:prod`, so on the runner the directory is
// never there when the suite reads it. Such a spec would have to skip, and a skip is the vacuous pass
// this item exists to prevent. The guarded thing is build OUTPUT, so the check runs after a build.
//
// Nor is it an esbuild plugin beside `define-esbuild.ts` and `i18n-esbuild.ts`: assets are copied by
// the builder after the bundling pass, so a plugin hook is the wrong side of the event it observes.
//
// THE BOUNDS DO NOT MOVE WITH THE THING THEY GUARD. Neither rule reads `angular.json` — that would be
// the configuration checked against itself, which is the failure mode item 114 names in its own
// "done when": a glob that looks correct and a directory that ships anyway.
//
//   RULE 1 is `SASS_ARTEFACT` over the whole output tree — a literal pattern, read from nowhere.
//   RULE 2 derives its expected set from the SOURCE directory, so a glob narrowed too far fails
//          against the assets it stopped copying.
//
// RULE 2 IS NOT DECORATION, and it guards the direction RULE 1 cannot see. `ignore: ["scss/**"]` is
// one edit away from `ignore: ["**"]`, `["**/*"]` or a typo that matches more than it reads as: every
// one of those publishes no Sass and satisfies RULE 1 completely, while quietly dropping the icons,
// `loading.css` and the images. That failure is silent in the build — `ng build` exits 0 — and shows
// up as a console with no favicon and an unstyled splash, in production only. It is also what would
// have happened had item 114 been closed by enumerating `content/css` and `content/images` as
// separate asset entries instead: a future `content/fonts/` is then simply never copied.
//
// Not covered, deliberately: the hashed bundles. `main-*.js`, `styles-*.css` and the chunks are
// content digests whose names move with every code change, so asserting over them would be a
// byte-identity check wearing an inventory check's clothes.

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'target', 'classes', 'static');
const SOURCE_CONTENT = path.join(ROOT, 'src', 'main', 'webapp', 'content');

// ONE PATTERN, TWO USERS, AND THEY MUST MOVE TOGETHER. Rules 1 and 2 both ask "is this a Sass
// artefact?", and `angular.json`'s `ignore` glob asks a THIRD question — "is this under `scss/`?" —
// which is a different question with the same answer today, because every one of this repo's eight
// Sass files lives in `content/scss/`. That is the drift hazard, and it is mitigated rather than
// removed: because RULE 1 reads the OUTPUT, a `.scss` written anywhere else under `content/` ships
// and this rule catches it, loudly. The dangerous direction is closed; the remaining exposure is
// both sides being narrowed together.
//
// `.sass` and `.map` are in the pattern although nothing in the tree produces either today —
// `inlineStyleLanguage` is `scss`, there is no `.sass` file under `src/main/webapp`, and the
// production configuration sets `sourceMap: false` so no `.map` is emitted at all. The hole they
// close is what a hand-written file, a case-insensitive filesystem or a by-hand `sass --source-map`
// run would fall into. Case-insensitive for the same reason: hc-vendor's review defeated the first
// cut of their equivalent by planting a verbatim copy at `content/scss/PROBE.SCSS`, which shipped
// while the check printed zero and exited 0.
const SASS_ARTEFACT = /\.(scss|sass)(\.map)?$/i;

// AND THE LEAK WAS NINE FILES, NOT EIGHT — found by RULE 2 on its first green run, which is the
// argument for having written RULE 2 at all. `content/scss/global-styles.spec.ts` is a Vitest spec:
// it pins which of the two console stylesheets `.abf-form` and `.abf-steps` live in, and it sits
// beside the stylesheets it reads. The bare-string asset copied it with everything else, so every
// production build also published a TypeScript source at `/content/scss/global-styles.spec.ts`.
// Item 114 counted `.scss` and measured eight; nothing had ever listed the directory.
//
// It is excluded from RULE 2's expected set because a spec is NOT an asset — it must not ship, and
// the `ignore` glob correctly stops copying it. Without this the rule would demand the build publish
// its own test. The exclusion is narrow on purpose: `*.spec.ts` and nothing wider. `content/js/` holds
// `loading-error.js`, which IS a shipped asset and is loaded by `index.html`, so excluding "source
// files" by extension would quietly stop requiring the one script the splash depends on.
//
// A spec that ships anyway is still caught, by RULE 2's OTHER half: excluded from `expected` and
// present in the output, it lands in `unexpected`. So the pair refuses it in both directions.
const SPEC_SOURCE = /\.spec\.ts$/i;

/** Source files under `content/` that are deliberately not published. */
const notAnAsset = file => SASS_ARTEFACT.test(file) || SPEC_SOURCE.test(file);

/** Every file under `dir`, as paths relative to it, POSIX-separated, sorted. */
const filesUnder = dir => {
  const walk = (current, prefix) =>
    readdirSync(current, { withFileTypes: true }).flatMap(entry => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory() ? walk(path.join(current, entry.name), relative) : [relative];
    });
  return walk(dir, '').sort();
};

const exists = relative => {
  try {
    return statSync(path.join(OUTPUT, relative)).isFile();
  } catch {
    return false;
  }
};

const failures = [];
const fail = (rule, message) => failures.push(`${rule}: ${message}`);

// FAIL-CLOSED, and this is the line that stops the whole check passing vacuously. A guard over a
// directory that is not there has nothing to report and would otherwise exit 0 — which is precisely
// the shape of the defect being fixed, one level up.
if (!exists('index.html')) {
  console.error(`No build output at ${path.relative(ROOT, OUTPUT)} — run \`npm run webapp:prod\` first.`);
  process.exit(1);
}

const built = filesUnder(OUTPUT);

// RULE 1 — no Sass source is published. Item 114's deliverable, over the whole output tree rather
// than over `content/scss/` alone, so a second asset entry copying sources somewhere else fails too.
const published = built.filter(file => SASS_ARTEFACT.test(file));
if (published.length > 0) {
  fail('RULE 1', `${published.length} Sass artefact(s) published to the browser: ${published.join(', ')}`);
}

// RULE 2 — everything in `src/main/webapp/content` that is not a Sass artefact or a spec is
// published, and nothing under `content/` is published that has no source counterpart. The Sass half
// of the exclusion is the SAME pattern RULE 1 uses: narrow it alone and a variant the glob correctly
// refuses becomes a file this rule demands, so the pair cannot drift quietly.
const expected = filesUnder(SOURCE_CONTENT)
  .filter(file => !notAnAsset(file))
  .map(file => `content/${file}`);
const actual = built.filter(file => file.startsWith('content/'));

const missing = expected.filter(file => !actual.includes(file));
if (missing.length > 0) {
  fail('RULE 2', `${missing.length} source asset(s) not copied: ${missing.join(', ')}`);
}
const unexpected = actual.filter(file => !expected.includes(file));
if (unexpected.length > 0) {
  fail('RULE 2', `${unexpected.length} file(s) under content/ with no source counterpart: ${unexpected.join(', ')}`);
}

// The summary names the PATTERN rather than the word "Sass", so the line cannot claim more than the
// rule checks.
if (failures.length > 0) {
  console.error(`check-built-assets: FAILED over ${built.length} built file(s)\n  ${failures.join('\n  ')}`);
  process.exit(1);
}

console.log(
  `check-built-assets: ${built.length} built file(s), ` + `0 matching ${SASS_ARTEFACT}, ` + `${expected.length} content asset(s) published`,
);
