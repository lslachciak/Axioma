/**
 * Multi-Provider API Client for Axioma LLM Evaluation
 * Supports: OpenAI, Anthropic, Google Gemini, xAI, Local Endpoints (Ollama, LM Studio, vLLM)
 * Handles custom Base URL, temperature, seed, reasoning/thinking token budget, system prompt,
 * and live model fetching from provider endpoints.
 */

(function (exports) {
  'use strict';

  const PROVIDER_DEFAULTS = {
    openai: {
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      defaultModel: "gpt-4o-mini",
      requiresApiKey: true
    },
    anthropic: {
      name: "Anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      defaultModel: "claude-3-5-haiku-20241022",
      requiresApiKey: true
    },
    gemini: {
      name: "Google Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      defaultModel: "gemini-2.5-flash",
      requiresApiKey: true
    },
    xai: {
      name: "xAI (Grok)",
      baseUrl: "https://api.xai.com/v1",
      defaultModel: "grok-beta",
      requiresApiKey: true
    },
    ollama: {
      name: "Ollama (Local)",
      baseUrl: "http://localhost:11434/v1",
      defaultModel: "llama3.2",
      requiresApiKey: false
    },
    lmstudio: {
      name: "LM Studio (Local)",
      baseUrl: "http://localhost:1234/v1",
      defaultModel: "local-model",
      requiresApiKey: false
    },
    vllm: {
      name: "vLLM (Local)",
      baseUrl: "http://localhost:8000/v1",
      defaultModel: "default",
      requiresApiKey: false
    },
    custom: {
      name: "Custom OpenAI-Compatible Endpoint",
      baseUrl: "",
      defaultModel: "",
      requiresApiKey: false
    }
  };

  /**
   * Fetches available model IDs from provider endpoint.
   *
   * @param {string} provider
   * @param {string} baseUrl
   * @param {string} apiKey
   * @returns {Promise<string[]>} List of model IDs
   */
  async function fetchAvailableModels(provider, baseUrl, apiKey) {
    if (provider === 'gemini' || (baseUrl && baseUrl.includes("generativelanguage.googleapis.com"))) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent((apiKey || "").trim())}`;
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.models)) {
            return data.models
              .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
              .map(m => m.name.replace(/^models\//, ""));
          }
        }
      } catch (e) {
        console.warn("Could not fetch Gemini native models list", e);
      }
    }

    // OpenAI-compatible /models endpoint
    try {
      const cleanBase = (baseUrl || PROVIDER_DEFAULTS[provider]?.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
      const endpoint = `${cleanBase}/models`;
      const headers = {};
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey.trim()}`;

      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data)) {
          return data.data.map(m => m.id);
        } else if (Array.isArray(data.models)) {
          return data.models.map(m => m.id || m.name);
        }
      }
    } catch (e) {
      console.warn("Could not fetch models from /models endpoint", e);
    }

    return [];
  }

  /**
   * Main completion caller.
   */
  async function completeChat(config, messages) {
    const provider = config.provider || 'openai';

    if (provider === 'anthropic') {
      return callAnthropicAPI(config, messages);
    }

    if (provider === 'gemini' || (config.baseUrl && config.baseUrl.includes("generativelanguage.googleapis.com") && !config.baseUrl.includes("/openai"))) {
      return callGeminiNativeAPI(config, messages);
    }

    return callOpenAICompatibleAPI(config, messages);
  }

  /**
   * Helper for Gemini Native REST API.
   */
  async function callGeminiNativeAPI(config, messages) {
    const rawModel = (config.model || "gemini-2.5-flash").replace(/^models\//, "");
    const apiKey = (config.apiKey || "").trim();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${rawModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

    let systemInstructionText = config.systemPrompt || "";
    const contents = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstructionText = systemInstructionText ? `${systemInstructionText}\n${msg.content}` : msg.content;
      } else {
        const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
        contents.push({
          role: role,
          parts: [{ text: msg.content }]
        });
      }
    }

    const payload = {
      contents: contents
    };

    if (systemInstructionText) {
      payload.systemInstruction = {
        parts: [{ text: systemInstructionText }]
      };
    }

    const generationConfig = {};
    if (typeof config.temperature === 'number' && !isNaN(config.temperature)) {
      generationConfig.temperature = config.temperature;
    }

    if (Object.keys(generationConfig).length > 0) {
      payload.generationConfig = generationConfig;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorText = "";
      try {
        const errJson = await response.json();
        errorText = errJson.error?.message || errJson.message || JSON.stringify(errJson);
      } catch (e) {
        errorText = await response.text();
      }
      throw new Error(`Gemini API Error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];
    const parts = candidate?.content?.parts || [];

    let text = "";
    for (const part of parts) {
      if (part.text) text += part.text;
    }

    let reasoning = "";
    if (text.includes("<think>")) {
      const match = text.match(/<think>([\s\S]*?)<\/think>/);
      if (match) {
        reasoning = match[1].trim();
        text = text.replace(/<think>[\s\S]*?<\/think>/, "").trim();
      }
    }

    const usage = data.usageMetadata || {};
    const promptTokens = usage.promptTokenCount || 0;
    const completionTokens = usage.candidatesTokenCount || 0;
    const totalTokens = usage.totalTokenCount || (promptTokens + completionTokens);

    return {
      text: text.trim(),
      reasoning: reasoning,
      tokenUsage: {
        promptTokens,
        completionTokens,
        reasoningTokens: 0,
        totalTokens
      }
    };
  }

  /**
   * Helper for OpenAI and OpenAI-compatible endpoints.
   */
  async function callOpenAICompatibleAPI(config, messages) {
    const baseUrl = (config.baseUrl || PROVIDER_DEFAULTS[config.provider]?.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    const endpoint = `${baseUrl}/chat/completions`;

    const headers = {
      "Content-Type": "application/json"
    };

    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey.trim()}`;
    }

    const payload = {
      model: config.model || PROVIDER_DEFAULTS[config.provider]?.defaultModel || "gpt-4o-mini",
      messages: []
    };

    if (config.systemPrompt) {
      payload.messages.push({ role: "system", content: config.systemPrompt });
    }

    payload.messages.push(...messages);

    if (typeof config.temperature === 'number' && !isNaN(config.temperature)) {
      payload.temperature = config.temperature;
    }

    if (typeof config.seed === 'number' && !isNaN(config.seed)) {
      payload.seed = config.seed;
    }

    if (config.enableReasoning) {
      if (config.reasoningBudget && config.reasoningBudget > 0) {
        payload.max_completion_tokens = config.reasoningBudget;
      }
      if (config.reasoningEffort) {
        payload.reasoning_effort = config.reasoningEffort;
      }
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorText = "";
      try {
        const errJson = await response.json();
        errorText = errJson.error?.message || errJson.message || JSON.stringify(errJson);
      } catch (e) {
        errorText = await response.text();
      }

      if (config.provider === 'gemini' || (config.baseUrl && config.baseUrl.includes("generativelanguage.googleapis.com"))) {
        return callGeminiNativeAPI(config, messages);
      }

      throw new Error(`API Error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices && data.choices[0];
    const message = choice?.message || {};

    let text = message.content || "";
    let reasoning = message.reasoning_content || choice?.reasoning || "";

    if (!reasoning && text.includes("<think>")) {
      const match = text.match(/<think>([\s\S]*?)<\/think>/);
      if (match) {
        reasoning = match[1].trim();
        text = text.replace(/<think>[\s\S]*?<\/think>/, "").trim();
      }
    }

    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens || usage.reasoning_tokens || 0;
    const totalTokens = usage.total_tokens || (promptTokens + completionTokens);

    return {
      text: text,
      reasoning: reasoning,
      tokenUsage: {
        promptTokens,
        completionTokens,
        reasoningTokens,
        totalTokens
      }
    };
  }

  /**
   * Helper for Anthropic API endpoint.
   */
  async function callAnthropicAPI(config, messages) {
    const baseUrl = (config.baseUrl || PROVIDER_DEFAULTS.anthropic.baseUrl).replace(/\/+$/, "");
    const endpoint = `${baseUrl}/messages`;

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": (config.apiKey || "").trim(),
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    };

    let systemText = config.systemPrompt || "";
    const anthropicMessages = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemText = systemText ? `${systemText}\n${msg.content}` : msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        });
      }
    }

    const payload = {
      model: config.model || PROVIDER_DEFAULTS.anthropic.defaultModel,
      max_tokens: config.enableReasoning && config.reasoningBudget ? Math.max(config.reasoningBudget + 1000, 4000) : 2048,
      messages: anthropicMessages
    };

    if (systemText) {
      payload.system = systemText;
    }

    if (typeof config.temperature === 'number' && !isNaN(config.temperature)) {
      payload.temperature = config.temperature;
    }

    if (config.enableReasoning) {
      payload.thinking = {
        type: "enabled",
        budget_tokens: config.reasoningBudget || 1024
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorText = "";
      try {
        const errJson = await response.json();
        errorText = errJson.error?.message || errJson.message || JSON.stringify(errJson);
      } catch (e) {
        errorText = await response.text();
      }
      throw new Error(`Anthropic API Error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    let text = "";
    let reasoning = "";

    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === "thinking") {
          reasoning += block.thinking + "\n";
        } else if (block.type === "text") {
          text += block.text;
        }
      }
    }

    const usage = data.usage || {};
    const promptTokens = usage.input_tokens || 0;
    const completionTokens = usage.output_tokens || 0;
    const reasoningTokens = usage.thinking_tokens || 0;

    return {
      text: text.trim(),
      reasoning: reasoning.trim(),
      tokenUsage: {
        promptTokens,
        completionTokens,
        reasoningTokens,
        totalTokens: promptTokens + completionTokens
      }
    };
  }

  exports.PROVIDER_DEFAULTS = PROVIDER_DEFAULTS;
  exports.fetchAvailableModels = fetchAvailableModels;
  exports.completeChat = completeChat;

})(typeof exports !== 'undefined' ? exports : (window.ApiClient = {}));
