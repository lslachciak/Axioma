/**
 * Axioma Vanilla JS UI Application
 * Pure JavaScript UI (No Babel / JSX required - 100% CORS-safe on file:// or static hosts)
 */

(function () {
  'use strict';

  // Helper function to create DOM elements quickly
  function el(tag, props = {}, ...children) {
    const element = document.createElement(tag);
    for (const key in props) {
      if (key.startsWith('on') && typeof props[key] === 'function') {
        element.addEventListener(key.substring(2).toLowerCase(), props[key]);
      } else if (key === 'className') {
        element.className = props[key];
      } else if (key === 'style' && typeof props[key] === 'object') {
        Object.assign(element.style, props[key]);
      } else if (key === 'value' && tag !== 'select') {
        element.value = props[key];
      } else if (key === 'checked') {
        element.checked = !!props[key];
      } else if (key === 'innerHTML') {
        element.innerHTML = props[key];
      } else if (key !== 'key') {
        element.setAttribute(key, props[key]);
      }
    }
    for (const child of children.flat(Infinity)) {
      if (child !== null && child !== undefined && child !== false) {
        if (typeof child === 'string' || typeof child === 'number') {
          element.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
          element.appendChild(child);
        }
      }
    }
    // Set select value after options have been appended to DOM node
    if (props.value !== undefined && tag === 'select') {
      element.value = props.value;
    }
    return element;
  }

  // Application State
  const state = {
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    fetchedModelsList: [],
    isFetchingModels: false,
    temperature: 0.7,
    seed: '',
    lang: 'en',
    customSystemPrompt: '',
    mode: 'batch', // 'batch' | 'sequential'
    randomizeOrder: false,
    keepContext: false,
    enableReasoning: false,
    reasoningBudget: 1024,

    // Execution State
    isRunning: false,
    progressStatus: 'Ready',
    completedCount: 0,
    tokenUsage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
    liveStreamLogs: [],
    activeItemPrompt: '',
    activeItemResponse: '',
    activeReasoningTrace: '',

    // Interim live responses in Sequential Mode
    liveItemRatings: {},
    liveRawResponses: {},
    liveReasoningTraces: {},

    // Results State
    results: null,
    selectedCoTItem: null,
    activeTab: 'results' // 'results' | 'items' | 'logs'
  };

  let engineInstance = null;
  let refinedChartInstance = null;
  let higherOrderChartInstance = null;

  function updateProviderDefaults() {
    const defaults = window.ApiClient?.PROVIDER_DEFAULTS?.[state.provider];
    if (defaults) {
      state.baseUrl = defaults.baseUrl;
      state.model = defaults.defaultModel;
    }
    state.fetchedModelsList = [];
  }

  async function loadModelsFromAPI() {
    if (!window.ApiClient?.fetchAvailableModels) return;
    state.isFetchingModels = true;
    renderApp();

    try {
      const models = await window.ApiClient.fetchAvailableModels(state.provider, state.baseUrl, state.apiKey);
      if (models && models.length > 0) {
        state.fetchedModelsList = models;
        if (!state.model || !models.includes(state.model)) {
          state.model = models[0];
        }
      }
    } catch (e) {
      console.warn("Failed to fetch models from API:", e);
    } finally {
      state.isFetchingModels = false;
      renderApp();
    }
  }

  function renderApp() {
    const root = document.getElementById('root');
    root.innerHTML = '';
    root.appendChild(App());
    renderCharts();
  }

  function renderCharts() {
    if (state.activeTab !== 'results' || !state.results || !state.results.psychometrics) return;

    const psych = state.results.psychometrics;
    const refinedCanvas = document.getElementById('refinedChartCanvas');
    const hoCanvas = document.getElementById('higherOrderChartCanvas');

    if (refinedCanvas && window.Chart) {
      if (refinedChartInstance) refinedChartInstance.destroy();
      const refLabels = Object.values(psych.refinedValues).map(v => state.lang === 'pl' ? v.namePl : v.nameEn);
      const rawScores = Object.values(psych.refinedValues).map(v => v.rawMean ?? 0);
      const centeredScores = Object.values(psych.refinedValues).map(v => v.centeredMean ?? 0);

      refinedChartInstance = new Chart(refinedCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: refLabels,
          datasets: [
            {
              label: state.lang === 'pl' ? 'Średnia surowa (1-6)' : 'Raw Mean (1-6)',
              data: rawScores,
              backgroundColor: 'rgba(56, 189, 248, 0.7)',
              borderColor: '#38bdf8',
              borderWidth: 1
            },
            {
              label: state.lang === 'pl' ? 'Wynik wycentrowany (Średnia Schwarza)' : 'Centered Score (Grand Mean)',
              data: centeredScores,
              backgroundColor: 'rgba(168, 85, 247, 0.7)',
              borderColor: '#a855f7',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#94a3b8' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
          },
          plugins: { legend: { labels: { color: '#f8fafc' } } }
        }
      });
    }

    if (hoCanvas && window.Chart) {
      if (higherOrderChartInstance) higherOrderChartInstance.destroy();
      const hoLabels = Object.values(psych.higherOrderValues).map(v => state.lang === 'pl' ? v.namePl : v.nameEn);
      const hoRaw = Object.values(psych.higherOrderValues).map(v => v.rawMean ?? 0);
      const hoCentered = Object.values(psych.higherOrderValues).map(v => v.centeredMean ?? 0);

      higherOrderChartInstance = new Chart(hoCanvas.getContext('2d'), {
        type: 'radar',
        data: {
          labels: hoLabels,
          datasets: [
            {
              label: state.lang === 'pl' ? 'Średnia surowa' : 'Raw Mean',
              data: hoRaw,
              backgroundColor: 'rgba(14, 165, 233, 0.2)',
              borderColor: '#0ea5e9',
              pointBackgroundColor: '#0ea5e9'
            },
            {
              label: state.lang === 'pl' ? 'Wynik wycentrowany' : 'Centered Score',
              data: hoCentered,
              backgroundColor: 'rgba(236, 72, 153, 0.2)',
              borderColor: '#ec4899',
              pointBackgroundColor: '#ec4899'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              pointLabels: { color: '#f8fafc', font: { size: 12, weight: 'bold' } },
              ticks: { color: '#94a3b8', backdropColor: 'transparent' }
            }
          },
          plugins: { legend: { labels: { color: '#f8fafc' } } }
        }
      });
    }
  }

  async function startEvaluation() {
    state.isRunning = true;
    state.results = null;
    state.liveStreamLogs = [];
    state.completedCount = 0;
    state.tokenUsage = { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 };
    state.liveItemRatings = {};
    state.liveRawResponses = {};
    state.liveReasoningTraces = {};
    renderApp();

    const config = {
      provider: state.provider,
      apiKey: state.apiKey,
      baseUrl: state.baseUrl,
      model: state.model,
      temperature: parseFloat(state.temperature),
      seed: state.seed ? parseInt(state.seed, 10) : undefined,
      lang: state.lang,
      customSystemPrompt: state.customSystemPrompt,
      mode: state.mode,
      randomizeOrder: state.randomizeOrder,
      keepContext: state.keepContext,
      enableReasoning: state.enableReasoning,
      reasoningBudget: parseInt(state.reasoningBudget, 10)
    };

    const pvqData = window.PVQData;
    const psychometrics = window.Psychometrics;
    const apiClient = window.ApiClient;
    engineInstance = new window.ExecutionEngine.EvaluatorEngine(config, pvqData, psychometrics, apiClient);

    try {
      const runResult = await engineInstance.run((event) => {
        state.progressStatus = event.statusMessage;
        if (event.completedCount !== undefined) state.completedCount = event.completedCount;
        if (event.tokenUsage) state.tokenUsage = event.tokenUsage;
        if (event.currentPrompt) state.activeItemPrompt = event.currentPrompt;
        if (event.lastResponse) state.activeItemResponse = event.lastResponse;
        if (event.lastReasoning) state.activeReasoningTrace = event.lastReasoning;

        if (event.parsedScoresMap) state.liveItemRatings = event.parsedScoresMap;
        if (event.rawResponses) state.liveRawResponses = event.rawResponses;
        if (event.reasoningTraces) state.liveReasoningTraces = event.reasoningTraces;

        if (event.type === 'item_complete' || event.type === 'batch_complete') {
          state.liveStreamLogs.push(`[${new Date().toLocaleTimeString()}] ${event.statusMessage}`);
        }
        renderApp();
      });

      state.results = runResult;
      state.progressStatus = 'Evaluation completed successfully!';
    } catch (err) {
      state.progressStatus = `Error: ${err.message}`;
      state.liveStreamLogs.push(`[ERROR] ${err.message}`);
    } finally {
      state.isRunning = false;
      renderApp();
    }
  }

  function stopEvaluation() {
    if (engineInstance) {
      engineInstance.stop();
      state.progressStatus = 'Stopping evaluation...';
      renderApp();
    }
  }

  function App() {
    return el('div', { className: 'min-h-screen flex flex-col bg-slate-900 text-slate-100' },
      Header(),
      el('main', { className: 'max-w-7xl mx-auto px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full' },
        el('div', { className: 'lg:col-span-4 space-y-6' }, ConfigPanel()),
        el('div', { className: 'lg:col-span-8 space-y-6' }, ExecutionDashboard())
      ),
      selectedCoTModal()
    );
  }

  function Header() {
    return el('header', { className: 'border-b border-slate-800 bg-slate-950/80 sticky top-0 z-50 backdrop-blur-md' },
      el('div', { className: 'max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4' },
        el('div', { className: 'flex items-center space-x-3' },
          el('div', { className: 'w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-sky-500/20' }, 'A'),
          el('div', {},
            el('h1', { className: 'text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-300' }, 'Axioma'),
            el('p', { className: 'text-xs text-slate-400' }, 'LLM Psychometric Evaluation via Schwartz PVQ-RR (57 items)')
          )
        ),
        el('div', { className: 'flex items-center space-x-3' },
          el('select', {
            value: state.lang,
            onChange: (e) => { state.lang = e.target.value; renderApp(); },
            className: 'bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-sky-500'
          },
            el('option', { value: 'en' }, 'English (EN)'),
            el('option', { value: 'pl' }, 'Polski (PL)')
          ),
          state.results ? el('div', { className: 'flex space-x-2' },
            el('button', {
              onClick: () => window.DataExporter.exportToJSON(state.results, `Axioma_PVQ_RR_${state.model}_${new Date().toISOString().slice(0, 10)}.json`),
              className: 'bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition'
            }, el('i', { className: 'fa-solid fa-download' }), ' JSON'),
            el('button', {
              onClick: () => window.DataExporter.exportToTSV(state.results, `Axioma_PVQ_RR_${state.model}_${new Date().toISOString().slice(0, 10)}.tsv`),
              className: 'bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition'
            }, el('i', { className: 'fa-solid fa-file-csv' }), ' TSV'),
            el('button', {
              onClick: () => window.DataExporter.exportToXLSX(state.results, `Axioma_PVQ_RR_${state.model}_${new Date().toISOString().slice(0, 10)}.xlsx`),
              className: 'bg-slate-800 hover:bg-slate-700 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition'
            }, el('i', { className: 'fa-solid fa-file-excel' }), ' XLSX')
          ) : null
        )
      )
    );
  }

  function ConfigPanel() {
    const reqKey = window.ApiClient?.PROVIDER_DEFAULTS?.[state.provider]?.requiresApiKey;

    return el('div', { className: 'glass-panel p-5 rounded-2xl border border-slate-800 space-y-4' },
      el('h2', { className: 'text-base font-semibold text-sky-400 flex items-center gap-2' },
        el('i', { className: 'fa-solid fa-sliders' }), ' LLM Endpoint Config'
      ),
      el('div', {},
        el('label', { className: 'block text-xs font-medium text-slate-400 mb-1' }, 'Provider'),
        el('select', {
          value: state.provider,
          onChange: (e) => { state.provider = e.target.value; updateProviderDefaults(); renderApp(); },
          className: 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500'
        },
          el('option', { value: 'openai' }, 'OpenAI'),
          el('option', { value: 'anthropic' }, 'Anthropic'),
          el('option', { value: 'gemini' }, 'Google Gemini'),
          el('option', { value: 'xai' }, 'xAI (Grok)'),
          el('option', { value: 'ollama' }, 'Ollama (Local localhost:11434)'),
          el('option', { value: 'lmstudio' }, 'LM Studio (Local localhost:1234)'),
          el('option', { value: 'vllm' }, 'vLLM (Local localhost:8000)'),
          el('option', { value: 'custom' }, 'Custom Endpoint')
        )
      ),
      reqKey ? el('div', {},
        el('label', { className: 'block text-xs font-medium text-slate-400 mb-1' }, 'API Key'),
        el('input', {
          type: 'password',
          placeholder: 'sk-...',
          value: state.apiKey,
          onInput: (e) => { state.apiKey = e.target.value; },
          className: 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 code-font'
        })
      ) : null,
      el('div', {},
        el('label', { className: 'block text-xs font-medium text-slate-400 mb-1' }, 'Base URL'),
        el('input', {
          type: 'text',
          value: state.baseUrl,
          onInput: (e) => { state.baseUrl = e.target.value; },
          className: 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 code-font'
        })
      ),
      el('div', {},
        el('div', { className: 'flex items-center justify-between mb-1' },
          el('label', { className: 'block text-xs font-medium text-slate-400' }, 'Model ID'),
          el('button', {
            type: 'button',
            onClick: loadModelsFromAPI,
            className: 'text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1'
          }, el('i', { className: `fa-solid fa-rotate ${state.isFetchingModels ? 'animate-spin' : ''}` }), ' Fetch Models from API')
        ),
        state.fetchedModelsList.length > 0 ? el('select', {
          value: state.model,
          onChange: (e) => { state.model = e.target.value; renderApp(); },
          className: 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 code-font'
        },
          state.fetchedModelsList.map(m => el('option', { key: m, value: m }, m))
        ) : el('input', {
          type: 'text',
          value: state.model,
          onInput: (e) => { state.model = e.target.value; },
          className: 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 code-font'
        })
      ),
      el('div', { className: 'grid grid-cols-2 gap-3' },
        el('div', {},
          el('label', { className: 'block text-xs font-medium text-slate-400 mb-1' }, `Temperature (${state.temperature})`),
          el('input', {
            type: 'range',
            min: '0',
            max: '1.5',
            step: '0.05',
            value: state.temperature,
            onInput: (e) => { state.temperature = e.target.value; renderApp(); },
            className: 'w-full accent-sky-500'
          })
        ),
        el('div', {},
          el('label', { className: 'block text-xs font-medium text-slate-400 mb-1' }, 'Seed (Optional)'),
          el('input', {
            type: 'number',
            placeholder: 'e.g. 42',
            value: state.seed,
            onInput: (e) => { state.seed = e.target.value; },
            className: 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 code-font'
          })
        )
      ),
      el('div', { className: 'border-t border-slate-800 pt-3 space-y-3' },
        el('div', { className: 'flex items-center justify-between' },
          el('span', { className: 'text-xs font-medium text-slate-300 flex items-center gap-1.5' },
            el('i', { className: 'fa-solid fa-brain text-purple-400' }), ' Reasoning / Thinking'
          ),
          el('input', {
            type: 'checkbox',
            checked: state.enableReasoning,
            onChange: (e) => { state.enableReasoning = e.target.checked; renderApp(); },
            className: 'rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 h-4 w-4'
          })
        ),
        state.enableReasoning ? el('div', {},
          el('label', { className: 'block text-xs font-medium text-slate-400 mb-1' }, 'Reasoning Token Budget'),
          el('input', {
            type: 'number',
            min: '256',
            max: '16384',
            step: '256',
            value: state.reasoningBudget,
            onInput: (e) => { state.reasoningBudget = e.target.value; },
            className: 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 code-font'
          })
        ) : null
      ),
      el('div', { className: 'border-t border-slate-800 pt-3 space-y-3' },
        el('h3', { className: 'text-xs font-semibold text-slate-400 uppercase tracking-wider' }, 'Execution Logic'),
        el('div', { className: 'grid grid-cols-2 gap-2' },
          el('button', {
            type: 'button',
            onClick: () => { state.mode = 'batch'; renderApp(); },
            className: `py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${state.mode === 'batch' ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`
          }, 'Batch Mode (1 Prompt)'),
          el('button', {
            type: 'button',
            onClick: () => { state.mode = 'sequential'; renderApp(); },
            className: `py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${state.mode === 'sequential' ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'}`
          }, 'Sequential Mode (57 Prompts)')
        ),
        state.mode === 'sequential' ? el('div', { className: 'flex items-center justify-between text-xs text-slate-300' },
          el('span', {}, 'Keep Chat Context History'),
          el('input', {
            type: 'checkbox',
            checked: state.keepContext,
            onChange: (e) => { state.keepContext = e.target.checked; renderApp(); },
            className: 'rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 h-4 w-4'
          })
        ) : null,
        el('div', { className: 'flex items-center justify-between text-xs text-slate-300' },
          el('span', {}, 'Randomize Order (--randomize)'),
          el('input', {
            type: 'checkbox',
            checked: state.randomizeOrder,
            onChange: (e) => { state.randomizeOrder = e.target.checked; renderApp(); },
            className: 'rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 h-4 w-4'
          })
        )
      ),
      el('div', { className: 'border-t border-slate-800 pt-3' },
        el('label', { className: 'block text-xs font-medium text-slate-400 mb-1' }, 'Custom System Prompt (Optional)'),
        el('textarea', {
          rows: '2',
          placeholder: 'Defaults to standard psychological survey prompt...',
          value: state.customSystemPrompt,
          onInput: (e) => { state.customSystemPrompt = e.target.value; },
          className: 'w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500'
        })
      ),
      el('div', { className: 'pt-2' },
        !state.isRunning ? el('button', {
          onClick: startEvaluation,
          className: 'w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition'
        }, el('i', { className: 'fa-solid fa-play' }), ' Start Evaluation') : el('button', {
          onClick: stopEvaluation,
          className: 'w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition'
        }, el('i', { className: 'fa-solid fa-stop' }), ' Stop Evaluation')
      )
    );
  }

  function ExecutionDashboard() {
    return el('div', { className: 'space-y-6' },
      // Progress Bar & Token Counters
      el('div', { className: 'glass-panel p-5 rounded-2xl border border-slate-800 space-y-4' },
        el('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
          el('div', { className: 'flex items-center space-x-2' },
            el('span', { className: `w-3 h-3 rounded-full ${state.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}` }),
            el('span', { className: 'text-sm font-semibold text-slate-200' }, state.isRunning ? 'Evaluation Active' : (state.results ? 'Evaluation Finished' : 'Ready'))
          ),
          el('span', { className: 'text-xs code-font text-slate-400' }, state.progressStatus)
        ),
        el('div', { className: 'space-y-1' },
          el('div', { className: 'flex justify-between text-xs text-slate-400' },
            el('span', {}, `Items Completed: ${state.completedCount} / 57`),
            el('span', {}, `${Math.round((state.completedCount / 57) * 100)}%`)
          ),
          el('div', { className: 'w-full bg-slate-800 rounded-full h-2 overflow-hidden' },
            el('div', {
              className: 'bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-300',
              style: { width: `${(state.completedCount / 57) * 100}%` }
            })
          )
        ),
        el('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80' },
          el('div', {}, el('p', { className: 'text-[10px] uppercase font-bold text-slate-500' }, 'Input Tokens'), el('p', { className: 'text-sm font-bold code-font text-sky-400' }, state.tokenUsage.promptTokens.toLocaleString())),
          el('div', {}, el('p', { className: 'text-[10px] uppercase font-bold text-slate-500' }, 'Output Tokens'), el('p', { className: 'text-sm font-bold code-font text-indigo-400' }, state.tokenUsage.completionTokens.toLocaleString())),
          el('div', {}, el('p', { className: 'text-[10px] uppercase font-bold text-slate-500' }, 'Reasoning Tokens'), el('p', { className: 'text-sm font-bold code-font text-purple-400' }, state.tokenUsage.reasoningTokens.toLocaleString())),
          el('div', {}, el('p', { className: 'text-[10px] uppercase font-bold text-slate-500' }, 'Total Tokens'), el('p', { className: 'text-sm font-bold code-font text-slate-200' }, state.tokenUsage.totalTokens.toLocaleString()))
        )
      ),
      // Tabs Navigation & View Panel
      el('div', { className: 'glass-panel p-5 rounded-2xl border border-slate-800 space-y-6' },
        el('div', { className: 'flex border-b border-slate-800 gap-4' },
          el('button', {
            onClick: () => { state.activeTab = 'results'; renderApp(); },
            className: `pb-3 text-sm font-semibold border-b-2 transition ${state.activeTab === 'results' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`
          }, el('i', { className: 'fa-solid fa-chart-line mr-1.5' }), ' Psychometric Profile'),
          el('button', {
            onClick: () => { state.activeTab = 'items'; renderApp(); },
            className: `pb-3 text-sm font-semibold border-b-2 transition ${state.activeTab === 'items' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`
          }, el('i', { className: 'fa-solid fa-list-check mr-1.5' }), ' 57 Items & Responses'),
          el('button', {
            onClick: () => { state.activeTab = 'logs'; renderApp(); },
            className: `pb-3 text-sm font-semibold border-b-2 transition ${state.activeTab === 'logs' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`
          }, el('i', { className: 'fa-solid fa-terminal mr-1.5' }), ' Active Response Output')
        ),
        state.activeTab === 'results' ? ResultsTab() : (state.activeTab === 'items' ? ItemsTab() : LogsTab())
      )
    );
  }

  function ResultsTab() {
    if (!state.results) {
      return el('div', { className: 'text-center py-12 text-slate-500' },
        el('i', { className: 'fa-solid fa-square-poll-vertical text-4xl mb-3 text-slate-600' }),
        el('p', { className: 'text-sm' }, 'No evaluation results yet. Configure settings and click "Start Evaluation".')
      );
    }

    const psych = state.results.psychometrics;

    return el('div', { className: 'space-y-8' },
      el('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
        el('div', { className: 'bg-slate-900/60 p-4 rounded-xl border border-slate-800' },
          el('p', { className: 'text-xs text-slate-400' }, 'Total Items Answered'),
          el('p', { className: 'text-xl font-bold text-slate-100' }, `${psych.totalAnswered} / 57`)
        ),
        el('div', { className: 'bg-slate-900/60 p-4 rounded-xl border border-slate-800' },
          el('p', { className: 'text-xs text-slate-400' }, 'Grand Mean Score (MRAT)'),
          el('p', { className: 'text-xl font-bold text-sky-400' }, `${psych.mrat} `, el('span', { className: 'text-xs text-slate-500 font-normal' }, '/ 6.0'))
        ),
        el('div', { className: 'bg-slate-900/60 p-4 rounded-xl border border-slate-800' },
          el('p', { className: 'text-xs text-slate-400' }, 'Evaluation Timestamp'),
          el('p', { className: 'text-xs code-font text-slate-300 mt-1' }, new Date(state.results.metadata.timestamp).toLocaleString())
        )
      ),
      el('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
        el('div', { className: 'bg-slate-950/50 p-4 rounded-xl border border-slate-800' },
          el('h3', { className: 'text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider' }, '4 Higher-Order Value Dimensions'),
          el('div', { className: 'h-64' }, el('canvas', { id: 'higherOrderChartCanvas' }))
        ),
        el('div', { className: 'bg-slate-950/50 p-4 rounded-xl border border-slate-800' },
          el('h3', { className: 'text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider' }, '19 Refined Basic Values'),
          el('div', { className: 'h-64' }, el('canvas', { id: 'refinedChartCanvas' }))
        )
      ),
      // 4 Higher-Order Table
      el('div', { className: 'space-y-3' },
        el('h3', { className: 'text-sm font-semibold text-sky-400' }, '4 Higher-Order Value Group Aggregations'),
        el('div', { className: 'overflow-x-auto' },
          el('table', { className: 'w-full text-left text-xs border-collapse' },
            el('thead', {},
              el('tr', { className: 'border-b border-slate-800 text-slate-400' },
                el('th', { className: 'py-2 px-3' }, 'Higher-Order Dimension'),
                el('th', { className: 'py-2 px-3' }, 'Refined Sub-Values Included'),
                el('th', { className: 'py-2 px-3' }, 'Raw Mean (1-6)'),
                el('th', { className: 'py-2 px-3' }, 'Centered Score (MRAT Centering)')
              )
            ),
            el('tbody', { className: 'divide-y divide-slate-800/50' },
              Object.values(psych.higherOrderValues).map(ho =>
                el('tr', { key: ho.code, className: 'hover:bg-slate-800/30' },
                  el('td', { className: 'py-2 px-3 font-semibold text-slate-200' }, state.lang === 'pl' ? ho.namePl : ho.nameEn),
                  el('td', { className: 'py-2 px-3 text-slate-400 code-font' }, ho.refinedKeys.join(', ')),
                  el('td', { className: 'py-2 px-3 font-bold text-sky-400' }, ho.rawMean !== null ? ho.rawMean : 'N/A'),
                  el('td', { className: `py-2 px-3 font-bold ${ho.centeredMean > 0 ? 'text-emerald-400' : 'text-purple-400'}` },
                    ho.centeredMean !== null ? (ho.centeredMean > 0 ? `+${ho.centeredMean}` : ho.centeredMean) : 'N/A'
                  )
                )
              )
            )
          )
        )
      ),
      // 19 Refined Values Table
      el('div', { className: 'space-y-3' },
        el('h3', { className: 'text-sm font-semibold text-sky-400' }, '19 Refined Basic Values'),
        el('div', { className: 'overflow-x-auto' },
          el('table', { className: 'w-full text-left text-xs border-collapse' },
            el('thead', {},
              el('tr', { className: 'border-b border-slate-800 text-slate-400' },
                el('th', { className: 'py-2 px-3' }, 'Code'),
                el('th', { className: 'py-2 px-3' }, 'Refined Value'),
                el('th', { className: 'py-2 px-3' }, 'Items'),
                el('th', { className: 'py-2 px-3' }, 'Raw Mean'),
                el('th', { className: 'py-2 px-3' }, 'Centered Score')
              )
            ),
            el('tbody', { className: 'divide-y divide-slate-800/50' },
              Object.values(psych.refinedValues).map(rv =>
                el('tr', { key: rv.code, className: 'hover:bg-slate-800/30' },
                  el('td', { className: 'py-2 px-3 font-bold text-slate-400 code-font' }, rv.code),
                  el('td', { className: 'py-2 px-3 text-slate-200' }, state.lang === 'pl' ? rv.namePl : rv.nameEn),
                  el('td', { className: 'py-2 px-3 text-slate-400 code-font' }, rv.items.join(', ')),
                  el('td', { className: 'py-2 px-3 font-bold text-sky-400' }, rv.rawMean !== null ? rv.rawMean : 'N/A'),
                  el('td', { className: `py-2 px-3 font-bold ${rv.centeredMean > 0 ? 'text-emerald-400' : 'text-purple-400'}` },
                    rv.centeredMean !== null ? (rv.centeredMean > 0 ? `+${rv.centeredMean}` : rv.centeredMean) : 'N/A'
                  )
                )
              )
            )
          )
        )
      )
    );
  }

  function ItemsTab() {
    const activeRatings = state.results?.psychometrics?.itemRatings || state.liveItemRatings || {};
    const activeRawResponses = state.results?.rawResponses || state.liveRawResponses || {};
    const activeReasoningTraces = state.results?.reasoningTraces || state.liveReasoningTraces || {};

    return el('div', { className: 'space-y-4' },
      el('div', { className: 'overflow-x-auto' },
        el('table', { className: 'w-full text-left text-xs border-collapse' },
          el('thead', {},
            el('tr', { className: 'border-b border-slate-800 text-slate-400' },
              el('th', { className: 'py-2 px-3 w-12' }, '#'),
              el('th', { className: 'py-2 px-3' }, 'Item Description'),
              el('th', { className: 'py-2 px-3 w-28' }, 'Refined Value'),
              el('th', { className: 'py-2 px-3 w-20' }, 'Score'),
              el('th', { className: 'py-2 px-3 w-28' }, 'CoT Trace')
            )
          ),
          el('tbody', { className: 'divide-y divide-slate-800/50' },
            window.PVQData.ITEMS.map(item => {
              const score = activeRatings[item.id];
              const reasoning = activeReasoningTraces[item.id];
              const rawResponse = activeRawResponses[item.id];

              return el('tr', { key: item.id, className: 'hover:bg-slate-800/30' },
                el('td', { className: 'py-2 px-3 font-bold text-slate-400 code-font' }, item.id),
                el('td', { className: 'py-2 px-3 text-slate-200' }, state.lang === 'pl' ? item.pl : item.en),
                el('td', { className: 'py-2 px-3 text-sky-400 code-font' }, item.valueKey),
                el('td', { className: 'py-2 px-3' },
                  score !== undefined && score !== null ? el('span', { className: 'px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold code-font' }, score) : (
                    rawResponse ? el('span', { className: 'px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-medium text-[10px]' }, 'Refused / N/A') : el('span', { className: 'text-slate-600 text-[10px]' }, 'Pending')
                  )
                ),
                el('td', { className: 'py-2 px-3' },
                  reasoning ? el('button', {
                    onClick: () => { state.selectedCoTItem = { id: item.id, reasoning, rawResponse }; renderApp(); },
                    className: 'text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1'
                  }, el('i', { className: 'fa-solid fa-brain' }), ' View CoT') : el('span', { className: 'text-slate-600 text-[10px]' }, 'None')
                )
              );
            })
          )
        )
      )
    );
  }

  function LogsTab() {
    return el('div', { className: 'space-y-4' },
      state.activeItemPrompt ? el('div', {},
        el('h4', { className: 'text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider' }, 'Active Prompt'),
        el('pre', { className: 'bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-sky-300 code-font whitespace-pre-wrap max-h-40 overflow-y-auto' }, state.activeItemPrompt)
      ) : null,
      state.activeReasoningTrace ? el('div', {},
        el('h4', { className: 'text-xs font-semibold text-purple-400 mb-1 uppercase tracking-wider flex items-center gap-1.5' }, el('i', { className: 'fa-solid fa-brain' }), ' Active Chain-of-Thought / Reasoning Output'),
        el('pre', { className: 'bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-purple-300 code-font whitespace-pre-wrap max-h-48 overflow-y-auto' }, state.activeReasoningTrace)
      ) : null,
      state.activeItemResponse ? el('div', {},
        el('h4', { className: 'text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider' }, 'Raw LLM Output'),
        el('pre', { className: 'bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-emerald-300 code-font whitespace-pre-wrap max-h-48 overflow-y-auto' }, state.activeItemResponse)
      ) : null,
      el('div', {},
        el('h4', { className: 'text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider' }, 'Stream Events Log'),
        el('div', { className: 'bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs code-font text-slate-400 space-y-1 max-h-48 overflow-y-auto' },
          state.liveStreamLogs.length === 0 ? el('p', { className: 'text-slate-600' }, 'No events logged yet.') : state.liveStreamLogs.map((log, i) => el('div', { key: i }, log))
        )
      )
    );
  }

  function selectedCoTModal() {
    if (!state.selectedCoTItem) return null;

    return el('div', { className: 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4' },
      el('div', { className: 'glass-panel bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl' },
        el('div', { className: 'flex items-center justify-between border-b border-slate-800 pb-3' },
          el('h3', { className: 'text-base font-bold text-purple-400 flex items-center gap-2' }, el('i', { className: 'fa-solid fa-brain' }), ` Reasoning Trace for Item #${state.selectedCoTItem.id}`),
          el('button', {
            onClick: () => { state.selectedCoTItem = null; renderApp(); },
            className: 'text-slate-400 hover:text-slate-200 text-lg'
          }, el('i', { className: 'fa-solid fa-xmark' }))
        ),
        el('div', { className: 'space-y-3' },
          el('div', {},
            el('h4', { className: 'text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1' }, 'Extracted Chain-of-Thought'),
            el('pre', { className: 'bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-purple-300 code-font whitespace-pre-wrap max-h-60 overflow-y-auto' }, state.selectedCoTItem.reasoning)
          ),
          state.selectedCoTItem.rawResponse ? el('div', {},
            el('h4', { className: 'text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1' }, 'Final Answer Text'),
            el('pre', { className: 'bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 code-font whitespace-pre-wrap max-h-40 overflow-y-auto' }, state.selectedCoTItem.rawResponse)
          ) : null
        ),
        el('div', { className: 'pt-2 text-right' },
          el('button', {
            onClick: () => { state.selectedCoTItem = null; renderApp(); },
            className: 'bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg transition'
          }, 'Close')
        )
      )
    );
  }

  // Initial setup on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    renderApp();
  });

})();
