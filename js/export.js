/**
 * Data Exporter Module for Axioma
 * Generates and downloads JSON, TSV, and XLSX (Excel workbook with multiple tabs) files directly in the browser.
 */

(function (exports) {
  'use strict';

  /**
   * Triggers a browser download for blob content.
   */
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
  function exportToJSON(results, filename = "axioma_pvq_rr_results.json") {
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
    lines.push(`# Provider\t${results.metadata?.config?.provider || ""}`);
    lines.push(`# Model\t${results.metadata?.config?.model || ""}`);
    lines.push(`# System Prompt\t${(results.metadata?.config?.customSystemPrompt || "").replace(/[\r\n\t]+/g, " ")}`);
    lines.push(`# Language\t${results.metadata?.config?.lang || "en"}`);
    lines.push(`# Mode\t${results.metadata?.config?.mode || ""}`);
    lines.push(`# Keep Chat Context History\t${results.metadata?.config?.keepContext ? "Yes (Enabled)" : "No (Disabled)"}`);
    lines.push(`# Randomize Order (--randomize)\t${results.metadata?.config?.randomizeOrder ? "Yes (Enabled)" : "No (Disabled)"}`);
    lines.push(`# Temperature\t${results.metadata?.config?.temperature ?? ""}`);
    lines.push(`# Seed\t${results.metadata?.config?.seed ?? ""}`);
    lines.push(`# Reasoning Enabled\t${results.metadata?.config?.enableReasoning ? "Yes" : "No"}`);
    lines.push(`# Reasoning Token Budget\t${results.metadata?.config?.enableReasoning ? (results.metadata?.config?.reasoningBudget || 1024) : "N/A"}`);
    lines.push(`# Grand Mean (MRAT)\t${results.psychometrics.mrat}`);
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
      lines.push(`${rv.code}\t${rv.nameEn}\t${rv.namePl}\t${rv.higherOrder}\t${rv.items.join(",")}\t${rv.rawMean ?? ""}\t${rv.centeredMean ?? ""}`);
    }
    lines.push("");

    // Section 4: 57 Items Detailed Responses
    lines.push("--- ITEM-BY-ITEM RESPONSES ---");
    lines.push("Item ID\tRefined Code\tScore (1-6)\tReasoning Trace\tRaw Response Text");
    for (let i = 1; i <= 57; i++) {
      const score = results.psychometrics.itemRatings[i] ?? "N/A";
      const reasoning = (results.reasoningTraces?.[i] || "").replace(/[\r\n\t]+/g, " ");
      const rawText = (results.rawResponses?.[i] || "").replace(/[\r\n\t]+/g, " ");
      const itemMeta = window.PVQData ? window.PVQData.ITEMS[i - 1] : { valueKey: "" };
      lines.push(`${i}\t${itemMeta?.valueKey || ""}\t${score}\t${reasoning}\t${rawText}`);
    }

    return lines.join("\n");
  }

  function exportToTSV(results, filename = "axioma_pvq_rr_results.tsv") {
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
  function exportToXLSX(results, filename = "axioma_pvq_rr_results.xlsx") {
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
      ["Provider", results.metadata?.config?.provider || ""],
      ["Model", results.metadata?.config?.model || ""],
      ["System Prompt", results.metadata?.config?.customSystemPrompt || ""],
      ["Base URL", results.metadata?.config?.baseUrl || ""],
      ["Language", results.metadata?.config?.lang || "en"],
      ["Execution Mode", results.metadata?.config?.mode || ""],
      ["Keep Chat Context History", results.metadata?.config?.keepContext ? "Yes (Enabled)" : "No (Disabled)"],
      ["Randomize Order (--randomize)", results.metadata?.config?.randomizeOrder ? "Yes (Enabled)" : "No (Disabled)"],
      ["Temperature", results.metadata?.config?.temperature ?? ""],
      ["Seed", results.metadata?.config?.seed ?? "None"],
      ["Reasoning Enabled", results.metadata?.config?.enableReasoning ? "Yes" : "No"],
      ["Reasoning Token Budget", results.metadata?.config?.enableReasoning ? (results.metadata?.config?.reasoningBudget || 1024) : "N/A"],
      ["Grand Mean Score (MRAT)", results.psychometrics.mrat],
      ["Total Items Answered", `${results.psychometrics.totalAnswered} / 57`]
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
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
    const wsHO = XLSX.utils.aoa_to_sheet(hoRows);
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
        rv.higherOrder,
        rv.items.join(", "),
        rv.rawMean ?? "N/A",
        rv.centeredMean ?? "N/A"
      ]);
    }
    const wsRefined = XLSX.utils.aoa_to_sheet(refRows);
    XLSX.utils.book_append_sheet(wb, wsRefined, "19 Refined Values");

    // Tab 4: Item Responses
    const itemRows = [
      ["Item ID", "Refined Code", "Description (EN)", "Description (PL)", "Parsed Score (1-6)", "Chain-of-Thought Trace", "Raw LLM Response Text"]
    ];
    for (let i = 1; i <= 57; i++) {
      const score = results.psychometrics.itemRatings[i] ?? "N/A";
      const reasoning = results.reasoningTraces?.[i] || "";
      const rawText = results.rawResponses?.[i] || "";
      const itemMeta = window.PVQData ? window.PVQData.ITEMS[i - 1] : { valueKey: "", en: "", pl: "" };
      itemRows.push([
        i,
        itemMeta?.valueKey || "",
        itemMeta?.en || "",
        itemMeta?.pl || "",
        score,
        reasoning,
        rawText
      ]);
    }
    const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
    XLSX.utils.book_append_sheet(wb, wsItems, "57 Items & Responses");

    // Tab 5: Token Consumption
    const tokenRows = [
      ["Metric", "Tokens"],
      ["Prompt / Input Tokens", results.tokenUsage?.promptTokens ?? 0],
      ["Completion / Output Tokens", results.tokenUsage?.completionTokens ?? 0],
      ["Reasoning / Thinking Tokens", results.tokenUsage?.reasoningTokens ?? 0],
      ["Total Tokens", results.tokenUsage?.totalTokens ?? 0]
    ];
    const wsTokens = XLSX.utils.aoa_to_sheet(tokenRows);
    XLSX.utils.book_append_sheet(wb, wsTokens, "Token Usage");

    // Save Workbook
    XLSX.writeFile(wb, filename);
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
  function exportSessionToCSV(sessionResults, filename = "axioma_session_results.csv") {
    if (!sessionResults || !Array.isArray(sessionResults) || sessionResults.length === 0) return;

    const items = window.PVQData ? window.PVQData.ITEMS : [];

    // Header row
    const headers = [
      "Run #",
      "Timestamp",
      "Provider",
      "Model",
      "Base URL",
      "Language",
      "Execution Mode",
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
      "Items Answered"
    ];

    // Add 4 Higher-Order Values (Raw & Centered)
    const hoKeys = ["SELF_TRANSCENDENCE", "CONSERVATION", "SELF_ENHANCEMENT", "OPENNESS_TO_CHANGE"];
    for (const key of hoKeys) {
      headers.push(`${key}_Raw`, `${key}_Centered`);
    }

    // Add 19 Refined Basic Values (Raw & Centered)
    if (sessionResults[0]?.psychometrics?.refinedValues) {
      for (const code in sessionResults[0].psychometrics.refinedValues) {
        headers.push(`${code}_Raw`, `${code}_Centered`);
      }
    }

    // Add 57 Item Scores
    for (let i = 1; i <= 57; i++) {
      headers.push(`Item_${i}_Score`);
    }

    const rows = [headers.map(escapeCSVCell).join(",")];

    sessionResults.forEach((results, idx) => {
      const meta = results.metadata || {};
      const cfg = meta.config || {};
      const psych = results.psychometrics || {};
      const token = results.tokenUsage || {};

      const row = [
        idx + 1,
        meta.timestamp || "",
        cfg.provider || "",
        cfg.model || "",
        cfg.baseUrl || "",
        cfg.lang || "en",
        cfg.mode || "",
        cfg.keepContext ? "Yes" : "No",
        cfg.randomizeOrder ? "Yes" : "No",
        cfg.temperature ?? "",
        cfg.seed ?? "",
        cfg.enableReasoning ? "Yes" : "No",
        cfg.enableReasoning ? (cfg.reasoningBudget || 1024) : "N/A",
        cfg.enableReasoning ? (cfg.reasoningEffort || "medium") : "N/A",
        token.promptTokens ?? 0,
        token.completionTokens ?? 0,
        token.reasoningTokens ?? 0,
        token.totalTokens ?? 0,
        psych.mrat ?? "N/A",
        `${psych.totalAnswered ?? 0}/57`
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
        row.push(psych.itemRatings?.[i] ?? "N/A");
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
  function exportSessionToXLSX(sessionResults, filename = "axioma_session_results.xlsx") {
    if (!sessionResults || !Array.isArray(sessionResults) || sessionResults.length === 0) return;
    if (typeof window.XLSX === 'undefined') {
      alert("XLSX library not loaded. Please ensure you have internet access or CDN loaded.");
      return;
    }

    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();

    // Summary Sheet: 1 row per run
    const headers = [
      "Run #",
      "Timestamp",
      "Provider",
      "Model",
      "Base URL",
      "Language",
      "Execution Mode",
      "Keep Context History",
      "Randomize Order",
      "Temperature",
      "Seed",
      "Reasoning Enabled",
      "Reasoning Token Budget",
      "Prompt Tokens",
      "Completion Tokens",
      "Reasoning Tokens",
      "Total Tokens",
      "MRAT Grand Mean",
      "Items Answered"
    ];

    const hoKeys = ["SELF_TRANSCENDENCE", "CONSERVATION", "SELF_ENHANCEMENT", "OPENNESS_TO_CHANGE"];
    for (const key of hoKeys) {
      headers.push(`${key} (Raw)`, `${key} (Centered)`);
    }

    if (sessionResults[0]?.psychometrics?.refinedValues) {
      for (const code in sessionResults[0].psychometrics.refinedValues) {
        headers.push(`${code} (Raw)`, `${code} (Centered)`);
      }
    }

    for (let i = 1; i <= 57; i++) {
      headers.push(`Item ${i} Score`);
    }

    const summaryRows = [headers];

    sessionResults.forEach((results, idx) => {
      const meta = results.metadata || {};
      const cfg = meta.config || {};
      const psych = results.psychometrics || {};
      const token = results.tokenUsage || {};

      const row = [
        idx + 1,
        meta.timestamp || "",
        cfg.provider || "",
        cfg.model || "",
        cfg.baseUrl || "",
        cfg.lang || "en",
        cfg.mode || "",
        cfg.keepContext ? "Yes" : "No",
        cfg.randomizeOrder ? "Yes" : "No",
        cfg.temperature ?? "",
        cfg.seed ?? "",
        cfg.enableReasoning ? "Yes" : "No",
        cfg.enableReasoning ? (cfg.reasoningBudget || 1024) : "N/A",
        token.promptTokens ?? 0,
        token.completionTokens ?? 0,
        token.reasoningTokens ?? 0,
        token.totalTokens ?? 0,
        psych.mrat ?? "N/A",
        `${psych.totalAnswered ?? 0}/57`
      ];

      for (const key of hoKeys) {
        const ho = psych.higherOrderValues?.[key];
        row.push(ho?.rawMean ?? "N/A", ho?.centeredMean ?? "N/A");
      }

      if (psych.refinedValues) {
        for (const code in psych.refinedValues) {
          const rv = psych.refinedValues[code];
          row.push(rv?.rawMean ?? "N/A", rv?.centeredMean ?? "N/A");
        }
      }

      for (let i = 1; i <= 57; i++) {
        row.push(psych.itemRatings?.[i] ?? "N/A");
      }

      summaryRows.push(row);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Session Runs Summary");

    XLSX.writeFile(wb, filename);
  }

  exports.exportToJSON = exportToJSON;
  exports.generateTSVContent = generateTSVContent;
  exports.exportToTSV = exportToTSV;
  exports.exportToXLSX = exportToXLSX;
  exports.exportSessionToCSV = exportSessionToCSV;
  exports.exportSessionToXLSX = exportSessionToXLSX;

})(typeof exports !== 'undefined' ? exports : (window.DataExporter = {}));
