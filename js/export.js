/**
 * Data Exporter Module for Axioma
 * Generates and downloads JSON, TSV, and XLSX (Excel workbook with multiple tabs) files directly in the browser.
 */

(function (exports) {
  'use strict';

  const versionInfo = (typeof window !== 'undefined' && window.AxiomaVersion) ? window.AxiomaVersion : require('./version.js');
  const APP_VERSION = versionInfo.APP_VERSION || 'Unknown Version';

  /**
   * Triggers a browser download for blob content.
   */
  function getFormattedTime() {
    const pad = (n) => n.toString().padStart(2, '0');
    const d = new Date();
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  function downloadBlob(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports full run evaluation results as a JSON file.
   *
   * @param {Object} results - Full evaluation results object
   * @param {string} [filename] - Output filename
   */
  function exportToJSON(results, filename = "axioma_pvq_rr_results_" + getFormattedTime() + ".json") {
    if (!results) return;
    const jsonStr = JSON.stringify(results, null, 2);
    downloadBlob(jsonStr, filename, "application/json");
  }

  /**
   * Formats results into TSV format with multiple structured sections.
   * Includes clear configuration details (Keep Chat Context History, Randomize Order, Reasoning, etc.)
   */
  function generateTSVContent(results) {
    if (!results || !results.psychometrics) return "";

    const lines = [];

    // Header Metadata
    lines.push("# AXIOMA LLM PSYCHOMETRIC EVALUATION - PVQ-RR (57 ITEMS)");
    lines.push(`# Timestamp\t${results.metadata?.timestamp || new Date().toISOString()}`);
    lines.push(`# Axioma Version\t${results.metadata?.appVersion || results.appVersion || APP_VERSION}`);
    lines.push(`# Provider\t${results.metadata?.config?.provider || ""}`);
    lines.push(`# Requested Model\t${results.metadata?.config?.model || ""}`);
    lines.push(`# Resolved Model\t${results.metadata?.actualModel || results.actualModel || results.metadata?.config?.model || ""}`);
    lines.push(`# System Fingerprint\t${results.metadata?.systemFingerprint || results.systemFingerprint || "N/A"}`);
    lines.push(`# Base URL\t${results.metadata?.config?.baseUrl || ""}`);
    lines.push(`# System Prompt\t${(results.metadata?.config?.customSystemPrompt || "").replace(/[\r\n\t]+/g, " ")}`);
    lines.push(`# Language\t${results.metadata?.config?.lang || "en"}`);
    lines.push(`# Mode\t${results.metadata?.config?.mode || ""}`);
    lines.push(`# Iterations\t${results.metadata?.config?.iterations || 1}`);
    lines.push(`# Keep Chat Context History\t${results.metadata?.config?.keepContext ? "Yes (Enabled)" : "No (Disabled)"}`);
    lines.push(`# Randomize Order (--randomize)\t${results.metadata?.config?.randomizeOrder ? "Yes (Enabled)" : "No (Disabled)"}`);
    lines.push(`# Temperature\t${results.metadata?.config?.temperature ?? ""}`);
    lines.push(`# Seed\t${results.metadata?.config?.seed ?? ""}`);
    lines.push(`# Reasoning Enabled\t${results.metadata?.config?.enableReasoning === '' ? 'Default' : (results.metadata?.config?.enableReasoning === true ? 'Yes' : 'No')}`);
    lines.push(`# Reasoning Token Budget\t${results.metadata?.config?.enableReasoning === true ? (results.metadata?.config?.reasoningBudget || 1024) : "N/A"}`);
    lines.push(`# Reasoning Effort\t${results.metadata?.config?.enableReasoning === true ? (results.metadata?.config?.reasoningEffort || "medium") : "N/A"}`);
    lines.push(`# Profile Complete\t${results.psychometrics.complete ? "Yes" : "No"}`);
    lines.push(`# Grand Mean (MRAT)\t${results.psychometrics.mrat ?? "N/A"}`);
    lines.push(`# Items Answered\t${results.psychometrics.totalAnswered} / 57`);
    lines.push("");

    // Section 1: Token Usage
    lines.push("--- TOKEN USAGE ---");
    lines.push("Metric\tValue");
    lines.push(`Prompt Tokens\t${results.tokenUsage?.promptTokens ?? 0}`);
    lines.push(`Completion Tokens\t${results.tokenUsage?.completionTokens ?? 0}`);
    lines.push(`Reasoning Tokens\t${results.tokenUsage?.reasoningTokens ?? 0}`);
    lines.push(`Total Tokens\t${results.tokenUsage?.totalTokens ?? 0}`);
    lines.push("");

    // Section 2: 4 Higher-Order Values
    lines.push("--- HIGHER-ORDER VALUE DIMENSIONS ---");
    lines.push("Code\tName (EN)\tName (PL)\tConstituent Refined Keys\tRaw Mean\tCentered Score");
    for (const key in results.psychometrics.higherOrderValues) {
      const ho = results.psychometrics.higherOrderValues[key];
      lines.push(`${ho.code}\t${ho.nameEn}\t${ho.namePl}\t${ho.refinedKeys.join(",")}\t${ho.rawMean ?? ""}\t${ho.centeredMean ?? ""}`);
    }
    lines.push("");

    // Section 3: 19 Refined Basic Values
    lines.push("--- 19 REFINED BASIC VALUES ---");
    lines.push("Code\tName (EN)\tName (PL)\tHigher-Order Group\tItem IDs\tRaw Mean\tCentered Score");
    for (const code in results.psychometrics.refinedValues) {
      const rv = results.psychometrics.refinedValues[code];
      lines.push(`${rv.code}\t${rv.nameEn}\t${rv.namePl}\t${rv.higherOrder || "Boundary value (separate)"}\t${rv.items.join(",")}\t${rv.rawMean ?? ""}\t${rv.centeredMean ?? ""}`);
    }
    lines.push("");

    // Section 4: 57 Items Detailed Responses
    lines.push("--- ITEM-BY-ITEM RESPONSES ---");
    lines.push("Item ID\tRefined Code\tLLM Query Text\tReasoning Trace\tRaw Response Text\tParsed Fragment\tScore (1-6)");
    const itemRatings = results.psychometrics?.itemRatings || results.itemRatings || {};
    for (let i = 1; i <= 57; i++) {
      let score = itemRatings[i];
      if (score === null || score === undefined) {
        score = "N/A";
      }
      const reasoning = (results.reasoningTraces?.[i] || "").replace(/[\r\n\t]+/g, " ");
      const rawText = (results.rawResponses?.[i] || "").replace(/[\r\n\t]+/g, " ");
      const parsedFragment = (results.parsedFragments?.[i] || "").replace(/[\r\n\t]+/g, " ");
      const itemMeta = window.PVQData ? window.PVQData.ITEMS[i - 1] : { valueKey: "" };
      const queryText = (results.llmQueries?.[i] || "").replace(/[\r\n\t]+/g, " ");
      lines.push(`${i}\t${itemMeta?.valueKey || ""}\t${queryText}\t${reasoning}\t${rawText}\t${parsedFragment}\t${score}`);
    }

    return lines.join("\n");
  }

  function exportToTSV(results, filename = "axioma_pvq_rr_results_" + getFormattedTime() + ".tsv") {
    const tsvText = generateTSVContent(results);
    if (!tsvText) return;
    downloadBlob(tsvText, filename, "text/tab-separated-values");
  }

  /**
   * Exports results into a multi-tab Excel workbook (.xlsx) using SheetJS / XLSX.
   * Tab 1: Run Overview & Config (including Chat Context History status)
   * Tab 2: Higher-Order Values
   * Tab 3: Refined 19 Values
   * Tab 4: 57 Items & Responses
   * Tab 5: Token Usage
   */
  const MAX_EXCEL_CELL_LENGTH = 32767;

  /**
   * Sanitizes a cell value to prevent exceeding Excel's 32,767 character limit.
   */
  function sanitizeExcelCellValue(val) {
    if (typeof val === 'string' && val.length > MAX_EXCEL_CELL_LENGTH) {
      return val.slice(0, 32750) + '... [TRUNCATED]';
    }
    return val;
  }

  /**
   * Converts array of arrays to an XLSX worksheet after sanitizing cell string lengths.
   */
  function createSafeWorksheet(xlsxLib, rows) {
    const sanitized = rows.map(row => row.map(sanitizeExcelCellValue));
    return xlsxLib.utils.aoa_to_sheet(sanitized);
  }

  function exportToXLSX(results, filename = "axioma_pvq_rr_results_" + getFormattedTime() + ".xlsx") {
    if (!results || !results.psychometrics) return;
    if (typeof window.XLSX === 'undefined') {
      alert("XLSX library not loaded. Please ensure you have internet access or CDN loaded.");
      return;
    }


    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();

    // Tab 1: Overview & Config
    const overviewData = [
      ["Axioma LLM Evaluation - Overview & Configuration", ""],
      ["Timestamp", results.metadata?.timestamp || new Date().toISOString()],
      ["Axioma Version", results.metadata?.appVersion || results.appVersion || APP_VERSION],
      ["Provider", results.metadata?.config?.provider || ""],
      ["Requested Model", results.metadata?.config?.model || ""],
      ["Resolved Model", results.metadata?.actualModel || results.actualModel || results.metadata?.config?.model || ""],
      ["System Fingerprint", results.metadata?.systemFingerprint || results.systemFingerprint || "N/A"],
      ["System Prompt", results.metadata?.config?.customSystemPrompt || ""],
      ["Base URL", results.metadata?.config?.baseUrl || ""],
      ["Language", results.metadata?.config?.lang || "en"],
      ["Execution Mode", results.metadata?.config?.mode || ""],
      ["Iterations", results.metadata?.config?.iterations || 1],
      ["Keep Chat Context History", results.metadata?.config?.keepContext ? "Yes (Enabled)" : "No (Disabled)"],
      ["Randomize Order (--randomize)", results.metadata?.config?.randomizeOrder ? "Yes (Enabled)" : "No (Disabled)"],
      ["Temperature", results.metadata?.config?.temperature ?? ""],
      ["Seed", results.metadata?.config?.seed ?? "None"],
      ["Reasoning Enabled", results.metadata?.config?.enableReasoning === '' ? 'Default' : (results.metadata?.config?.enableReasoning === true ? 'Yes' : 'No')],
      ["Reasoning Token Budget", results.metadata?.config?.enableReasoning === true ? (results.metadata?.config?.reasoningBudget || 1024) : "N/A"],
      ["Reasoning Effort", results.metadata?.config?.enableReasoning === true ? (results.metadata?.config?.reasoningEffort || "medium") : "N/A"],
      ["Profile Complete", results.psychometrics.complete ? "Yes" : "No"],
      ["Grand Mean Score (MRAT)", results.psychometrics.mrat ?? "N/A"],
      ["Total Items Answered", `${results.psychometrics.totalAnswered} / 57`]
    ];
    const wsOverview = createSafeWorksheet(XLSX, overviewData);
    XLSX.utils.book_append_sheet(wb, wsOverview, "Run Overview");

    // Tab 2: Higher-Order Values
    const hoRows = [
      ["Code", "Name (EN)", "Name (PL)", "Constituent Refined Keys", "Raw Mean (1-6)", "Centered Score (Schwartz Centering)"]
    ];
    for (const key in results.psychometrics.higherOrderValues) {
      const ho = results.psychometrics.higherOrderValues[key];
      hoRows.push([
        ho.code,
        ho.nameEn,
        ho.namePl,
        ho.refinedKeys.join(", "),
        ho.rawMean ?? "N/A",
        ho.centeredMean ?? "N/A"
      ]);
    }
    const wsHO = createSafeWorksheet(XLSX, hoRows);
    XLSX.utils.book_append_sheet(wb, wsHO, "Higher-Order Values");

    // Tab 3: 19 Refined Values
    const refRows = [
      ["Code", "Name (EN)", "Name (PL)", "Higher-Order Group", "Item IDs", "Raw Mean (1-6)", "Centered Score (Schwartz Centering)"]
    ];
    for (const code in results.psychometrics.refinedValues) {
      const rv = results.psychometrics.refinedValues[code];
      refRows.push([
        rv.code,
        rv.nameEn,
        rv.namePl,
        rv.higherOrder || "Boundary value (separate)",
        rv.items.join(", "),
        rv.rawMean ?? "N/A",
        rv.centeredMean ?? "N/A"
      ]);
    }
    const wsRefined = createSafeWorksheet(XLSX, refRows);
    XLSX.utils.book_append_sheet(wb, wsRefined, "19 Refined Values");

    // Tab 4: Item Responses
    const itemRows = [
      ["Item ID", "Refined Code", "Description (EN)", "Description (PL)", "LLM Query Text", "Chain-of-Thought Trace", "Raw LLM Response Text", "Parsed Fragment", "Parsed Score (1-6)"]
    ];
    for (let i = 1; i <= 57; i++) {
      let score = results.psychometrics.itemRatings[i];
      if (score === null || score === undefined) {
        score = "N/A";
      }
      const reasoning = results.reasoningTraces?.[i] || "";
      const rawText = results.rawResponses?.[i] || "";
      const itemMeta = window.PVQData ? window.PVQData.ITEMS[i - 1] : { valueKey: "", en: "", pl: "" };
      itemRows.push([
        i,
        itemMeta?.valueKey || "",
        itemMeta?.en || "",
        itemMeta?.pl || "",
        results.llmQueries?.[i] || "",
        reasoning,
        rawText,
        results.parsedFragments?.[i] || "",
        score
      ]);
    }
    const wsItems = createSafeWorksheet(XLSX, itemRows);
    XLSX.utils.book_append_sheet(wb, wsItems, "57 Items & Responses");

    const exchangeRows = [["Exchange #", "Mode", "Item IDs", "Requested At", "Query", "Full Reasoning", "Full Response", "Resolved Model", "System Fingerprint", "Prompt Tokens", "Completion Tokens", "Reasoning Tokens", "Total Tokens", "Error"]];
    (results.apiExchanges || []).forEach((exchange, index) => {
      const usage = exchange.tokenUsage || {};
      exchangeRows.push([
        exchange.exchangeNumber || index + 1, exchange.mode || "", (exchange.itemIds || []).join(", "),
        exchange.requestedAt || "", exchange.query || "", exchange.reasoning || "", exchange.response || "",
        exchange.actualModel || "", exchange.systemFingerprint || "N/A", usage.promptTokens ?? 0,
        usage.completionTokens ?? 0, usage.reasoningTokens ?? 0, usage.totalTokens ?? 0, exchange.error || ""
      ]);
    });
    XLSX.utils.book_append_sheet(wb, createSafeWorksheet(XLSX, exchangeRows), "API Exchanges");

    // Tab 5: Token Consumption
    const tokenRows = [
      ["Metric", "Tokens"],
      ["Prompt / Input Tokens", results.tokenUsage?.promptTokens ?? 0],
      ["Completion / Output Tokens", results.tokenUsage?.completionTokens ?? 0],
      ["Reasoning / Thinking Tokens", results.tokenUsage?.reasoningTokens ?? 0],
      ["Total Tokens", results.tokenUsage?.totalTokens ?? 0]
    ];
    const wsTokens = createSafeWorksheet(XLSX, tokenRows);
    XLSX.utils.book_append_sheet(wb, wsTokens, "Token Usage");

    // Save Workbook
    try {
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export to XLSX failed:", err);
      alert("Failed to export Excel file: " + err.message);
    }
  }

  /**
   * Helper function to escape CSV cell values.
   */
  function escapeCSVCell(value) {
    if (value === null || value === undefined) return '""';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  /**
   * Exports all evaluation runs from the current session to a single CSV file.
   * Each run produces a new row in the CSV file.
   *
   * @param {Array<Object>} sessionResults - Array of evaluation result objects from the session
   * @param {string} [filename] - Output filename
   */
  function exportSessionToCSV(sessionResults, filename = "axioma_session_results_" + getFormattedTime() + ".csv") {
    if (!sessionResults || !Array.isArray(sessionResults) || sessionResults.length === 0) return;


    const items = window.PVQData ? window.PVQData.ITEMS : [];




    // Header row
    const headers = [
      "Run #",
      "Timestamp",
      "Axioma Version",
      "Provider",
      "Requested Model",
      "Resolved Model",
      "System Fingerprint",
      "Base URL",
      "System Prompt",
      "Language",
      "Execution Mode",
      "Iterations",
      "Keep Context History",
      "Randomize Order",
      "Temperature",
      "Seed",
      "Reasoning Enabled",
      "Reasoning Budget",
      "Reasoning Effort",
      "Prompt Tokens",
      "Completion Tokens",
      "Reasoning Tokens",
      "Total Tokens",
      "MRAT Grand Mean",
      "Items Answered",
      "Profile Complete",
      "Full Batch Query",
      "Full Batch Reasoning",
      "Full Batch Response"
    ];

    // Add 4 Higher-Order Values (Raw & Centered)

    const hoKeys = ["Transcendence", "Conservation", "Enhancement", "Openness"];

    for (const key of hoKeys) {
      headers.push(`${key}_Raw`, `${key}_Centered`);
    }

    // Add 19 Refined Basic Values (Raw & Centered)
    if (sessionResults[0]?.psychometrics?.refinedValues) {
      for (const code in sessionResults[0].psychometrics.refinedValues) {
        headers.push(`${code}_Raw`, `${code}_Centered`);
      }
    }

    // Add 57 item query, reasoning, raw response, parsed fragment, and score fields.
    for (let i = 1; i <= 57; i++) {
      headers.push(`Item_${i}_Query`, `Item_${i}_Reasoning`, `Item_${i}_Raw`, `Item_${i}_Parsed`, `Item_${i}_Score`);
    }

    const rows = [headers.map(escapeCSVCell).join(",")];

    sessionResults.forEach((results, idx) => {
      const meta = results.metadata || {};
      const cfg = meta.config || {};
      const psych = results.psychometrics || {};
      const token = results.tokenUsage || {};
      const batchExchange = (results.apiExchanges || []).find(exchange => exchange.mode === 'batch');


      const row = [
        idx + 1,
        meta.timestamp || "",
        meta.appVersion || results.appVersion || APP_VERSION,
        cfg.provider || "",
        cfg.model || "",
        meta.actualModel || results.actualModel || cfg.model || "",
        meta.systemFingerprint || results.systemFingerprint || "N/A",
        cfg.baseUrl || "",
        cfg.customSystemPrompt || "",
        cfg.lang || "en",
        cfg.mode || "",
        cfg.iterations || 1,
        cfg.keepContext ? "Yes" : "No",
        cfg.randomizeOrder ? "Yes" : "No",
        cfg.temperature ?? "",
        cfg.seed ?? "",
        cfg.enableReasoning === '' ? 'Default' : (cfg.enableReasoning === true ? 'Yes' : 'No'),
        cfg.enableReasoning === true ? (cfg.reasoningBudget || 1024) : "N/A",
        cfg.enableReasoning === true ? (cfg.reasoningEffort || "medium") : "N/A",
        token.promptTokens ?? 0,
        token.completionTokens ?? 0,
        token.reasoningTokens ?? 0,
        token.totalTokens ?? 0,
        psych.mrat ?? "N/A",
        `${psych.totalAnswered ?? 0}/57`,
        psych.complete ? "Yes" : "No",
        batchExchange?.query || "",
        batchExchange?.reasoning || "",
        batchExchange?.response || ""
      ];

      // 4 Higher-Order Values
      for (const key of hoKeys) {
        const ho = psych.higherOrderValues?.[key];
        row.push(ho?.rawMean ?? "N/A", ho?.centeredMean ?? "N/A");
      }

      // 19 Refined Basic Values
      if (psych.refinedValues) {
        for (const code in psych.refinedValues) {
          const rv = psych.refinedValues[code];
          row.push(rv?.rawMean ?? "N/A", rv?.centeredMean ?? "N/A");
        }
      }

      // 57 Items
      for (let i = 1; i <= 57; i++) {
        let score = psych.itemRatings?.[i];
        if (score === null || score === undefined) {
          score = "N/A";
        }
        const reasoning = results.reasoningTraces?.[i] || "";
        const rawText = results.rawResponses?.[i] || "";
        const parsedFragment = results.parsedFragments?.[i] || "";
        const queryText = (results.llmQueries?.[i] || "").replace(/[\r\n\t]+/g, " ");
        row.push(queryText, reasoning, rawText, parsedFragment, score);
      }

      rows.push(row.map(escapeCSVCell).join(","));
    });

    const csvContent = rows.join("\r\n");
    downloadBlob(csvContent, filename, "text/csv;charset=utf-8;");
  }

  /**
   * Exports all evaluation runs from the current session to an Excel workbook (.xlsx).
   * Primary Tab ("Session Summary"): One row per evaluation run in the session.
   *
   * @param {Array<Object>} sessionResults - Array of evaluation result objects from the session
   * @param {string} [filename] - Output filename
   */
  function exportSessionToXLSX(sessionResults, filename = "axioma_session_results_" + getFormattedTime() + ".xlsx") {
    if (!sessionResults || !Array.isArray(sessionResults) || sessionResults.length === 0) return;
    if (typeof window.XLSX === 'undefined') {
      alert("XLSX library not loaded. Please ensure you have internet access or CDN loaded.");
      return;
    }


    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();

    // Session Summary: one row per run, without repeated item-level fields.
    const summaryRows = [[
      "Run #",
      "Timestamp",
      "Axioma Version",
      "Provider",
      "Requested Model",
      "Resolved Model",
      "System Fingerprint",
      "Base URL",
      "System Prompt",
      "Language",
      "Execution Mode",
      "Iterations",
      "Keep Context History",
      "Randomize Order",
      "Temperature",
      "Seed",
      "Reasoning Enabled",
      "Reasoning Token Budget",
      "Reasoning Effort",
      "Prompt Tokens",
      "Completion Tokens",
      "Reasoning Tokens",
      "Total Tokens",
      "MRAT Grand Mean",
      "Items Answered",
      "Profile Complete"
    ]];
    const exchangeRows = [[
      "Run #", "Exchange #", "Mode", "Item IDs", "Requested At", "Query",
      "Full Reasoning", "Full Response", "Parsed Scores", "Resolved Model",
      "System Fingerprint", "Prompt Tokens", "Completion Tokens",
      "Reasoning Tokens", "Total Tokens", "Error"
    ]];
    const itemRows = [[
      "Run #", "Item ID", "Refined Code", "Description (EN)", "Description (PL)",
      "Query", "Reasoning", "Raw", "Parsed Fragment", "Score"
    ]];
    const refinedRows = [[
      "Run #", "Code", "Name (EN)", "Name (PL)", "Grouping", "Item IDs",
      "Scores Count", "Raw Mean", "Centered Score"
    ]];
    const higherOrderRows = [[
      "Run #", "Code", "Name (EN)", "Name (PL)", "Constituent Refined Keys",
      "Raw Mean", "Centered Score"
    ]];

    sessionResults.forEach((results, idx) => {
      const meta = results.metadata || {};
      const cfg = meta.config || {};
      const psych = results.psychometrics || {};
      const token = results.tokenUsage || {};


      summaryRows.push([
        idx + 1,
        meta.timestamp || "",
        meta.appVersion || results.appVersion || APP_VERSION,
        cfg.provider || "",
        cfg.model || "",
        meta.actualModel || results.actualModel || cfg.model || "",
        meta.systemFingerprint || results.systemFingerprint || "N/A",
        cfg.baseUrl || "",
        cfg.customSystemPrompt || "",
        cfg.lang || "en",
        cfg.mode || "",
        cfg.iterations || 1,
        cfg.keepContext ? "Yes" : "No",
        cfg.randomizeOrder ? "Yes" : "No",
        cfg.temperature ?? "",
        cfg.seed ?? "",
        cfg.enableReasoning === '' ? 'Default' : (cfg.enableReasoning === true ? 'Yes' : 'No'),
        cfg.enableReasoning === true ? (cfg.reasoningBudget || 1024) : "N/A",
        cfg.enableReasoning === true ? (cfg.reasoningEffort || "medium") : "N/A",
        token.promptTokens ?? 0,
        token.completionTokens ?? 0,
        token.reasoningTokens ?? 0,
        token.totalTokens ?? 0,
        psych.mrat ?? "N/A",
        `${psych.totalAnswered ?? 0}/57`,
        psych.complete ? "Yes" : "No"
      ]);

      (results.apiExchanges || []).forEach((exchange, exchangeIndex) => {
        const usage = exchange.tokenUsage || {};
        const parsedScores = Object.entries(exchange.parsedScores || {})
          .map(([itemId, score]) => `${itemId}=${score ?? 'N/A'}`).join('; ');
        exchangeRows.push([
          idx + 1,
          exchange.exchangeNumber || exchangeIndex + 1,
          exchange.mode || cfg.mode || "",
          (exchange.itemIds || []).join(", "),
          exchange.requestedAt || "",
          exchange.query || "",
          exchange.reasoning || "",
          exchange.response || "",
          parsedScores,
          exchange.actualModel || meta.actualModel || results.actualModel || cfg.model || "",
          exchange.systemFingerprint || meta.systemFingerprint || results.systemFingerprint || "N/A",
          usage.promptTokens ?? 0,
          usage.completionTokens ?? 0,
          usage.reasoningTokens ?? 0,
          usage.totalTokens ?? ((usage.promptTokens || 0) + (usage.completionTokens || 0)),
          exchange.error || ""
        ]);
      });

      for (let i = 1; i <= 57; i++) {
        const itemMeta = window.PVQData?.ITEMS?.[i - 1] || {};
        itemRows.push([
          idx + 1,
          i,
          itemMeta.valueKey || "",
          itemMeta.en || "",
          itemMeta.pl || "",
          results.llmQueries?.[i] || "",
          results.reasoningTraces?.[i] || "",
          results.rawResponses?.[i] || "",
          results.parsedFragments?.[i] || "",
          psych.itemRatings?.[i] ?? "N/A"
        ]);
      }

      Object.values(psych.refinedValues || {}).forEach(rv => refinedRows.push([
        idx + 1, rv.code, rv.nameEn, rv.namePl,
        rv.higherOrder || "Boundary value (separate)", rv.items.join(", "),
        rv.scoresCount, rv.rawMean ?? "N/A", rv.centeredMean ?? "N/A"
      ]));

      Object.values(psych.higherOrderValues || {}).forEach(ho => higherOrderRows.push([
        idx + 1, ho.code, ho.nameEn, ho.namePl, ho.refinedKeys.join(", "),
        ho.rawMean ?? "N/A", ho.centeredMean ?? "N/A"
      ]));
    });

    [
      ["Session Summary", summaryRows],
      ["API Exchanges", exchangeRows],
      ["Item Results", itemRows],
      ["Refined Values", refinedRows],
      ["Higher-Order Values", higherOrderRows]
    ].forEach(([name, rows]) => XLSX.utils.book_append_sheet(wb, createSafeWorksheet(XLSX, rows), name));

    try {
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export to XLSX failed:", err);
      alert("Failed to export Excel file: " + err.message);
    }
  }

  exports.exportToJSON = exportToJSON;
  exports.generateTSVContent = generateTSVContent;
  exports.exportToTSV = exportToTSV;
  exports.exportToXLSX = exportToXLSX;
  exports.exportSessionToCSV = exportSessionToCSV;
  exports.exportSessionToXLSX = exportSessionToXLSX;
  exports.importSessionFromFile = importSessionFromFile;
  exports.MAX_EXCEL_CELL_LENGTH = MAX_EXCEL_CELL_LENGTH;
  exports.sanitizeExcelCellValue = sanitizeExcelCellValue;

  /**
   * Imports a session from a CSV or XLSX file.
   *
   * @param {File} file - The file object from input[type="file"]
   * @param {Function} callback - Callback function(sessionResults)
   */
  function importSessionFromFile(file, callback) {
    if (typeof window.XLSX === 'undefined') {
      alert("XLSX library not loaded.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const XLSX = window.XLSX;
        const wb = XLSX.read(data, { type: 'array' });

        if (wb.SheetNames.includes("Session Summary") && wb.SheetNames.includes("Item Results")) {
          const sheetObjects = (name) => {
            const sheetRows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
            const sheetHeaders = sheetRows[0] || [];
            return sheetRows.slice(1).filter(row => row && row.length > 0).map(row =>
              Object.fromEntries(sheetHeaders.map((header, index) => [String(header || ""), row[index]]))
            );
          };
          const summaries = sheetObjects("Session Summary");
          const items = sheetObjects("Item Results");
          const exchanges = wb.SheetNames.includes("API Exchanges") ? sheetObjects("API Exchanges") : [];
          const sessionResults = summaries.map(summary => {
            const runNumber = Number(summary["Run #"]);
            const runItems = items.filter(item => Number(item["Run #"]) === runNumber);
            const itemRatings = {};
            const reasoningTraces = {};
            const rawResponses = {};
            const parsedFragments = {};
            const llmQueries = {};
            runItems.forEach(item => {
              const itemId = Number(item["Item ID"]);
              const score = item["Score"];
              itemRatings[itemId] = score === "N/A" || score === "" || score === null || score === undefined ? null : Number(score);
              llmQueries[itemId] = item["Query"] || "";
              reasoningTraces[itemId] = item["Reasoning"] || "";
              rawResponses[itemId] = item["Raw"] || "";
              parsedFragments[itemId] = item["Parsed Fragment"] || "";
            });
            const cfg = {
              provider: summary["Provider"] || "",
              model: summary["Requested Model"] || "",
              baseUrl: summary["Base URL"] || "",
              customSystemPrompt: summary["System Prompt"] || "",
              lang: summary["Language"] || "en",
              mode: summary["Execution Mode"] || "batch",
              iterations: parseInt(summary["Iterations"]) || 1,
              keepContext: summary["Keep Context History"] === "Yes",
              randomizeOrder: summary["Randomize Order"] === "Yes",
              temperature: summary["Temperature"] ?? "",
              seed: summary["Seed"] ?? "",
              enableReasoning: summary["Reasoning Enabled"] === "Yes" ? true : (summary["Reasoning Enabled"] === "No" ? false : ''),
              reasoningBudget: parseInt(summary["Reasoning Token Budget"]) || 1024,
              reasoningEffort: summary["Reasoning Effort"] || "medium"
            };
            const apiExchanges = exchanges.filter(exchange => Number(exchange["Run #"]) === runNumber).map(exchange => ({
              exchangeNumber: Number(exchange["Exchange #"]),
              mode: exchange["Mode"] || cfg.mode,
              itemIds: String(exchange["Item IDs"] || "").split(/,\s*/).filter(Boolean).map(Number),
              requestedAt: exchange["Requested At"] || "",
              query: exchange["Query"] || "",
              reasoning: exchange["Full Reasoning"] || "",
              response: exchange["Full Response"] || "",
              actualModel: exchange["Resolved Model"] || "",
              systemFingerprint: exchange["System Fingerprint"] || null,
              tokenUsage: {
                promptTokens: Number(exchange["Prompt Tokens"]) || 0,
                completionTokens: Number(exchange["Completion Tokens"]) || 0,
                reasoningTokens: Number(exchange["Reasoning Tokens"]) || 0,
                totalTokens: Number(exchange["Total Tokens"]) || 0
              },
              error: exchange["Error"] || null
            }));
            const psych = window.Psychometrics && window.PVQData
              ? window.Psychometrics.calculatePsychometrics(itemRatings, window.PVQData) : {};
            const appVersion = summary["Axioma Version"] || APP_VERSION;
            const actualModel = summary["Resolved Model"] || cfg.model;
            const systemFingerprint = summary["System Fingerprint"] || null;
            return {
              metadata: { timestamp: summary["Timestamp"] || new Date().toISOString(), appVersion, config: cfg, actualModel, systemFingerprint },
              appVersion,
              actualModel,
              systemFingerprint,
              tokenUsage: {
                promptTokens: Number(summary["Prompt Tokens"]) || 0,
                completionTokens: Number(summary["Completion Tokens"]) || 0,
                reasoningTokens: Number(summary["Reasoning Tokens"]) || 0,
                totalTokens: Number(summary["Total Tokens"]) || 0
              },
              psychometrics: psych,
              reasoningTraces,
              rawResponses,
              parsedFragments,
              llmQueries,
              apiExchanges
            };
          });
          callback(sessionResults);
          return;
        }

        const sheetName = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

        if (rows.length < 2) {
          alert("Invalid or empty file.");
          return;
        }

        const headers = rows[0].map(h => h ? String(h).trim() : '');
        const sessionResults = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || (!row[0] && !row[1])) continue;

          const getValue = (colName) => {
            let idx = headers.findIndex(h => h === colName);
            if (idx !== -1) return row[idx];

            // Try matching without underscores or parenthesis
            const normalizedTarget = colName.replace(/[_\(\)]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
            idx = headers.findIndex(h => h.replace(/[_\(\)]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() === normalizedTarget);

            if (idx !== -1) return row[idx];
            return null;
          };

          const rawReasoningEnabled = getValue("Reasoning Enabled");
          let enableReasoning = '';
          if (rawReasoningEnabled === 'Yes') enableReasoning = true;
          else if (rawReasoningEnabled === 'No') enableReasoning = false;

          let temperatureStr = getValue("Temperature");
          let temperature = temperatureStr === "" || temperatureStr === undefined || temperatureStr === null ? "" : parseFloat(String(temperatureStr).replace(',', '.'));

          const cfg = {
            provider: getValue("Provider") || "",
            model: getValue("Model") || "",
            baseUrl: getValue("Base URL") || "",
            customSystemPrompt: getValue("System Prompt") || "",
            lang: getValue("Language") || "en",
            mode: getValue("Execution Mode") || "batch",
            iterations: parseInt(getValue("Iterations")) || 1,
            keepContext: getValue("Keep Context History") === "Yes",
            randomizeOrder: getValue("Randomize Order") === "Yes",
            temperature: temperature,
            seed: getValue("Seed") || "",
            enableReasoning: enableReasoning,
            reasoningBudget: parseInt(getValue("Reasoning Token Budget")) || parseInt(getValue("Reasoning Budget")) || 1024,
            reasoningEffort: getValue("Reasoning Effort") || "medium"
          };

          const token = {
            promptTokens: parseInt(getValue("Prompt Tokens")) || 0,
            completionTokens: parseInt(getValue("Completion Tokens")) || 0,
            reasoningTokens: parseInt(getValue("Reasoning Tokens")) || 0,
            totalTokens: parseInt(getValue("Total Tokens")) || 0
          };

          const itemRatings = {};
          const reasoningTraces = {};
          const rawResponses = {};
          const parsedFragments = {};
          const llmQueries = {};

          for (let j = 1; j <= 57; j++) {
            const score = getValue(`Item ${j} Score`);
            itemRatings[j] = (score === "N/A" || score === null || score === undefined || score === "") ? null : parseInt(score);
            reasoningTraces[j] = getValue(`Item ${j} Reasoning`) || "";
            rawResponses[j] = getValue(`Item ${j} Raw`) || "";
            parsedFragments[j] = getValue(`Item ${j} Parsed`) || getValue(`Item_${j}_Parsed`) || "";
            llmQueries[j] = getValue(`Item ${j} Query`) || getValue(`Item_${j}_Query`) || "";
          }

          const requestedModel = getValue("Requested Model") || getValue("Model (Configured)") || getValue("Model") || cfg.model || "";
          const resolvedModel = getValue("Resolved Model") || getValue("Actual Model") || getValue("Model (Actual / Reported)") || requestedModel;
          const systemFingerprint = getValue("System Fingerprint") || null;
          const appVersion = getValue("Axioma Version") || getValue("Version") || APP_VERSION;

          cfg.model = requestedModel;

          const meta = {
            timestamp: getValue("Timestamp") || new Date().toISOString(),
            appVersion: appVersion,
            config: cfg,
            actualModel: resolvedModel,
            systemFingerprint: systemFingerprint
          };

          let psych = {};
          if (window.Psychometrics && window.PVQData) {
            psych = window.Psychometrics.calculatePsychometrics(itemRatings, window.PVQData);
          }
          const apiExchanges = [];
          if (cfg.mode === 'batch' && (getValue("Full Batch Query") || getValue("Full Batch Response") || getValue("Full Batch Reasoning"))) {
            apiExchanges.push({
              exchangeNumber: 1,
              mode: 'batch',
              itemIds: Array.from({ length: 57 }, (_, index) => index + 1),
              query: getValue("Full Batch Query") || llmQueries[1] || "",
              reasoning: getValue("Full Batch Reasoning") || "",
              response: getValue("Full Batch Response") || "",
              parsedScores: { ...itemRatings },
              tokenUsage: { ...token },
              actualModel: resolvedModel,
              systemFingerprint,
              error: null
            });
          } else if (cfg.mode === 'sequential') {
            for (let itemId = 1; itemId <= 57; itemId++) {
              if (!llmQueries[itemId] && !rawResponses[itemId]) continue;
              apiExchanges.push({
                exchangeNumber: apiExchanges.length + 1,
                mode: 'sequential',
                itemIds: [itemId],
                query: llmQueries[itemId],
                reasoning: reasoningTraces[itemId],
                response: rawResponses[itemId],
                parsedScores: { [itemId]: itemRatings[itemId] },
                tokenUsage: {},
                actualModel: resolvedModel,
                systemFingerprint,
                error: null
              });
            }
          }

          sessionResults.push({
            metadata: meta,
            appVersion: appVersion,
            actualModel: resolvedModel,
            systemFingerprint: systemFingerprint,
            tokenUsage: token,
            itemRatings: itemRatings,
            psychometrics: psych,
            reasoningTraces: reasoningTraces,
            rawResponses: rawResponses,
            parsedFragments: parsedFragments,
            llmQueries: llmQueries,
            apiExchanges: apiExchanges
          });
        }

        callback(sessionResults);
      } catch (err) {
        console.error("Failed to parse file", err);
        alert("Failed to parse file. Make sure it is a valid session export CSV or XLSX.");
      }
    };
    reader.readAsArrayBuffer(file);
  }


})(typeof exports !== 'undefined' ? exports : (window.DataExporter = {}));
