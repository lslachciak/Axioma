/**
 * Execution Engine for Axioma
 * Orchestrates Batch Mode vs Sequential Mode evaluation of the 57 PVQ-RR items.
 * Handles item ordering (Sequential vs Randomize), context history tracking, live progress callbacks,
 * and rate limit status updates.
 */

(function (exports) {
  'use strict';

  const versionInfo = (typeof window !== 'undefined' && window.AxiomaVersion) ? window.AxiomaVersion : require('./version.js');
  const APP_VERSION = versionInfo.APP_VERSION || 'Unknown Version';

  /**
   * Helper function to shuffle an array using Fisher-Yates algorithm.
   */
  function shuffleArray(array) {
    const shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Creates evaluation prompts based on language and mode.
   */
  function buildSystemPrompt(userCustomPrompt, lang) {
    // If not in a browser (e.g. Node tests), we might need to access the exported data
    const pvq = (typeof window !== 'undefined' && window.PVQData) ? window.PVQData : require('./pvq_data.js');
    const baseDefault = pvq.DEFAULT_SYSTEM_PROMPTS[lang] || pvq.DEFAULT_SYSTEM_PROMPTS['en'];

    if (!userCustomPrompt || !userCustomPrompt.trim()) {
      return baseDefault;
    }
    return userCustomPrompt.trim();
  }

  /**
   * Builds prompt for Batch Mode.
   */
  function buildBatchPrompt(items, lang) {
    let itemsText = "";
    for (const item of items) {
      const text = lang === 'pl' ? item.pl : item.en;
      itemsText += `${item.id}. ${text}\n`;
    }

    return itemsText.trim();
  }

  /**
   * Builds prompt for a single Sequential Mode item.
   */
  function buildSequentialPrompt(item, lang) {
    const text = lang === 'pl' ? item.pl : item.en;
    
    // The scale instructions are already provided in the system prompt.
    // Repeating them here is redundant and wastes tokens.
    return `Item ${item.id}: "${text}"`;
  }

  /**
   * Formats full conversation history into a readable prompt string for display.
   */
  function formatConversationDisplay(systemPrompt, conversationHistory, currentPrompt) {
    let output = "";
    if (systemPrompt) {
      output += `[SYSTEM PROMPT]\n${systemPrompt}\n\n`;
    }
    if (conversationHistory && conversationHistory.length > 0) {
      output += `--- CONVERSATION HISTORY (${conversationHistory.length} messages) ---\n`;
      for (const msg of conversationHistory) {
        const roleLabel = msg.role === 'user' ? 'USER' : (msg.role === 'assistant' ? 'ASSISTANT' : msg.role.toUpperCase());
        output += `[${roleLabel}]: ${msg.content}\n\n`;
      }
      output += `--- CURRENT MESSAGE ---\n`;
    }
    output += `[USER]:\n${currentPrompt}`;
    return output;
  }

  /**
   * Main Evaluator Engine class.
   */
  class EvaluatorEngine {
    constructor(config, pvqData, psychometrics, apiClient) {
      this.config = config; // { provider, apiKey, baseUrl, model, temperature, seed, lang, mode, randomizeOrder, keepContext, enableReasoning, reasoningBudget, customSystemPrompt }
      this.pvqData = pvqData;
      this.psychometrics = psychometrics;
      this.apiClient = apiClient;
      this.isRunning = false;
      this.shouldAbort = false;
    }

    stop() {
      this.shouldAbort = true;
      this.isRunning = false;
    }

    /**
     * Executes evaluation run.
     * @param {Function} onProgress - Callback for live progress updates
     * @returns {Promise<Object>} Final evaluation results object
     */

    async _runBatch(lang, systemPrompt, statusUpdateCallback, onProgress, state) {
        // --- BATCH MODE ---
        const batchUserPrompt = buildBatchPrompt(this.pvqData.ITEMS, lang);
        const displayedPromptText = formatConversationDisplay(systemPrompt, [], batchUserPrompt);

        if (onProgress) {
          onProgress({
            type: 'batch_start',
            statusMessage: 'Evaluating all 57 items in single batch prompt...',
            completedCount: 0,
            totalItems: 57,
            currentPrompt: displayedPromptText,
            tokenUsage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 }
          });
        }

        const messages = [{ role: "user", content: batchUserPrompt }];

        try {
          const apiRes = await this.apiClient.completeChat({
            ...this.config,
            systemPrompt: systemPrompt
          }, messages, statusUpdateCallback, () => this.shouldAbort);

          if (this.shouldAbort) throw new Error("Evaluation cancelled by user.");

          state.totalPromptTokens += apiRes.tokenUsage.promptTokens;
          state.totalCompletionTokens += apiRes.tokenUsage.completionTokens;
          state.totalReasoningTokens += apiRes.tokenUsage.reasoningTokens;

          if (apiRes.actualModel) state.actualModel = apiRes.actualModel;
          if (apiRes.systemFingerprint) state.systemFingerprint = apiRes.systemFingerprint;

          const batchParsed = this.psychometrics.parseBatchResponse(apiRes.text);

          for (let i = 1; i <= 57; i++) {
            const parsedInfo = batchParsed[i] || { score: null, rawText: "", isRefusal: false };
            state.parsedItemScores[i] = parsedInfo.score;
            state.rawResponses[i] = parsedInfo.rawText || "";
            state.reasoningTraces[i] = i === 1 ? apiRes.reasoning : "";
            state.llmQueries[i] = displayedPromptText;
          }

          if (onProgress) {
            onProgress({
              type: 'batch_complete',
              statusMessage: 'Batch evaluation complete!',
              completedCount: 57,
              totalItems: 57,
              currentPrompt: displayedPromptText,
              lastResponse: apiRes.text,
              lastReasoning: apiRes.reasoning,
              parsedScoresMap: { ...state.parsedItemScores },
              rawResponses: { ...state.rawResponses },
              reasoningTraces: { ...state.reasoningTraces },
              llmQueries: { ...state.llmQueries },
              tokenUsage: {
                promptTokens: state.totalPromptTokens,
                completionTokens: state.totalCompletionTokens,
                reasoningTokens: state.totalReasoningTokens,
                totalTokens: state.totalPromptTokens + state.totalCompletionTokens
              }
            });
          }

        } catch (err) {
          if (this.shouldAbort) {
            throw new Error("Evaluation aborted.");
          }
          throw err;
        }
    }

    async _runSequential(keepContext, itemsToRun, lang, systemPrompt, statusUpdateCallback, onProgress, state) {
        const totalItems = itemsToRun.length;
        {
          // --- FULLY SEQUENTIAL ---
          const conversationHistory = [];

          for (let idx = 0; idx < totalItems; idx++) {
            if (this.shouldAbort) {
              throw new Error("Evaluation cancelled by user.");
            }

            const currentItem = itemsToRun[idx];
            const itemPromptText = buildSequentialPrompt(currentItem, lang);

            const displayedPromptText = formatConversationDisplay(systemPrompt, conversationHistory, itemPromptText);

            if (onProgress) {
              onProgress({
                type: 'item_start',
                statusMessage: `Evaluating Item ${currentItem.id} (${idx + 1}/${totalItems})...`,
                completedCount: idx,
                totalItems: totalItems,
                currentItemId: currentItem.id,
                currentPrompt: displayedPromptText,
                tokenUsage: {
                  promptTokens: state.totalPromptTokens,
                  completionTokens: state.totalCompletionTokens,
                  reasoningTokens: state.totalReasoningTokens,
                  totalTokens: state.totalPromptTokens + state.totalCompletionTokens
                }
              });
            }

            const requestMessages = keepContext
              ? [...conversationHistory, { role: "user", content: itemPromptText }]
              : [{ role: "user", content: itemPromptText }];

            const apiRes = await this.apiClient.completeChat({
              ...this.config,
              systemPrompt: systemPrompt
            }, requestMessages, statusUpdateCallback, () => this.shouldAbort);

            if (this.shouldAbort) throw new Error("Evaluation cancelled by user.");

            state.totalPromptTokens += apiRes.tokenUsage.promptTokens;
            state.totalCompletionTokens += apiRes.tokenUsage.completionTokens;
            state.totalReasoningTokens += apiRes.tokenUsage.reasoningTokens;

            if (apiRes.actualModel) state.actualModel = apiRes.actualModel;
            if (apiRes.systemFingerprint) state.systemFingerprint = apiRes.systemFingerprint;

            state.rawResponses[currentItem.id] = apiRes.text;
            state.reasoningTraces[currentItem.id] = apiRes.reasoning;
            state.llmQueries[currentItem.id] = displayedPromptText;

            const parsed = this.psychometrics.parseItemResponse(apiRes.text);
            state.parsedItemScores[currentItem.id] = parsed.score;

            if (keepContext) {
              conversationHistory.push({ role: "user", content: itemPromptText });
              conversationHistory.push({ role: "assistant", content: apiRes.text });
            }

            if (onProgress) {
              onProgress({
                type: 'item_complete',
                statusMessage: `Item ${currentItem.id} evaluated successfully (${idx + 1}/${totalItems}).`,
                completedCount: idx + 1,
                totalItems: totalItems,
                currentItemId: currentItem.id,
                currentPrompt: displayedPromptText,
                lastScore: parsed.score,
                lastResponse: apiRes.text,
                lastReasoning: apiRes.reasoning,
                isRefusal: parsed.isRefusal,
                parsedScoresMap: { ...state.parsedItemScores },
                rawResponses: { ...state.rawResponses },
                reasoningTraces: { ...state.reasoningTraces },
                llmQueries: { ...state.llmQueries },
                tokenUsage: {
                  promptTokens: state.totalPromptTokens,
                  completionTokens: state.totalCompletionTokens,
                  reasoningTokens: state.totalReasoningTokens,
                  totalTokens: state.totalPromptTokens + state.totalCompletionTokens
                }
              });
            }
          }
        }
    }

    async run(onProgress) {
      this.isRunning = true;
      this.shouldAbort = false;

      const lang = this.config.lang || 'en';
      const isBatch = this.config.mode === 'batch';
      const randomize = !!this.config.randomizeOrder;
      const keepContext = !!this.config.keepContext;

      let itemsToRun = this.pvqData.ITEMS.slice();
      if (randomize) {
        itemsToRun = shuffleArray(itemsToRun);
      }

      const totalItems = itemsToRun.length;

      const state = {
        rawResponses: {},
        llmQueries: {},
        parsedItemScores: {},
        reasoningTraces: {},
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalReasoningTokens: 0,
        actualModel: null,
        systemFingerprint: null
      };

      const runMetadata = {
        timestamp: new Date().toISOString(),
        appVersion: this.config.appVersion || APP_VERSION,
        config: { ...this.config, apiKey: this.config.apiKey ? "***HIDDEN***" : "" },
        itemOrder: itemsToRun.map(it => it.id)
      };

      const systemPrompt = buildSystemPrompt(this.config.customSystemPrompt, lang);

      const statusUpdateCallback = (retryMsg) => {
        if (onProgress) {
          onProgress({
            type: 'rate_limit_pause',
            statusMessage: retryMsg
          });
        }
      };

      if (isBatch) {
        await this._runBatch(lang, systemPrompt, statusUpdateCallback, onProgress, state);
      } else {
        await this._runSequential(keepContext, itemsToRun, lang, systemPrompt, statusUpdateCallback, onProgress, state);
      }

      runMetadata.actualModel = state.actualModel || this.config.model || "";
      runMetadata.systemFingerprint = state.systemFingerprint || null;

      // Calculate final psychometrics
      const psychometricResults = this.psychometrics.calculatePsychometrics(state.parsedItemScores, this.pvqData);

      this.isRunning = false;

      return {
        metadata: runMetadata,
        appVersion: runMetadata.appVersion,
        actualModel: runMetadata.actualModel,
        systemFingerprint: runMetadata.systemFingerprint,
        rawResponses: state.rawResponses,
        reasoningTraces: state.reasoningTraces,
        llmQueries: state.llmQueries,
        tokenUsage: {
          promptTokens: state.totalPromptTokens,
          completionTokens: state.totalCompletionTokens,
          reasoningTokens: state.totalReasoningTokens,
          totalTokens: state.totalPromptTokens + state.totalCompletionTokens
        },
        psychometrics: psychometricResults
      };
    }
  }

  exports.buildSystemPrompt = buildSystemPrompt;
  exports.buildBatchPrompt = buildBatchPrompt;
  exports.buildSequentialPrompt = buildSequentialPrompt;
  exports.formatConversationDisplay = formatConversationDisplay;
  exports.EvaluatorEngine = EvaluatorEngine;

})(typeof exports !== 'undefined' ? exports : (window.ExecutionEngine = {}));
