const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('../../vendor/xlsx.full-0.20.3.min.js');
const pvq = require('../pvq_data.js');
const psych = require('../psychometrics.js');
const { EvaluatorEngine } = require('../execution_engine.js');
let downloaded;
let workbook;
global.window = { PVQData: pvq, Psychometrics: psych, XLSX: { ...XLSX, writeFile: book => { workbook = book; } } };
global.Blob = class { constructor(parts) { downloaded = parts.join(''); } };
global.URL = { createObjectURL: () => '', revokeObjectURL() {} };
global.document = { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } };
global.alert = message => { throw new Error(message); };
global.FileReader = class { readAsArrayBuffer(file) { this.onload({ target: { result: file.bytes } }); } };
const exporter = require('../export.js');

async function result(condition = 'prefix') {
  return new EvaluatorEngine({ mode: 'sequential', keepContext: true, randomizeOrder: false, lang: 'en',
    customSystemPrompt: 'Prompt\n' + 'Long context 🧪 '.repeat(3000),
    intervention: { condition, label: '=not-a-formula', source: {
      config: { lang: 'en', model: 'donor', randomizeOrder: true }, itemOrder: null,
      profile: psych.calculatePsychometrics(Object.fromEntries(pvq.ITEMS.map(item => [item.id, 4])), pvq)
    },
      entries: [{ itemId: 1, rating: 6, originalRating: 6 }] }
  }, pvq, psych, { completeChat: async () => ({ text: '2', reasoning: '', tokenUsage: { promptTokens: 1, completionTokens: 1, reasoningTokens: 0 } }) }).run();
}

function importBytes(bytes) {
  let results;
  exporter.importSessionFromFile({ bytes, size: bytes.byteLength }, runs => { results = runs; });
  assert.ok(results, 'Import callback must run');
  return results;
}

for (const format of ['CSV', 'XLSX']) test(`${format} round-trip preserves full intervention evidence, order, and target-only scores`, async () => {
  const original = await result();
  assert.equal(Object.hasOwn(original.experiment, 'baseline'), false);
  exporter[`exportSessionTo${format}`]([original]);
  const bytes = format === 'CSV' ? new TextEncoder().encode(downloaded)
    : XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  if (format === 'XLSX') {
    assert.ok(workbook.SheetNames.includes('Experiment Records'));
    for (const row of XLSX.utils.sheet_to_json(workbook.Sheets['Experiment Records'], { header: 1 })) {
      for (const cell of row) if (typeof cell === 'string') assert.ok(cell.length <= 32767);
    }
  }
  const restored = importBytes(bytes)[0];
  assert.deepEqual(restored.experiment, original.experiment);
  assert.deepEqual(restored.itemProvenance, original.itemProvenance);
  assert.deepEqual(restored.metadata.itemOrder, original.metadata.itemOrder);
  assert.equal(restored.metadata.runId, original.metadata.runId);
  assert.equal(restored.metadata.resolvedSystemPrompt, original.metadata.resolvedSystemPrompt);
  assert.deepEqual(restored.psychometrics, original.psychometrics);
  assert.equal(restored.apiExchanges.length, 56);
  assert.equal(restored.psychometrics.itemRatings[1], null);
});

test('JSON, TSV and individual XLSX include intervention records and readable provenance', async () => {
  const original = await result();
  exporter.exportToJSON(original);
  assert.deepEqual(JSON.parse(downloaded).experiment, original.experiment);
  const tsv = exporter.generateTSVContent(original);
  assert.ok(tsv.includes('History Source\tHistory Rating\tHistory Response'));
  assert.ok(tsv.includes('1\tdonor\tdonor\t6\t6'));
  exporter.exportToXLSX(original);
  assert.ok(workbook.SheetNames.includes('Experiment Records'));
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets['57 Items & Responses'], { header: 1 });
  assert.equal(rows[1][rows[0].indexOf('Answer Origin')], 'donor');
  const restored = importBytes(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))[0];
  assert.deepEqual(restored.experiment, original.experiment);
  assert.deepEqual(restored.psychometrics, original.psychometrics);
  assert.deepEqual(restored.tokenUsage, original.tokenUsage);
  assert.equal(restored.metadata.config.keepContext, true);
  assert.equal(restored.apiExchanges.length, 56);
});

test('replacement exports retain actual ratings and effective history separately in both formats', async () => {
  const original = await result('replacement');
  assert.equal(Object.hasOwn(original.experiment, 'baseline'), false);
  for (const format of ['CSV', 'XLSX']) {
    exporter[`exportSessionTo${format}`]([original]);
    const bytes = format === 'CSV' ? new TextEncoder().encode(downloaded)
      : XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const restored = importBytes(bytes)[0];
    assert.equal(restored.psychometrics.itemRatings[1], 2);
    assert.equal(restored.itemProvenance[1].historyRating, 6);
    assert.equal(restored.itemProvenance[1].actualResponse, '2');
    assert.equal(restored.apiExchanges.length, 57);
  }
});

test('older experiment exports with baseline metadata remain importable in CSV and XLSX', async () => {
  const original = await result('replacement');
  original.experiment.baseline = { runId: 'older-baseline', config: { model: 'earlier-model' } };
  for (const format of ['CSV', 'XLSX']) {
    exporter[`exportSessionTo${format}`]([original]);
    const bytes = format === 'CSV' ? new TextEncoder().encode(downloaded)
      : XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const restored = importBytes(bytes)[0];
    assert.deepEqual(restored.experiment, original.experiment);
    assert.deepEqual(restored.psychometrics, original.psychometrics);
  }
});

test('missing experiment records are rejected instead of silently discarding provenance', async () => {
  exporter.exportSessionToXLSX([await result()]);
  workbook.SheetNames = workbook.SheetNames.filter(name => name !== 'Experiment Records');
  delete workbook.Sheets['Experiment Records'];
  const previousError = console.error;
  console.error = () => {};
  try {
    assert.throws(() => importBytes(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })), /Failed to parse file/);
  } finally { console.error = previousError; }
});
