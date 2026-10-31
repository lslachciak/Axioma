const test = require('node:test');
const assert = require('node:assert/strict');
const interventions = require('../context_intervention.js');
const pvq = require('../pvq_data.js');
const psych = require('../psychometrics.js');
const { EvaluatorEngine } = require('../execution_engine.js');
const { getItemResponseDetails } = require('../response_view.js');

function config(condition = 'prefix', count = 19) {
  return {
    mode: 'sequential', keepContext: true, randomizeOrder: false, lang: 'en', model: 'target',
    intervention: { condition, experimentId: 'experiment-1', label: 'Pilot',
      source: { runId: 'donor-1', config: { lang: 'en', model: 'donor', randomizeOrder: true }, itemOrder: [...interventions.FIXED_ORDER].reverse() },
      entries: Array.from({ length: count }, (_, i) => ({ itemId: i + 1, rating: 6, originalRating: 6 })) }
  };
}

function client(requests, text = '2') {
  return { completeChat: async (options, messages) => {
    requests.push(JSON.parse(JSON.stringify(messages)));
    return { text, reasoning: '', actualModel: 'target-resolved', tokenUsage: { promptTokens: 3, completionTokens: 1, reasoningTokens: 0 } };
  } };
}

test('prefix creates 38 requests with exact supplied history and no donor scores or usage', async () => {
  const requests = [];
  const events = [];
  const cfg = config();
  const before = JSON.stringify(cfg);
  const result = await new EvaluatorEngine(cfg, pvq, psych, client(requests)).run(event => events.push(event));
  assert.equal(requests.length, 38);
  assert.equal(requests[0].length, 39);
  for (let i = 0; i < 19; i++) {
    assert.match(requests[0][i * 2].content, new RegExp(`^Item ${i + 1}:`));
    assert.deepEqual(requests[0][i * 2 + 1], { role: 'assistant', content: '6' });
  }
  assert.match(requests[0].at(-1).content, /^Item 20:/);
  assert.match(requests.at(-1).at(-1).content, /^Item 57:/);
  assert.equal(result.apiExchanges.length, 38);
  assert.equal(result.tokenUsage.completionTokens, 38);
  assert.equal(result.tokenUsage.promptTokens, 114);
  assert.equal(result.psychometrics.totalAnswered, 38);
  assert.equal(result.psychometrics.itemRatings[1], null);
  assert.equal(result.psychometrics.itemRatings[20], 2);
  assert.equal(result.psychometrics.mrat, null);
  assert.ok(Object.values(result.psychometrics.refinedValues).every(value => value.rawMean === null && value.centeredMean === null));
  assert.equal(result.rawResponses[1], undefined);
  assert.equal(result.itemProvenance[1].origin, 'donor');
  assert.equal(result.itemProvenance[20].origin, 'target');
  assert.deepEqual(result.metadata.itemOrder, interventions.FIXED_ORDER);
  assert.deepEqual(result.experiment.source.itemOrder, [...interventions.FIXED_ORDER].reverse());
  assert.equal(events[0].type, 'prefix_loaded');
  assert.equal(events[0].completedCount, 19);
  assert.equal(JSON.stringify(cfg), before);
});

test('history replacement retains actual responses and numerical scoring, changes only later history', async () => {
  const cfg = config('replacement', 1);
  cfg.intervention.entries[0].itemId = 6;
  const requests = [];
  const result = await new EvaluatorEngine(cfg, pvq, psych, client(requests)).run();
  assert.equal(requests.length, 57);
  assert.equal(requests[5].filter(message => message.role === 'assistant').length, 5);
  assert.equal(requests[6][11].content, '6');
  assert.equal(result.rawResponses[6], '2');
  assert.equal(result.psychometrics.itemRatings[6], 2);
  assert.equal(result.psychometrics.mrat, 2);
  assert.ok(Object.values(result.psychometrics.refinedValues).every(value => value.rawMean === 2 && value.centeredMean === 0));
  assert.equal(result.itemProvenance[6].historyResponse, '6');
  assert.equal(result.itemProvenance[6].actualResponse, '2');
  assert.equal(getItemResponseDetails(result, 6).provenance.historySource, 'manual');
  assert.equal(result.apiExchanges[5].response, '2');
});

test('invalid intervention configurations fail before any request', async () => {
  const mutations = [
    c => { c.mode = 'batch'; }, c => { c.keepContext = false; }, c => { c.randomizeOrder = true; },
    c => { c.intervention.entries[0].rating = null; }, c => { c.intervention.entries[0].rating = 0; },
    c => { c.intervention.entries[0].rating = 7; }, c => { c.intervention.entries[0].rating = 2.5; },
    c => { c.intervention.entries[0].itemId = 2; }, c => { c.intervention.entries[0].itemId = 57; },
    c => { c.intervention.entries = []; }, c => { c.intervention.source = null; },
    c => { c.intervention.source.config.lang = 'pl'; }, c => { delete c.intervention.source.config.lang; },
    c => { c.intervention.entries[0].itemId = 30; }, c => { c.intervention.condition = 'unknown'; }
  ];
  for (const mutate of mutations) {
    const cfg = config(); mutate(cfg);
    const requests = [];
    const engine = new EvaluatorEngine(cfg, pvq, psych, client(requests));
    await assert.rejects(engine.run());
    assert.equal(requests.length, 0);
    assert.equal(engine.isRunning, false);
  }
});

