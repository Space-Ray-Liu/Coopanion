/** A restored Core session must receive the connected figure's current capabilities. */
import { expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Core } from 'cortico/core/core.ts';
import { CORE_DEFAULTS } from 'cortico/core/config.ts';
import type { CoreConfig } from 'cortico/core/types.ts';
import { unknownMeters, type ResponseClient } from 'cortico/core/generation.ts';
import { SessionLog } from 'cortico/core/session.ts';
import { createResponse, type Request } from 'cortico/protocol/open-responses/index.ts';
import { itemText, message } from 'cortico/protocol/open-responses/context.ts';
import { Cormini } from '../vendor/cortico/bots/cormini/persona/persona.ts';
import { DesktopPetWorld } from '../packages/cortico-world-desktop-pet/src/world.ts';
import { DESKTOP_PET_DEFAULTS } from '../packages/cortico-world-desktop-pet/src/config.ts';
import { FakePage } from '../packages/cortico-world-desktop-pet/tests/helpers/page.ts';

it('delivers current figure capabilities to a restored conversation before the next request', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pet-context-')), dataDir = join(dir, 'data');
  const previous = new SessionLog(dataDir);
  const oldPrefix = 'Fixture: the prior body walks and runs along the screen.';
  previous.append(message('system', oldPrefix));
  previous.append(message('assistant', 'I cannot teleport; I can run.'));
  const cfg: CoreConfig = {
    ...structuredClone(CORE_DEFAULTS),
    activeProvider: 'fixture',
    providers: { fixture: { kind: 'openai-responses-compat', baseUrl: 'https://model.test', spec: { model: 'test-model', thinking: false } } },
    batching: { quietGapMs: 20, minBatchAgeMs: 0, maxBatchAgeMs: 100, maxBatchSize: 100 },
  };
  const petCfg = structuredClone(DESKTOP_PET_DEFAULTS);
  petCfg.port = 0;petCfg.window.enabled = false;petCfg.asr.enabled = false;petCfg.skin.figure = 'holoface';
  petCfg.asr.mic.mode = 'always';
  const world = new DesktopPetWorld({ cfg: petCfg, timezone: 'UTC', persist: () => {}, runtimesRoot: () => join(dir, 'runtimes'), modelsDir: () => join(dir, 'models') });
  const requests: Request[] = [];
  const llm: ResponseClient = {
    async respond(request) {
      requests.push(structuredClone(request));
      const response = createResponse(`fixture-${requests.length}`, request);response.status = 'completed';
      if (requests.length === 1) {
        expect(JSON.stringify(request.input)).toContain('| teleport |');
        response.output = [{ type: 'function_call', id: 'fixture-call', call_id: 'teleport-call', name: 'pet_act', arguments: '{"actions":["teleport"]}', status: 'completed' }];
      }
      const origin = { instance: 'fixture', module: 'fixture', model: 'test-model', compatibilityDomain: 'fixture' };
      return { response, origin, attempts: [{
        id: `attempt-${requests.length}`, generationId: response.id, ordinal: 0, origin,
        startedAt: new Date().toISOString(), elapsedMs: 0, requestId: null, responseId: response.id,
        outcome: 'completed', status: 200, serviceTier: null, meters: unknownMeters(), charges: [],
      }] };
    },
  };
  const worlds = [world], memoryDir = join(dir, 'workspace');
  const core = new Core({ config: cfg, rootDir: dir, dataDir, memoryDir, secret: () => 'fixture' }, { worlds, persona: new Cormini({ memoryDir, worlds }), llm });
  core.bus.setPaused(true);
  let page: FakePage | undefined;
  try {
    await core.start();
    await expect.poll(() => core.loop.getToolSchemas().some(t => t.name === 'pet_act')).toBe(true);
    expect(itemText(core.session.records[0]!.item)).toBe(oldPrefix);
    page = await FakePage.open(world.petUrl.replace(/\/pet$/, ''));
    page.send({ t: 'figure', id: 'holoface', ok: true, words: world.packs().find(p => p.id === 'holoface')!.manifest.vocab.map(w => w.id) });
    await expect.poll(() => core.store.range({ source: 'desktop-pet' }).some(e => e.type === 'desktop-pet.figure' && e.text.includes('| teleport |'))).toBe(true);
    expect(requests).toHaveLength(0);
    page.send({ t: 'text', text: '瞬移一下给我看看' });
    await expect.poll(() => core.store.range({ source: 'desktop-pet' }).some(e => e.type === 'desktop-pet.message')).toBe(true);
    core.bus.setPaused(false);
    expect((await page.next(m => m.t === 'act')).actions).toEqual(['teleport']);
    await expect.poll(() => requests.length).toBeGreaterThanOrEqual(2);
    const first = JSON.stringify(requests[0]!.input);
    expect(first.indexOf('| teleport |')).toBeLessThan(first.lastIndexOf('瞬移一下给我看看'));
    expect(itemText(core.session.records[0]!.item)).toBe(oldPrefix);
    expect(core.session.records.some(r => itemText(r.item) === 'I cannot teleport; I can run.')).toBe(true);
  } finally {
    await page?.close();await core.stop();rmSync(dir, { recursive: true, force: true });
  }
});
