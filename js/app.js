/**
 * Axioma React Single-Page Application
 * Renders Configuration Panel, Live Progress UI, Token Counters,
 * Refined & Higher-Order Psychometric Results Tables and Interactive Charts,
 * CoT / Reasoning Trace Modal, and Export Tools.
 */

const { useState, useEffect, useRef } = React;

function App() {
  // Configuration State
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [seed, setSeed] = useState('');
  const [lang, setLang] = useState('en');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [mode, setMode] = useState('batch'); // 'batch' | 'sequential'
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [keepContext, setKeepContext] = useState(false);
  const [enableReasoning, setEnableReasoning] = useState(false);
  const [reasoningBudget, setReasoningBudget] = useState(1024);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [tokenUsage, setTokenUsage] = useState({ promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 });
  const [liveStreamLogs, setLiveStreamLogs] = useState([]);
  const [activeItemPrompt, setActiveItemPrompt] = useState('');
  const [activeItemResponse, setActiveItemResponse] = useState('');
  const [activeReasoningTrace, setActiveReasoningTrace] = useState('');

  // Results State
  const [results, setResults] = useState(null);
  const [selectedCoTItem, setSelectedCoTItem] = useState(null);
  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'items' | 'logs'

  const engineRef = useRef(null);
  const refinedChartRef = useRef(null);
  const higherOrderChartRef = useRef(null);
  const refinedChartInstance = useRef(null);
  const higherOrderChartInstance = useRef(null);

  // Provider change handler
  useEffect(() => {
    const defaults = window.ApiClient?.PROVIDER_DEFAULTS?.[provider];
    if (defaults) {
      setBaseUrl(defaults.baseUrl);
      setModel(defaults.defaultModel);
    }
  }, [provider]);

  // Update Charts when results change
  useEffect(() => {
    if (!results || !results.psychometrics) return;

    const psych = results.psychometrics;

    // Render 19 Refined Values Chart
    if (refinedChartRef.current) {
      if (refinedChartInstance.current) {
        refinedChartInstance.current.destroy();
      }

      const refLabels = Object.values(psych.refinedValues).map(v => lang === 'pl' ? v.namePl : v.nameEn);
      const rawScores = Object.values(psych.refinedValues).map(v => v.rawMean ?? 0);
      const centeredScores = Object.values(psych.refinedValues).map(v => v.centeredMean ?? 0);

      const ctx = refinedChartRef.current.getContext('2d');
      refinedChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: refLabels,
          datasets: [
            {
              label: lang === 'pl' ? 'Średnia surowa (1-6)' : 'Raw Mean (1-6)',
              data: rawScores,
              backgroundColor: 'rgba(56, 189, 248, 0.7)',
              borderColor: '#38bdf8',
              borderWidth: 1
            },
            {
              label: lang === 'pl' ? 'Wynik wycentrowany (Średnia Schwarza)' : 'Centered Score (Grand Mean)',
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
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              ticks: { color: '#94a3b8' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { size: 10 } }
            }
          },
          plugins: {
            legend: { labels: { color: '#f8fafc' } }
          }
        }
      });
    }

    // Render 4 Higher-Order Values Radar / Bar Chart
    if (higherOrderChartRef.current) {
      if (higherOrderChartInstance.current) {
        higherOrderChartInstance.current.destroy();
      }

      const hoLabels = Object.values(psych.higherOrderValues).map(v => lang === 'pl' ? v.namePl : v.nameEn);
      const hoRaw = Object.values(psych.higherOrderValues).map(v => v.rawMean ?? 0);
      const hoCentered = Object.values(psych.higherOrderValues).map(v => v.centeredMean ?? 0);

      const ctxHO = higherOrderChartRef.current.getContext('2d');
      higherOrderChartInstance.current = new Chart(ctxHO, {
        type: 'radar',
        data: {
          labels: hoLabels,
          datasets: [
            {
              label: lang === 'pl' ? 'Średnia surowa' : 'Raw Mean',
              data: hoRaw,
              backgroundColor: 'rgba(14, 165, 233, 0.2)',
              borderColor: '#0ea5e9',
              pointBackgroundColor: '#0ea5e9'
            },
            {
              label: lang === 'pl' ? 'Wynik wycentrowany' : 'Centered Score',
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
          plugins: {
            legend: { labels: { color: '#f8fafc' } }
          }
        }
      });
    }

  }, [results, lang]);

  // Start Evaluation Execution
  const startEvaluation = async () => {
    setIsRunning(true);
    setResults(null);
    setLiveStreamLogs([]);
    setCompletedCount(0);
    setTokenUsage({ promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 });

    const config = {
      provider,
      apiKey,
      baseUrl,
      model,
      temperature: parseFloat(temperature),
      seed: seed ? parseInt(seed, 10) : undefined,
      lang,
      customSystemPrompt,
      mode,
      randomizeOrder,
      keepContext,
      enableReasoning,
      reasoningBudget: parseInt(reasoningBudget, 10)
    };

    const pvqData = window.PVQData;
    const psychometrics = window.Psychometrics;
    const apiClient = window.ApiClient;
    const engine = new window.ExecutionEngine.EvaluatorEngine(config, pvqData, psychometrics, apiClient);
    engineRef.current = engine;

    try {
      const runResult = await engine.run((event) => {
        setProgressStatus(event.statusMessage);
        if (event.completedCount !== undefined) setCompletedCount(event.completedCount);
        if (event.tokenUsage) setTokenUsage(event.tokenUsage);
        if (event.currentPrompt) setActiveItemPrompt(event.currentPrompt);
        if (event.lastResponse) setActiveItemResponse(event.lastResponse);
        if (event.lastReasoning) setActiveReasoningTrace(event.lastReasoning);

        if (event.type === 'item_complete' || event.type === 'batch_complete') {
          setLiveStreamLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ${event.statusMessage}`
          ]);
        }
      });

      setResults(runResult);
      setProgressStatus('Evaluation completed successfully!');
    } catch (err) {
      setProgressStatus(`Error: ${err.message}`);
      setLiveStreamLogs(prev => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const stopEvaluation = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      setProgressStatus('Stopping evaluation...');
    }
  };

  const exportJSON = () => {
    if (!results) return;
    window.DataExporter.exportToJSON(results, `Axioma_PVQ_RR_${model}_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const exportTSV = () => {
    if (!results) return;
    window.DataExporter.exportToTSV(results, `Axioma_PVQ_RR_${model}_${new Date().toISOString().slice(0, 10)}.tsv`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-sky-500/20">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-300">
                Axioma
              </h1>
              <p className="text-xs text-slate-400">LLM Psychometric Evaluation via Schwartz PVQ-RR (57 items)</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="en">English (EN)</option>
              <option value="pl">Polski (PL)</option>
            </select>

            {results && (
              <div className="flex space-x-2">
                <button
                  onClick={exportJSON}
                  className="bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <i className="fa-solid fa-download"></i> JSON
                </button>
                <button
                  onClick={exportTSV}
                  className="bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <i className="fa-solid fa-file-csv"></i> TSV
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-semibold text-sky-400 flex items-center gap-2">
              <i className="fa-solid fa-sliders"></i> LLM Endpoint Config
            </h2>

            {/* Provider Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
                <option value="xai">xAI (Grok)</option>
                <option value="ollama">Ollama (Local localhost:11434)</option>
                <option value="lmstudio">LM Studio (Local localhost:1234)</option>
                <option value="vllm">vLLM (Local localhost:8000)</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>

            {/* API Key */}
            {window.ApiClient?.PROVIDER_DEFAULTS?.[provider]?.requiresApiKey && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 code-font"
                />
              </div>
            )}

            {/* Base URL */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 code-font"
              />
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Model ID</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 code-font"
              />
            </div>

            {/* Temperature & Seed */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Temperature ({temperature})</label>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full accent-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Seed (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 42"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 code-font"
                />
              </div>
            </div>

            {/* Reasoning / Thinking Toggle */}
            <div className="border-t border-slate-800 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <i className="fa-solid fa-brain text-purple-400"></i> Reasoning / Thinking
                </span>
                <input
                  type="checkbox"
                  checked={enableReasoning}
                  onChange={(e) => setEnableReasoning(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 h-4 w-4"
                />
              </div>

              {enableReasoning && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Reasoning Token Budget</label>
                  <input
                    type="number"
                    min="256"
                    max="16384"
                    step="256"
                    value={reasoningBudget}
                    onChange={(e) => setReasoningBudget(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 code-font"
                  />
                </div>
              )}
            </div>

            {/* Execution Modes & Logic */}
            <div className="border-t border-slate-800 pt-3 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Execution Logic</h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('batch')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
                    mode === 'batch'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Batch Mode (1 Prompt)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('sequential')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
                    mode === 'sequential'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sequential Mode (57 Prompts)
                </button>
              </div>

              {mode === 'sequential' && (
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Keep Chat Context History</span>
                  <input
                    type="checkbox"
                    checked={keepContext}
                    onChange={(e) => setKeepContext(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 h-4 w-4"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Randomize Order (<code className="text-sky-400">--randomize</code>)</span>
                <input
                  type="checkbox"
                  checked={randomizeOrder}
                  onChange={(e) => setRandomizeOrder(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 h-4 w-4"
                />
              </div>
            </div>

            {/* Custom System Prompt */}
            <div className="border-t border-slate-800 pt-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">Custom System Prompt (Optional)</label>
              <textarea
                rows="2"
                placeholder="Defaults to standard psychological survey prompt..."
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Run / Stop Actions */}
            <div className="pt-2">
              {!isRunning ? (
                <button
                  onClick={startEvaluation}
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition"
                >
                  <i className="fa-solid fa-play"></i> Start Evaluation
                </button>
              ) : (
                <button
                  onClick={stopEvaluation}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition"
                >
                  <i className="fa-solid fa-stop"></i> Stop Evaluation
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Monitor & Psychometric Results */}
        <div className="lg:col-span-8 space-y-6">
          {/* Live Progress / Token Bar */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                <span className="text-sm font-semibold text-slate-200">
                  {isRunning ? 'Evaluation Active' : (results ? 'Evaluation Finished' : 'Ready')}
                </span>
              </div>
              <span className="text-xs code-font text-slate-400">{progressStatus}</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Items Completed: {completedCount} / 57</span>
                <span>{Math.round((completedCount / 57) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${(completedCount / 57) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Token Consumption Counter */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Input Tokens</p>
                <p className="text-sm font-bold code-font text-sky-400">{tokenUsage.promptTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Output Tokens</p>
                <p className="text-sm font-bold code-font text-indigo-400">{tokenUsage.completionTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Reasoning Tokens</p>
                <p className="text-sm font-bold code-font text-purple-400">{tokenUsage.reasoningTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Total Tokens</p>
                <p className="text-sm font-bold code-font text-slate-200">{tokenUsage.totalTokens.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Results / Items / Stream Log Tabs */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex border-b border-slate-800 gap-4">
              <button
                onClick={() => setActiveTab('results')}
                className={`pb-3 text-sm font-semibold border-b-2 transition ${
                  activeTab === 'results' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <i className="fa-solid fa-chart-line mr-1.5"></i> Psychometric Profile
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`pb-3 text-sm font-semibold border-b-2 transition ${
                  activeTab === 'items' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <i className="fa-solid fa-list-check mr-1.5"></i> 57 Items & Responses
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`pb-3 text-sm font-semibold border-b-2 transition ${
                  activeTab === 'logs' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <i className="fa-solid fa-terminal mr-1.5"></i> Active Response Output
              </button>
            </div>

            {/* TAB 1: PSYCHOMETRIC RESULTS */}
            {activeTab === 'results' && (
              <div className="space-y-8">
                {!results ? (
                  <div className="text-center py-12 text-slate-500">
                    <i className="fa-solid fa-square-poll-vertical text-4xl mb-3 text-slate-600"></i>
                    <p className="text-sm">No evaluation results yet. Configure settings and click "Start Evaluation".</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <p className="text-xs text-slate-400">Total Items Answered</p>
                        <p className="text-xl font-bold text-slate-100">{results.psychometrics.totalAnswered} / 57</p>
                      </div>
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <p className="text-xs text-slate-400">Grand Mean Score (MRAT)</p>
                        <p className="text-xl font-bold text-sky-400">{results.psychometrics.mrat} <span className="text-xs text-slate-500 font-normal">/ 6.0</span></p>
                      </div>
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <p className="text-xs text-slate-400">Evaluation Timestamp</p>
                        <p className="text-xs code-font text-slate-300 mt-1">{new Date(results.metadata.timestamp).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Visual Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                        <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">4 Higher-Order Value Dimensions</h3>
                        <div className="h-64">
                          <canvas ref={higherOrderChartRef}></canvas>
                        </div>
                      </div>
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                        <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">19 Refined Basic Values</h3>
                        <div className="h-64">
                          <canvas ref={refinedChartRef}></canvas>
                        </div>
                      </div>
                    </div>

                    {/* 4 Higher-Order Table */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-sky-400">4 Higher-Order Value Group Aggregations</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="py-2 px-3">Higher-Order Dimension</th>
                              <th className="py-2 px-3">Refined Sub-Values Included</th>
                              <th className="py-2 px-3">Raw Mean (1-6)</th>
                              <th className="py-2 px-3">Centered Score (MRAT Centering)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {Object.values(results.psychometrics.higherOrderValues).map(ho => (
                              <tr key={ho.code} className="hover:bg-slate-800/30">
                                <td className="py-2 px-3 font-semibold text-slate-200">
                                  {lang === 'pl' ? ho.namePl : ho.nameEn}
                                </td>
                                <td className="py-2 px-3 text-slate-400 code-font">
                                  {ho.refinedKeys.join(', ')}
                                </td>
                                <td className="py-2 px-3 font-bold text-sky-400">
                                  {ho.rawMean !== null ? ho.rawMean : 'N/A'}
                                </td>
                                <td className={`py-2 px-3 font-bold ${ho.centeredMean > 0 ? 'text-emerald-400' : 'text-purple-400'}`}>
                                  {ho.centeredMean !== null ? (ho.centeredMean > 0 ? `+${ho.centeredMean}` : ho.centeredMean) : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 19 Refined Values Table */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-sky-400">19 Refined Basic Values</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="py-2 px-3">Code</th>
                              <th className="py-2 px-3">Refined Value</th>
                              <th className="py-2 px-3">Items</th>
                              <th className="py-2 px-3">Raw Mean</th>
                              <th className="py-2 px-3">Centered Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {Object.values(results.psychometrics.refinedValues).map(rv => (
                              <tr key={rv.code} className="hover:bg-slate-800/30">
                                <td className="py-2 px-3 font-bold text-slate-400 code-font">{rv.code}</td>
                                <td className="py-2 px-3 text-slate-200">{lang === 'pl' ? rv.namePl : rv.nameEn}</td>
                                <td className="py-2 px-3 text-slate-400 code-font">{rv.items.join(', ')}</td>
                                <td className="py-2 px-3 font-bold text-sky-400">{rv.rawMean !== null ? rv.rawMean : 'N/A'}</td>
                                <td className={`py-2 px-3 font-bold ${rv.centeredMean > 0 ? 'text-emerald-400' : 'text-purple-400'}`}>
                                  {rv.centeredMean !== null ? (rv.centeredMean > 0 ? `+${rv.centeredMean}` : rv.centeredMean) : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: 57 ITEMS LIST */}
            {activeTab === 'items' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3 w-12">#</th>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3 w-28">Refined Value</th>
                        <th className="py-2 px-3 w-20">Score</th>
                        <th className="py-2 px-3 w-28 font-center">CoT Trace</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {window.PVQData.ITEMS.map(item => {
                        const score = results?.psychometrics?.itemRatings?.[item.id];
                        const reasoning = results?.reasoningTraces?.[item.id];
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-bold text-slate-400 code-font">{item.id}</td>
                            <td className="py-2 px-3 text-slate-200">{lang === 'pl' ? item.pl : item.en}</td>
                            <td className="py-2 px-3 text-sky-400 code-font">{item.valueKey}</td>
                            <td className="py-2 px-3">
                              {score !== undefined && score !== null ? (
                                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold code-font">{score}</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-medium text-[10px]">Refused / N/A</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {reasoning ? (
                                <button
                                  onClick={() => setSelectedCoTItem({ id: item.id, reasoning, rawResponse: results?.rawResponses?.[item.id] })}
                                  className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                                >
                                  <i className="fa-solid fa-brain"></i> View CoT
                                </button>
                              ) : (
                                <span className="text-slate-600 text-[10px]">None</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: STREAM OUTPUT & LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                {activeItemPrompt && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Active Prompt</h4>
                    <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-sky-300 code-font whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {activeItemPrompt}
                    </pre>
                  </div>
                )}

                {activeReasoningTrace && (
                  <div>
                    <h4 className="text-xs font-semibold text-purple-400 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-brain"></i> Active Chain-of-Thought / Reasoning Output
                    </h4>
                    <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-purple-300 code-font whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {activeReasoningTrace}
                    </pre>
                  </div>
                )}

                {activeItemResponse && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Raw LLM Output</h4>
                    <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-emerald-300 code-font whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {activeItemResponse}
                    </pre>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Stream Events Log</h4>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs code-font text-slate-400 space-y-1 max-h-48 overflow-y-auto">
                    {liveStreamLogs.length === 0 ? (
                      <p className="text-slate-600">No events logged yet.</p>
                    ) : (
                      liveStreamLogs.map((log, i) => <div key={i}>{log}</div>)
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CoT Reasoning Trace Modal */}
      {selectedCoTItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
                <i className="fa-solid fa-brain"></i> Reasoning Trace for Item #{selectedCoTItem.id}
              </h3>
              <button
                onClick={() => setSelectedCoTItem(null)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Extracted Chain-of-Thought</h4>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-purple-300 code-font whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedCoTItem.reasoning}
                </pre>
              </div>

              {selectedCoTItem.rawResponse && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Final Answer Text</h4>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 code-font whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedCoTItem.rawResponse}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedCoTItem(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
