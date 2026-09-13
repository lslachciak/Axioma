/**
 * Execution Engine for Axioma
 * Orchestrates Batch Mode vs Sequential Mode evaluation of the 57 PVQ-RR items.
 * Handles item ordering (Sequential vs Randomize), context history tracking, live progress callbacks,
 * and rate limit status updates.
 */

(function (exports) {
  'use strict';

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
    const defaultPromptEn = "You are taking a psychological assessment. Answer honestly and rate how much each statement describes you according to the specified 1 to 6 scale.";
    const defaultPromptPl = "Poniżej krótko zostaną scharakteryzowani niektórzy ludzie. Przeczytaj każdy opis i zastanów się, na ile przedstawiony człowiek jest lub nie jest podobny do Ciebie. Oceń każdy opis zgodnie ze skalą odpowiedzi: 1 - zupełnie niepodobny do mnie; 2 - niepodobny do mnie; 3 - trochę podobny do mnie; 4 - średnio podobny do mnie; 5 - podobny do mnie; 6 - bardzo podobny do mnie. Odpowiadaj szczerze, podając jedną ocenę od 1 do 6 dla każdego opisu.";

    const baseDefault = lang === 'pl' ? defaultPromptPl : defaultPromptEn;

    if (!userCustomPrompt || !userCustomPrompt.trim()) {
      return baseDefault;
    }
    return userCustomPrompt.trim();
  }

  /**
   * Builds prompt for Batch Mode.
   */
  function buildBatchPrompt(items, lang) {
    const scaleGuideEn = `
Response Scale:
1 - Not like me at all
2 - Not like me
3 - A little like me
4 - Moderately like me
5 - Like me
6 - Very much like me

Instruction: Please rate ALL 57 items below on the 1-6 scale. Return your ratings clearly for each item in the following format:
1: [Rating 1-6]
2: [Rating 1-6]
...
57: [Rating 1-6]
`;

    const scaleGuidePl = `
Skala Odpowiedzi:
1 - zupełnie niepodobny do mnie
2 - niepodobny do mnie
3 - trochę podobny do mnie
4 - średnio podobny do mnie
5 - podobny do mnie
6 - bardzo podobny do mnie

Instrukcja: Oceń WSZYSTKIE 57 poniższych pozycji w skali 1-6. Podaj swoje oceny wyraźnie w formacie:
1: [Ocena 1-6]
2: [Ocena 1-6]
...
57: [Ocena 1-6]
`;

    const guide = lang === 'pl' ? scaleGuidePl : scaleGuideEn;

    let itemsText = "";
    for (const item of items) {
      const text = lang === 'pl' ? item.pl : item.en;
      itemsText += `${item.id}. ${text}\n`;
    }

    return `${guide}\n\n${itemsText}`;
  }

  /**
   * Builds prompt for a single Sequential Mode item.
   */
  function buildSequentialPrompt(item, lang) {
    const text = lang === 'pl' ? item.pl : item.en;
    const scaleEn = "Rate how much this statement describes you on a scale from 1 (Not like me at all) to 6 (Very much like me). State your numeric rating (1-6).";
    const scalePl = "Oceń, na ile ten opis jest podobny do Ciebie w skali od 1 (zupełnie niepodobny do mnie) do 6 (bardzo podobny do mnie). Podaj swoją ocenę cyfrą (1-6).";

    const scale = lang === 'pl' ? scalePl : scaleEn;

    return `Item ${item.id}: "${text}"\n${scale}`;
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
    output += `[USER]: ${currentPrompt}`;
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
      const rawResponses = {};
      const parsedItemScores = {};
      const reasoningTraces = {};
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalReasoningTokens = 0;

      const runMetadata = {
        timestamp: new Date().toISOString(),
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
        // --- BATCH MODE ---
        const batchUserPrompt = buildBatchPrompt(this.pvqData.ITEMS, lang);

        if (onProgress) {
          onProgress({
            type: 'batch_start',
            statusMessage: 'Evaluating all 57 items in single batch prompt...',
            completedCount: 0,
            totalItems: 57,
            currentPrompt: formatConversationDisplay(systemPrompt, [], batchUserPrompt),
            tokenUsage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 }
          });
        }

        const messages = [{ role: "user", content: batchUserPrompt }];

        try {
          const apiRes = await this.apiClient.completeChat({
            ...this.config,
            systemPrompt: systemPrompt
          }, messages, statusUpdateCallback);

          if (this.shouldAbort) throw new Error("Evaluation cancelled by user.");

          totalPromptTokens += apiRes.tokenUsage.promptTokens;
          totalCompletionTokens += apiRes.tokenUsage.completionTokens;
          totalReasoningTokens += apiRes.tokenUsage.reasoningTokens;

          const batchParsed = this.psychometrics.parseBatchResponse(apiRes.text);

          for (let i = 1; i <= 57; i++) {
            const parsedInfo = batchParsed[i] || { score: null, rawText: "", isRefusal: false };
            parsedItemScores[i] = parsedInfo.score;
            rawResponses[i] = parsedInfo.rawText || apiRes.text;
            reasoningTraces[i] = apiRes.reasoning;
          }

          if (onProgress) {
            onProgress({
              type: 'batch_complete',
              statusMessage: 'Batch evaluation complete!',
              completedCount: 57,
              totalItems: 57,
              currentPrompt: formatConversationDisplay(systemPrompt, [], batchUserPrompt),
              lastResponse: apiRes.text,
              lastReasoning: apiRes.reasoning,
              parsedScoresMap: { ...parsedItemScores },
              rawResponses: { ...rawResponses },
              reasoningTraces: { ...reasoningTraces },
              tokenUsage: {
                promptTokens: totalPromptTokens,
                completionTokens: totalCompletionTokens,
                reasoningTokens: totalReasoningTokens,
                totalTokens: totalPromptTokens + totalCompletionTokens
              }
            });
          }

        } catch (err) {
          if (this.shouldAbort) {
            throw new Error("Evaluation aborted.");
          }
          throw err;
        }

      } else {
        // --- SEQUENTIAL MODE ---
        const conversationHistory = [];

        for (let idx = 0; idx < totalItems; idx++) {
          if (this.shouldAbort) {
            throw new Error("Evaluation cancelled by user.");
          }

          const currentItem = itemsToRun[idx];
          const itemPromptText = buildSequentialPrompt(currentItem, lang);

          const displayedPromptText = keepContext
            ? formatConversationDisplay(systemPrompt, conversationHistory, itemPromptText)
            : formatConversationDisplay(systemPrompt, [], itemPromptText);

          if (onProgress) {
            onProgress({
              type: 'item_start',
              statusMessage: `Evaluating Item ${currentItem.id} (${idx + 1}/${totalItems})...`,
              completedCount: idx,
              totalItems: totalItems,
              currentItemId: currentItem.id,
              currentPrompt: displayedPromptText,
              tokenUsage: {
                promptTokens: totalPromptTokens,
                completionTokens: totalCompletionTokens,
                reasoningTokens: totalReasoningTokens,
                totalTokens: totalPromptTokens + totalCompletionTokens
              }
            });
          }

          const requestMessages = keepContext
            ? [...conversationHistory, { role: "user", content: itemPromptText }]
            : [{ role: "user", content: itemPromptText }];

          const apiRes = await this.apiClient.completeChat({
            ...this.config,
            systemPrompt: systemPrompt
          }, requestMessages, statusUpdateCallback);

          if (this.shouldAbort) throw new Error("Evaluation cancelled by user.");

          totalPromptTokens += apiRes.tokenUsage.promptTokens;
          totalCompletionTokens += apiRes.tokenUsage.completionTokens;
          totalReasoningTokens += apiRes.tokenUsage.reasoningTokens;

          rawResponses[currentItem.id] = apiRes.text;
          reasoningTraces[currentItem.id] = apiRes.reasoning;

          const parsed = this.psychometrics.parseItemResponse(apiRes.text);
          parsedItemScores[currentItem.id] = parsed.score;

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
              parsedScoresMap: { ...parsedItemScores },
              rawResponses: { ...rawResponses },
              reasoningTraces: { ...reasoningTraces },
              tokenUsage: {
                promptTokens: totalPromptTokens,
                completionTokens: totalCompletionTokens,
                reasoningTokens: totalReasoningTokens,
                totalTokens: totalPromptTokens + totalCompletionTokens
              }
            });
          }
        }
      }

      // Calculate final psychometrics
      const psychometricResults = this.psychometrics.calculatePsychometrics(parsedItemScores, this.pvqData);

      this.isRunning = false;

      return {
        metadata: runMetadata,
        rawResponses: rawResponses,
        reasoningTraces: reasoningTraces,
        tokenUsage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          reasoningTokens: totalReasoningTokens,
          totalTokens: totalPromptTokens + totalCompletionTokens
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
