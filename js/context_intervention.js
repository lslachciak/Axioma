/** Experiment definitions and answer provenance, shared by browser and Node. */
(function (exports) {
  'use strict';

  const CONDITIONS = ['baseline', 'prefix', 'replacement'];
  const FIXED_ORDER = Array.from({ length: 57 }, (_, i) => i + 1);
  const copy = value => JSON.parse(JSON.stringify(value));
  const validRating = value => Number.isInteger(value) && value >= 1 && value <= 6;
  const pvq = typeof window !== 'undefined' && window.PVQData ? window.PVQData : require('./pvq_data.js');

  // Preserve existing persisted donor metrics; do not derive a new profile here.
  function profileSnapshot(profile) {
    if (!profile) return null;
    const numberOrNull = value => Number.isFinite(value) ? value : null;
    const values = (keys, source) => Object.fromEntries(keys.map(key => [key, {
      rawMean: numberOrNull(source?.[key]?.rawMean),
      centeredMean: numberOrNull(source?.[key]?.centeredMean)
    }]));
    return {
      complete: profile.complete === true,
      totalAnswered: Number.isInteger(profile.totalAnswered) ? profile.totalAnswered : null,
      mrat: numberOrNull(profile.mrat),
      itemRatings: Object.fromEntries(FIXED_ORDER.map(id => [id, validRating(profile.itemRatings?.[id]) ? profile.itemRatings[id] : null])),
      refinedValues: values(Object.keys(pvq.REFINED_VALUES), profile.refinedValues),
      higherOrderValues: values(Object.keys(pvq.HIGHER_ORDER_VALUES), profile.higherOrderValues)
    };
  }

  function newId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID() : `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function sourceSnapshot(run) {
    if (!run) return null;
    const meta = run.metadata || {};
    const config = meta.config || {};
    const safeConfig = {};
    for (const key of ['provider', 'model', 'lang', 'mode', 'temperature', 'seed',
      'keepContext', 'randomizeOrder', 'enableReasoning', 'reasoningBudget', 'reasoningEffort']) {
      if (['string', 'number', 'boolean'].includes(typeof config[key])) safeConfig[key] = config[key];
    }
    return {
      runId: meta.runId || null,
      timestamp: meta.timestamp || null,
      appVersion: meta.appVersion || run.appVersion || null,
      actualModel: meta.actualModel || config.model || null,
      systemFingerprint: meta.systemFingerprint || null,
      profile: profileSnapshot(run.psychometrics || meta.profile),
      config: safeConfig,
      itemOrder: Array.isArray(meta.itemOrder) ? meta.itemOrder.slice() : null
    };
  }

  function validate(config) {
    const definition = config.intervention || { condition: 'baseline', entries: [] };
    const condition = definition.condition || 'baseline';
    if (!CONDITIONS.includes(condition)) throw new Error('Unknown context intervention.');
    const entries = definition.entries || [];
    if (!Array.isArray(entries)) throw new Error('Intervention answers must be a list.');
    if (condition === 'baseline') {
      if (entries.length) throw new Error('Baseline cannot contain supplied answers.');
      return { condition, entries: [], label: String(definition.label || ''),
        experimentId: definition.experimentId || null, source: null };
    }
    if (config.mode !== 'sequential' || config.keepContext !== true || config.randomizeOrder) {
      throw new Error('Context interventions require sequential mode, history enabled, and fixed order.');
    }
    if (!entries.length || entries.length > 56) throw new Error('Supply between 1 and 56 intervention answers.');
    const seen = new Set();
    for (const entry of entries) {
      if (!Number.isInteger(entry.itemId) || entry.itemId < 1 || entry.itemId > 56 || seen.has(entry.itemId)) {
        throw new Error('Intervention item IDs must be unique integers from 1 to 56, leaving a later question.');
      }
      seen.add(entry.itemId);
      if (!validRating(entry.rating)) throw new Error(`Item ${entry.itemId}: supply an integer rating from 1 to 6.`);
    }
    if (condition === 'prefix') {
      if (!definition.source) throw new Error('Select a donor run for the supplied prefix.');
      if (definition.source.config?.lang !== (config.lang || 'en')) {
        throw new Error('The donor questionnaire language must match the target language.');
      }
      if (!entries.every((_, i) => seen.has(i + 1))) throw new Error('A supplied prefix must contain items 1 through N.');
    }
    const normalized = { condition, label: String(definition.label || ''), experimentId: definition.experimentId || null };
    normalized.entries = entries.map(entry => ({
      itemId: entry.itemId,
      rating: entry.rating,
      originalRating: validRating(entry.originalRating) ? entry.originalRating : null,
      source: condition === 'prefix' && entry.rating === entry.originalRating ? 'donor' : 'manual'
    })).sort((a, b) => a.itemId - b.itemId);
    // Re-allowlist source snapshots rather than trusting imported definitions.
    normalized.source = condition === 'prefix' ? sourceSnapshot({ metadata: definition.source }) : null;
    return normalized;
  }

  function createExperiment(config, systemPrompt, itemOrder) {
    const definition = validate(config);
    return {
      schemaVersion: 1,
      experimentId: definition.experimentId || newId(),
      runId: newId(),
      condition: definition.condition,
      label: String(definition.label || ''),
      source: definition.source || null,
      entries: copy(definition.entries),
      itemOrder: itemOrder.slice(),
      systemPrompt
    };
  }

  function buildPrefixMessages(experiment, items, lang, buildPrompt) {
    if (experiment.condition !== 'prefix') return [];
    return experiment.entries.flatMap(entry => [
      { role: 'user', content: buildPrompt(items.find(item => item.id === entry.itemId), lang) },
      { role: 'assistant', content: String(entry.rating) }
    ]);
  }

  Object.assign(exports, { CONDITIONS, FIXED_ORDER, validRating, newId, sourceSnapshot, profileSnapshot,
    validate, createExperiment, buildPrefixMessages });
})(typeof exports !== 'undefined' ? exports : (window.ContextIntervention = {}));