test('source snapshot allowlists metadata, and legacy order stays unknown', () => {
  const source = { metadata: { config: { lang: 'en', provider: 'openai', unknownSetting: 'excluded' } } };
  const snapshot = interventions.sourceSnapshot(source);
  assert.deepEqual(snapshot.config, { provider: 'openai', lang: 'en' });
  assert.equal(snapshot.itemOrder, null);
  assert.equal(snapshot.runId, null);
  source.metadata.config.lang = 'pl';
  assert.equal(snapshot.config.lang, 'en');
});

test('donor profile snapshot survives validation and remains independent of the donor run', async () => {
  const donor = { metadata: { runId: 'donor-profile', config: { lang: 'en', model: 'donor' } },
    psychometrics: psych.calculatePsychometrics(Object.fromEntries(interventions.FIXED_ORDER.map(id => [id, 4])), pvq) };
  const cfg = config();
  cfg.intervention.source = interventions.sourceSnapshot(donor);
  const engine = new EvaluatorEngine(cfg, pvq, psych, client([]));
  donor.psychometrics.refinedValues.SDT.rawMean = 1;
  donor.psychometrics.itemRatings[1] = 1;
  const result = await engine.run();
  assert.equal(result.experiment.source.profile.refinedValues.SDT.rawMean, 4);
  assert.equal(result.experiment.source.profile.itemRatings[1], 4);
  assert.equal(result.experiment.source.profile.mrat, 4);
  assert.equal(result.experiment.source.profile.refinedValues.SDT.centeredMean, 0);
});

test('donor previews retain missing metrics without deriving partial means', () => {
  const profile = psych.calculatePsychometrics({ 1: 4 }, pvq);
  const snapshot = interventions.profileSnapshot(profile);
  assert.equal(snapshot.refinedValues.SDT.rawMean, null);
  assert.equal(snapshot.mrat, null);
  assert.equal(snapshot.itemRatings[2], null);
  assert.equal(snapshot.totalAnswered, 1);
});

test('new experiments omit baseline references even when an older definition supplies one', () => {
  for (const condition of ['baseline', 'prefix', 'replacement']) {
    const cfg = config(condition, condition === 'baseline' ? 0 : 1);
    cfg.intervention.baseline = { runId: 'older-baseline', config: { model: 'earlier-model' } };
    const definition = interventions.validate(cfg);
    const experiment = interventions.createExperiment(cfg, 'Prompt', interventions.FIXED_ORDER);
    assert.equal(Object.hasOwn(definition, 'baseline'), false);
    assert.equal(Object.hasOwn(experiment, 'baseline'), false);
    assert.equal(experiment.condition, condition);
  }
});

test('manual corrections are identified and missing target responses stay missing', async () => {
  const cfg = config();
  cfg.intervention.entries[0].originalRating = null;
  const result = await new EvaluatorEngine(cfg, pvq, psych, client([], 'I cannot answer.')).run();
  assert.equal(result.itemProvenance[1].origin, 'manual');
  assert.equal(result.psychometrics.totalAnswered, 0);
  assert.equal(result.psychometrics.itemRatings[20], null);
});

test('configuration is snapshotted and repeated runs start fresh history with distinct run IDs', async () => {
  const cfg = config('prefix', 1);
  const requests = [];
  const engine = new EvaluatorEngine(cfg, pvq, psych, client(requests));
  cfg.intervention.entries[0].rating = 1;
  const first = await engine.run();
  first.experiment.entries[0].rating = 3;
  const second = await engine.run();
  assert.equal(requests[0][1].content, '6');
  assert.equal(requests[56][1].content, '6');
  assert.equal(requests[56].length, 3);
  assert.notEqual(first.metadata.runId, second.metadata.runId);
  assert.equal(first.experiment.experimentId, second.experiment.experimentId);
});

test('stopping a prefix continuation aborts the active request and clears engine state', async () => {
  let signal;
  const engine = new EvaluatorEngine(config(), pvq, psych, { completeChat: options => new Promise((resolve, reject) => {
    signal = options.signal;
    signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true });
  }) });
  const pending = engine.run();
  engine.stop();
  await assert.rejects(pending, /Cancelled/);
  assert.equal(signal.aborted, true);
  assert.equal(engine.isRunning, false);
  assert.equal(engine.abortController, null);
});

test('ordinary runs retain randomization and context-free behavior', async () => {
  const previousRandom = Math.random;
  Math.random = () => 0;
  try {
    const requests = [];
    const result = await new EvaluatorEngine({ mode: 'sequential', keepContext: false, randomizeOrder: true }, pvq, psych, client(requests)).run();
    assert.notDeepEqual(result.metadata.itemOrder, interventions.FIXED_ORDER);
    assert.equal(requests.length, 57);
    assert.ok(requests.every(messages => messages.length === 1));
  } finally { Math.random = previousRandom; }
});

test('stopping during a continuation retry prevents another provider request', async () => {
  const api = require('../api_client.js');
  const previousFetch = global.fetch;
  const previousWarn = console.warn;
  let requests = 0;
  global.fetch = async () => {
    requests++;
    return { ok: false, status: 503, headers: new Map(), json: async () => ({ error: { message: 'Temporarily unavailable' } }) };
  };
  console.warn = () => {};
  const engine = new EvaluatorEngine({ ...config(), retryBaseDelayMs: 20 }, pvq, psych, api);
  try {
    await assert.rejects(engine.run(event => {
      if (event.type === 'rate_limit_pause') engine.stop();
    }), /cancel|abort/i);
    assert.equal(requests, 1);
    assert.equal(engine.isRunning, false);
  } finally { global.fetch = previousFetch; console.warn = previousWarn; }
});
