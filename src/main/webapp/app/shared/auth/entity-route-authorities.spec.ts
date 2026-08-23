import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Authority } from 'app/shared/jhipster/constants';

import { ENTITY_READ_AUTHORITIES, ENTITY_WRITE_AUTHORITIES } from './entity-route-authorities';

/**
 * That the console's route guards say the same thing the api enforces.
 *
 * <p>The api gives `ROLE_OPERATOR` `GET` across the entity surface and nothing else. The console did
 * not mirror it at all until 2026-08-23 — `web/` had, and `app/` was generated afterwards without it
 * — so an operator could open a create form, fill it in, and learn on save that the server refuses.
 *
 * <p>This reads the route files rather than the router, because the failure it guards against is a
 * newly generated entity arriving with no `authorities` at all. A test that asked the router would
 * only ever see the routes somebody remembered to register.
 */
describe('entity route authorities', () => {
  const root = 'src/main/webapp/app/entities';

  const routeFiles = readdirSync(root, { withFileTypes: true })
    .filter(group => group.isDirectory())
    .flatMap(group =>
      readdirSync(join(root, group.name), { withFileTypes: true })
        .filter(entity => entity.isDirectory())
        .map(entity => ({ name: `${group.name}/${entity.name}`, path: join(root, group.name, entity.name) })),
    )
    .map(entity => {
      const file = readdirSync(entity.path).find(name => name.endsWith('.routes.ts'));
      return file ? { ...entity, source: readFileSync(join(entity.path, file), 'utf8') } : null;
    })
    .filter((entity): entity is { name: string; path: string; source: string } => entity !== null);

  /** `credential` is the deliberate exception — the caller's own account, from the gateway. */
  const guarded = routeFiles.filter(entity => !entity.name.endsWith('/credential'));

  it('found the entity route files', () => {
    expect(routeFiles.length).toBeGreaterThan(20);
  });

  /** The split itself: operators read, admins write. */
  it('lets an operator read and only an admin write', () => {
    expect(ENTITY_READ_AUTHORITIES).toEqual([Authority.ADMIN, Authority.OPERATOR]);
    expect(ENTITY_WRITE_AUTHORITIES).toEqual([Authority.ADMIN]);
  });

  it.each(guarded.map(entity => entity.name))('%s guards every one of its routes', name => {
    const { source } = guarded.find(entity => entity.name === name)!;
    const routes = (source.match(/path: '/g) ?? []).length;
    const guards = (source.match(/authorities: ENTITY_(READ|WRITE)_AUTHORITIES/g) ?? []).length;

    expect(guards).toBe(routes);
  });

  /**
   * The direction matters as much as the presence.
   *
   * <p>A create form guarded by the read list would be exactly the bug this replaces, and it would
   * still look guarded to anyone skimming the file.
   */
  it.each(guarded.map(entity => entity.name))('%s writes are admin-only', name => {
    const { source } = guarded.find(entity => entity.name === name)!;
    const blocks = source.split(/\{\s*\n\s*path: /).slice(1);

    blocks.forEach(block => {
      const isWrite = block.startsWith("'new'") || block.includes(":id/edit'");
      if (isWrite) {
        expect(block).toContain('ENTITY_WRITE_AUTHORITIES');
      }
    });
  });

  /**
   * And the exception is an exception, not an omission.
   *
   * <p>Asserted on `authorities:` rather than on the constant's name, because the file explains
   * itself by naming the constant it does not use — the first version of this test failed on its
   * own documentation.
   */
  it('leaves the caller their own account', () => {
    const credential = routeFiles.find(entity => entity.name.endsWith('/credential'));

    expect(credential?.source).not.toContain('authorities:');
    expect(credential?.source).toContain('deliberately');
  });
});
