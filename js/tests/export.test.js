const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// --- Mocking the Browser Environment ---

let lastBlobContent = null;
let lastBlobOptions = null;
let lastDownloadedFilename = null;
let alertCalledCount = 0;
let lastAlertMessage = null;

global.alert = (msg) => {
    alertCalledCount++;
    lastAlertMessage = msg;
};

global.Blob = class Blob {
    constructor(content, opts) {
        lastBlobContent = content;
        lastBlobOptions = opts;
    }
};

global.URL = {
    createObjectURL: (blob) => "mock-url",
    revokeObjectURL: (url) => {}
};

global.document = {
    createElement: (tag) => {
        if (tag === 'a') {
            return {
                click: function() { this.clicked = true; lastDownloadedFilename = this.download; },
                appendChild: () => {},
                download: '',
                href: ''
            };
        }
        return {};
    },
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

let fileReaderLoadCallback = null;
let mockFileReaderResult = null;
global.FileReader = class FileReader {
    constructor() {
        this.onload = null;
    }
    readAsArrayBuffer(file) {
        if (this.onload) {
            this.onload({ target: { result: mockFileReaderResult } });
        }
    }
};

// Read and evaluate version.js
const versionCode = fs.readFileSync(path.join(__dirname, '../version.js'), 'utf8');
const versionExports = {};
new Function('exports', versionCode)(versionExports);
const APP_VERSION = versionExports.APP_VERSION;

// Reset mocks before each test
function resetMocks() {
    lastBlobContent = null;
    lastBlobOptions = null;
    lastDownloadedFilename = null;
    alertCalledCount = 0;
    lastAlertMessage = null;
    fileReaderLoadCallback = null;
    mockFileReaderResult = null;

    global.window = {
        AXIOMA_VERSION: APP_VERSION,
        PVQData: { ITEMS: [] },
        XLSX: undefined
    };
    for (let i = 0; i < 57; i++) {
        global.window.PVQData.ITEMS.push({ valueKey: "TEST_KEY" });
    }
}

// Read and evaluate export.js
const exportCode = fs.readFileSync(path.join(__dirname, '../export.js'), 'utf8');

function loadExportModule() {
    resetMocks();
    const exportsObj = {};
    const fn = new Function('exports', exportCode);
    fn(exportsObj);
    return exportsObj;
}

// =========================================================================

test('DataExporter is loaded successfully', (t) => {
    const exports = loadExportModule();
    assert.ok(exports.exportToJSON);
    assert.ok(exports.generateTSVContent);
});

test('exportToJSON triggers download with correct JSON', (t) => {
    const exports = loadExportModule();

    // Empty case
    exports.exportToJSON(null);
    assert.strictEqual(lastBlobContent, null, 'Should return early if no results');

    // Valid case
    const mockData = { test: 123, nested: { value: true } };
    exports.exportToJSON(mockData, 'test.json');

    assert.ok(lastBlobContent, 'Blob content should be created');
    assert.strictEqual(lastBlobOptions.type, 'application/json');
    assert.strictEqual(lastBlobContent[0], JSON.stringify(mockData, null, 2));
    assert.strictEqual(lastDownloadedFilename, 'test.json');
});

test('generateTSVContent handles empty inputs', (t) => {
    const exports = loadExportModule();
    assert.strictEqual(exports.generateTSVContent(null), "");
    assert.strictEqual(exports.generateTSVContent({}), "");
});

test('generateTSVContent generates correct TSV format', (t) => {
    const exports = loadExportModule();

    const mockResults = {
        metadata: {
            timestamp: '2024-01-01T00:00:00Z',
            config: {
                provider: 'test-provider',
                model: 'test-model',
                keepContext: true,
                randomizeOrder: false,
                enableReasoning: true,
                reasoningBudget: 2000
            }
        },
        tokenUsage: {
            promptTokens: 10,
            completionTokens: 20,
            reasoningTokens: 5,
            totalTokens: 30
        },
        psychometrics: {
            mrat: 4.5,
            totalAnswered: 57,
            higherOrderValues: {
                "Openness": { code: "O", nameEn: "Openness", namePl: "Otwartość", refinedKeys: ["key1"], rawMean: 4.0, centeredMean: -0.5 }
            },
            refinedValues: {
                "SD1": { code: "SD1", nameEn: "Self-Direction", namePl: "Kierowanie soba", higherOrder: "Openness", items: [1,2,3], rawMean: 3.5, centeredMean: -1.0 }
            },
            itemRatings: {
                1: 5,
                2: null
            }
        },
        reasoningTraces: {
            1: "reasoning 1"
        },
        rawResponses: {
            1: "raw 1"
        }
    };

    const tsv = exports.generateTSVContent(mockResults);

    assert.ok(tsv.includes("# AXIOMA LLM PSYCHOMETRIC EVALUATION"));
    assert.ok(tsv.includes(`# Axioma Version\t${APP_VERSION}`));
    assert.ok(tsv.includes("# Provider\ttest-provider"));
    assert.ok(tsv.includes("# Keep Chat Context History\tYes (Enabled)"));
    assert.ok(tsv.includes("Prompt Tokens\t10"));
    assert.ok(tsv.includes("O\tOpenness\tOtwartość\tkey1\t4\t-0.5"));
    assert.ok(tsv.includes("SD1\tSelf-Direction\tKierowanie soba\tOpenness\t1,2,3\t3.5\t-1"));
    assert.ok(tsv.includes("1\tTEST_KEY\t5\treasoning 1\traw 1"));
    assert.ok(tsv.includes("2\tTEST_KEY\tN/A\t\t")); // null rating, empty reasoning, empty raw
});


test('exportSessionToCSV triggers download with correct CSV content', (t) => {
    const exports = loadExportModule();

    // Empty cases
    exports.exportSessionToCSV(null);
    assert.strictEqual(lastBlobContent, null);
    exports.exportSessionToCSV([]);
    assert.strictEqual(lastBlobContent, null);

    // Valid cases
    const mockSession = [{
        metadata: {
            timestamp: '2024-01-01T00:00:00Z',
            config: {
                provider: 'test-provider',
                keepContext: false,
                randomizeOrder: true,
                enableReasoning: true,
                reasoningBudget: 2000
            }
        },
        tokenUsage: {
            promptTokens: 10
        },
        psychometrics: {
            mrat: 4.5,
            totalAnswered: 57,
            higherOrderValues: {
                "Openness": { code: "O", nameEn: "Openness", namePl: "Otwartość", refinedKeys: ["key1"], rawMean: 4.0, centeredMean: -0.5 }
            },
            refinedValues: {
                "SD1": { code: "SD1", nameEn: "Self-Direction", namePl: "Kierowanie soba", higherOrder: "Openness", items: [1,2,3], rawMean: 3.5, centeredMean: -1.0 }
            },
            itemRatings: {
                1: 5,
                2: null
            }
        },
        reasoningTraces: {
            1: "reasoning,with,commas",
            2: "reasoning with \"quotes\""
        },
        rawResponses: {
            1: "raw 1"
        }
    }];

    exports.exportSessionToCSV(mockSession, 'session.csv');

    assert.ok(lastBlobContent);
    assert.strictEqual(lastBlobOptions.type, 'text/csv;charset=utf-8;');
    assert.strictEqual(lastDownloadedFilename, 'session.csv');

    const csvLines = lastBlobContent[0].split('\r\n');
    assert.ok(csvLines.length >= 2, 'Should have header and data row');

    const headerRow = csvLines[0];
    assert.ok(headerRow.includes('"Run #"'), 'Header row formatting');
    assert.ok(headerRow.includes('"Timestamp"'));
    assert.ok(headerRow.includes('"Axioma Version"'));

    const dataRow = csvLines[1];
    assert.ok(dataRow.includes('"1"'), 'Run # 1');
    assert.ok(dataRow.includes(`"${APP_VERSION}"`), 'Axioma Version');
    assert.ok(dataRow.includes('"test-provider"'));
    assert.ok(dataRow.includes('"No"'), 'KeepContext');
    assert.ok(dataRow.includes('"Yes"'), 'RandomizeOrder');
    assert.ok(dataRow.includes('"reasoning,with,commas"'), 'Escaped commas');
    assert.ok(dataRow.includes('"reasoning with ""quotes"""'), 'Escaped quotes');
});

test('exportSessionToXLSX handles missing XLSX library', (t) => {
    const exports = loadExportModule();

    global.window.XLSX = undefined;

    exports.exportSessionToXLSX([{ test: 1 }]);
    assert.strictEqual(alertCalledCount, 1);
    assert.ok(lastAlertMessage.includes('XLSX library not loaded'));
});

test('exportSessionToXLSX works correctly with XLSX mock', (t) => {
    const exports = loadExportModule();

    let aoaToSheetCalled = 0;
    let bookAppendSheetCalled = 0;
    let writeFileCalled = 0;
    let writtenFilename = null;

    global.window.XLSX = {
        utils: {
            book_new: () => ({ SheetNames: [], Sheets: {} }),
            aoa_to_sheet: (aoa) => { aoaToSheetCalled++; return { aoa }; },
            book_append_sheet: (wb, ws, name) => { bookAppendSheetCalled++; }
        },
        writeFile: (wb, filename) => { writeFileCalled++; writtenFilename = filename; }
    };

    const mockSession = [{
        metadata: { config: { provider: 'test' } },
        tokenUsage: {},
        psychometrics: {},
        reasoningTraces: {},
        rawResponses: {}
    }];

    exports.exportSessionToXLSX(mockSession, 'session.xlsx');

    assert.strictEqual(aoaToSheetCalled, 1);
    assert.strictEqual(bookAppendSheetCalled, 1);
    assert.strictEqual(writeFileCalled, 1);
    assert.strictEqual(writtenFilename, 'session.xlsx');
});


test('importSessionFromFile handles missing XLSX library', (t) => {
    const exports = loadExportModule();
    global.window.XLSX = undefined;

    exports.importSessionFromFile({}, () => {});

    assert.strictEqual(alertCalledCount, 1);
    assert.ok(lastAlertMessage.includes('XLSX library not loaded'));
});

test('importSessionFromFile processes valid file correctly', (t, done) => {
    const exports = loadExportModule();

    global.window.XLSX = {
        read: (data, opts) => {
            return {
                SheetNames: ['Sheet1'],
                Sheets: { 'Sheet1': {} }
            };
        },
        utils: {
            sheet_to_json: (sheet, opts) => {
                return [
                    ["Run #", "Timestamp", "Provider", "Reasoning Enabled", "Temperature", "Item 1 Score", "Item 1 Reasoning"],
                    [1, "2024-01-01T00:00:00Z", "test-provider", "Yes", "0.5", 4, "test reasoning"],
                    [2, "2024-01-02T00:00:00Z", "test-provider2", "No", "", "N/A", ""]
                ];
            }
        }
    };

    global.window.Psychometrics = {
        calculatePsychometrics: () => ({ mrat: 3.0 })
    };

    mockFileReaderResult = new ArrayBuffer(8); // Dummy data

    const mockFile = {};

    exports.importSessionFromFile(mockFile, (sessionResults) => {
        assert.strictEqual(sessionResults.length, 2);

        // Row 1 checks
        const row1 = sessionResults[0];
        assert.strictEqual(row1.metadata.config.provider, 'test-provider');
        assert.strictEqual(row1.metadata.config.enableReasoning, true);
        assert.strictEqual(row1.metadata.config.temperature, 0.5);
        assert.strictEqual(row1.itemRatings[1], 4);
        assert.strictEqual(row1.reasoningTraces[1], "test reasoning");
        assert.strictEqual(row1.psychometrics.mrat, 3.0);

        // Row 2 checks
        const row2 = sessionResults[1];
        assert.strictEqual(row2.metadata.config.provider, 'test-provider2');
        assert.strictEqual(row2.metadata.config.enableReasoning, false);
        assert.strictEqual(row2.metadata.config.temperature, "");
        assert.strictEqual(row2.itemRatings[1], null); // N/A parsed to null

        done();
    });
});

test('importSessionFromFile handles malformed data gracefully', (t, done) => {
    const exports = loadExportModule();

    global.window.XLSX = {
        read: () => { throw new Error("Parse error"); }
    };

    mockFileReaderResult = new ArrayBuffer(8);
    const mockFile = {};

    const consoleErrorBackup = console.error;
    let consoleErrorCalled = false;
    console.error = () => { consoleErrorCalled = true; };

    exports.importSessionFromFile(mockFile, () => {
        assert.fail('Should not call callback on error');
    });

    // allow async reader simulation to finish
    setTimeout(() => {
        assert.strictEqual(alertCalledCount, 1);
        assert.ok(lastAlertMessage.includes('Failed to parse file'));
        assert.ok(consoleErrorCalled);

        console.error = consoleErrorBackup; // restore
        done();
    }, 10);
});

test('export and import preserve actualModel, systemFingerprint, and appVersion', (t, done) => {
    const exports = loadExportModule();

    const mockSession = [{
        metadata: {
            timestamp: '2024-01-01T00:00:00Z',
            appVersion: APP_VERSION,
            config: { provider: 'openai', model: 'gpt-4o' },
            actualModel: 'gpt-4o-2024-08-06',
            systemFingerprint: 'fp_44709d6fcb'
        },
        tokenUsage: { promptTokens: 5, completionTokens: 10, reasoningTokens: 0, totalTokens: 15 },
        psychometrics: { mrat: 4.0, totalAnswered: 57, itemRatings: { 1: 4 } },
        itemRatings: { 1: 4 },
        reasoningTraces: { 1: '' },
        rawResponses: { 1: '4' }
    }];

    // Test TSV output includes Requested Model, Resolved Model, System Fingerprint, and Axioma Version
    const tsv = exports.generateTSVContent(mockSession[0]);
    assert.ok(tsv.includes(`# Axioma Version\t${APP_VERSION}`));
    assert.ok(tsv.includes("# Requested Model\tgpt-4o"));
    assert.ok(tsv.includes("# Resolved Model\tgpt-4o-2024-08-06"));
    assert.ok(tsv.includes("# System Fingerprint\tfp_44709d6fcb"));

    // Test CSV output includes Requested Model, Resolved Model, System Fingerprint, and Axioma Version columns and values
    exports.exportSessionToCSV(mockSession, 'test.csv');
    assert.ok(lastBlobContent);
    const csvContent = lastBlobContent[0];
    assert.ok(csvContent.includes('"Axioma Version"'));
    assert.ok(csvContent.includes('"Requested Model"'));
    assert.ok(csvContent.includes('"Resolved Model"'));
    assert.ok(csvContent.includes('"System Fingerprint"'));
    assert.ok(csvContent.includes(`"${APP_VERSION}"`));
    assert.ok(csvContent.includes('"gpt-4o"'));
    assert.ok(csvContent.includes('"gpt-4o-2024-08-06"'));
    assert.ok(csvContent.includes('"fp_44709d6fcb"'));

    // Test Import reads Requested Model, Resolved Model, System Fingerprint, and Axioma Version
    global.window.XLSX = {
        read: () => ({
            SheetNames: ['Session Runs Summary'],
            Sheets: {
                'Session Runs Summary': {}
            }
        }),
        utils: {
            sheet_to_json: () => [
                ['Run #', 'Timestamp', 'Axioma Version', 'Provider', 'Requested Model', 'Resolved Model', 'System Fingerprint'],
                [1, '2024-01-01T00:00:00Z', APP_VERSION, 'openai', 'gpt-4o', 'gpt-4o-2024-08-06', 'fp_44709d6fcb']
            ]
        }
    };

    mockFileReaderResult = new ArrayBuffer(8);
    exports.importSessionFromFile({}, (results) => {
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].appVersion, APP_VERSION);
        assert.strictEqual(results[0].metadata.appVersion, APP_VERSION);
        assert.strictEqual(results[0].metadata.config.model, 'gpt-4o');
        assert.strictEqual(results[0].actualModel, 'gpt-4o-2024-08-06');
        assert.strictEqual(results[0].systemFingerprint, 'fp_44709d6fcb');
        assert.strictEqual(results[0].metadata.actualModel, 'gpt-4o-2024-08-06');
        assert.strictEqual(results[0].metadata.systemFingerprint, 'fp_44709d6fcb');
        done();
    });
});

test('importSessionFromFile backwards compatibility defaults appVersion when column missing', (t, done) => {
    const exports = loadExportModule();

    global.window.XLSX = {
        read: () => ({
            SheetNames: ['Session Runs Summary'],
            Sheets: {
                'Session Runs Summary': {}
            }
        }),
        utils: {
            sheet_to_json: () => [
                ['Run #', 'Timestamp', 'Provider', 'Model'],
                [1, '2024-01-01T00:00:00Z', 'openai', 'gpt-4o']
            ]
        }
    };

    mockFileReaderResult = new ArrayBuffer(8);
    exports.importSessionFromFile({}, (results) => {
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].appVersion, 'v1.1.0');
        assert.strictEqual(results[0].metadata.appVersion, 'v1.1.0');
        assert.strictEqual(results[0].metadata.config.model, 'gpt-4o');
        done();
    });
});
