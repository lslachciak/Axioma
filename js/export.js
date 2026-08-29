/**
 * Data Exporter Module for Axioma
 * Generates and downloads JSON and TSV files directly in the browser.
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
   * Section 1: Run Metadata & Config
   * Section 2: Token Usage
   * Section 3: 19 Refined Values (Raw Means & Centered Scores)
   * Section 4: 4 Higher-Order Value Aggregations
   * Section 5: Item-by-Item Scores & Raw Outputs
   *
   * @param {Object} results
   * @param {string} [filename]
   * @returns {string} TSV text
   */
  function generateTSVContent(results) {
    if (!results || !results.psychometrics) return "";

    const lines = [];

    // Header Metadata
    lines.push("# AXIOMA LLM PSYCHOMETRIC EVALUATION - PVQ-RR (57 ITEMS)");
    lines.push(`# Timestamp\t${results.metadata?.timestamp || new Date().toISOString()}`);
    lines.push(`# Provider\t${results.metadata?.config?.provider || ""}`);
    lines.push(`# Model\t${results.metadata?.config?.model || ""}`);
    lines.push(`# Language\t${results.metadata?.config?.lang || "en"}`);
    lines.push(`# Mode\t${results.metadata?.config?.mode || ""}`);
    lines.push(`# Temperature\t${results.metadata?.config?.temperature ?? ""}`);
    lines.push(`# Seed\t${results.metadata?.config?.seed ?? ""}`);
    lines.push(`# Reasoning Enabled\t${results.metadata?.config?.enableReasoning ? "Yes" : "No"}`);
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

  exports.exportToJSON = exportToJSON;
  exports.generateTSVContent = generateTSVContent;
  exports.exportToTSV = exportToTSV;

})(typeof exports !== 'undefined' ? exports : (window.DataExporter = {}));
