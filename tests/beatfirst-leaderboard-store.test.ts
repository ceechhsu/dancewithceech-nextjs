import test from 'node:test'
import { execFileSync } from 'node:child_process'

async function checkStore(code: string) {
  execFileSync(process.execPath, ['--conditions=react-server', '--import', 'tsx', '--input-type=module', '--eval', `
    import assert from 'node:assert/strict';
    import { createClient } from '@supabase/supabase-js';
    import storeModule from './src/lib/beatfirst-leaderboard-store.ts';
    import serviceModule from './src/lib/beatfirst-leaderboard-service.ts';
    const { createLeaderboardStore } = storeModule;
    const { LeaderboardNameConflict } = serviceModule;
    const client = (fetch) => createClient('https://database.example.test', 'test-service-role', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch },
    });
    ${code}
  `], { cwd: new URL('..', import.meta.url), stdio: 'pipe' })
}

test('the adapter calls the ranking RPC for a single requested level and maps internal rows', async () => {
  await checkStore(`
    let requests = 0;
    const store = createLeaderboardStore(client(async (input, init) => {
      requests++;
      assert.equal(new URL(String(input)).pathname, '/rest/v1/rpc/beatfirst_level_top_ten');
      assert.equal(init.method, 'POST');
      assert.deepEqual(JSON.parse(init.body), { p_level_id: 18 });
      return Response.json([{ user_id: 'google:owner', display_name: 'Dancer', score: 90, rank: 1 }]);
    }));
    assert.deepEqual(await store.top(18), [{ userId: 'google:owner', displayName: 'Dancer', score: 90, rank: 1 }]);
    assert.equal(requests, 1);
  `)
})

test('the adapter selects only profile fields for the exact verified owner and supports no profile', async () => {
  await checkStore(`
    let found = true;
    const store = createLeaderboardStore(client(async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/rest/v1/beatfirst_leaderboard_profiles');
      assert.equal(url.searchParams.get('user_id'), 'eq.google:owner');
      assert.equal(url.searchParams.get('select'), 'display_name,listed');
      return Response.json(found ? [{ display_name: 'Dancer', listed: false }] : []);
    }));
    assert.deepEqual(await store.profile('google:owner'), { displayName: 'Dancer', listed: false });
    found = false;
    assert.equal(await store.profile('google:owner'), null);
  `)
})

test('the adapter upserts only an owned public profile and returns its selected public fields', async () => {
  await checkStore(`
    let requests = 0;
    const store = createLeaderboardStore(client(async (input, init) => {
      requests++;
      const url = new URL(String(input));
      assert.equal(url.pathname, '/rest/v1/beatfirst_leaderboard_profiles');
      assert.equal(url.searchParams.get('on_conflict'), 'user_id');
      assert.equal(url.searchParams.get('select'), 'display_name,listed');
      assert.match(new Headers(init.headers).get('prefer'), /resolution=merge-duplicates/);
      assert.deepEqual(JSON.parse(init.body), { user_id: 'google:owner', display_name: 'Chosen Name', listed: true });
      return Response.json({ display_name: 'Chosen Name', listed: true });
    }));
    assert.deepEqual(await store.saveProfile('google:owner', { displayName: 'Chosen Name', listed: true }), { displayName: 'Chosen Name', listed: true });
    assert.equal(requests, 1);
  `)
})

test('the adapter recognizes unique-name conflicts and hides every other database failure', async () => {
  await checkStore(`
    let code = '23505';
    const store = createLeaderboardStore(client(async () => Response.json({ code, message: 'SECRET_DATABASE_DETAIL' }, { status: 409 })));
    await assert.rejects(store.saveProfile('google:owner', { displayName: 'Taken', listed: true }), LeaderboardNameConflict);
    code = 'XX000';
    for (const operation of [() => store.top(1), () => store.profile('google:owner'), () => store.saveProfile('google:owner', { displayName: 'Name', listed: false })]) {
      await assert.rejects(operation(), (error) => error instanceof Error && !error.message.includes('SECRET'));
    }
  `)
})

test('an unexpected RPC response fails safely instead of being treated as ranking rows', async () => {
  await checkStore(`
    const store = createLeaderboardStore(client(async () => Response.json({ unexpected: 'object' })));
    await assert.rejects(store.top(1), /leaderboard could not be loaded/);
  `)
})
