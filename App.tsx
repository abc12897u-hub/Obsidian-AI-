import React, { useState, useEffect, useCallback } from 'react';
import { AppStatus, GitHubConfig, LogEntry, NewsSummary } from './types';
import { generateDailyBriefing } from './services/geminiService';
import { syncToGitHub } from './services/githubService';
import SettingsModal from './components/SettingsModal';
import ConsoleLog from './components/ConsoleLog';

const App: React.FC = () => {
  // State
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<NewsSummary | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings State (Persisted in LocalStorage)
  const [ghConfig, setGhConfig] = useState<GitHubConfig>(() => {
    const saved = localStorage.getItem('obsidian_ai_gh_config');
    return saved ? JSON.parse(saved) : { owner: '', repo: '', path: '', token: '' };
  });

  // Helper to add logs
  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    setLogs(prev => [...prev, { timestamp, message, type }]);
  }, []);

  // Save config when it changes
  useEffect(() => {
    localStorage.setItem('obsidian_ai_gh_config', JSON.stringify(ghConfig));
  }, [ghConfig]);

  // Main Action: Generate Briefing
  const handleGenerate = async () => {
    setStatus(AppStatus.GENERATING);
    addLog('正在初始化 Gemini 3.0...', 'info');
    addLog('正在透過 Google 搜尋獲取全球新聞與股市數據...', 'info');

    try {
      const result = await generateDailyBriefing();
      setSummary(result);
      addLog('每日簡報生成成功。', 'success');
      setStatus(AppStatus.SUCCESS);
      
      // Auto-sync if configured
      if (ghConfig.token && ghConfig.repo) {
        handleSync(result);
      } else {
        addLog('GitHub 同步已跳過。請至設定開啟自動同步。', 'info');
      }

    } catch (error: any) {
      addLog(`生成簡報時發生錯誤: ${error.message}`, 'error');
      setStatus(AppStatus.ERROR);
    }
  };

  // Action: Sync to GitHub
  const handleSync = async (data: NewsSummary | null) => {
    if (!data) return;
    
    setStatus(AppStatus.SYNCING);
    addLog('正在同步至 Obsidian Vault (GitHub)...', 'info');

    try {
      const filename = `${data.date}-daily-briefing.md`;
      const url = await syncToGitHub(ghConfig, filename, data.content);
      addLog(`成功同步至 ${ghConfig.owner}/${ghConfig.repo}`, 'success');
      addLog(`檔案已建立: ${filename}`, 'info');
      setStatus(AppStatus.SYNC_SUCCESS);
    } catch (error: any) {
      addLog(`同步失敗: ${error.message}`, 'error');
      setStatus(AppStatus.ERROR); // Keep error state visible
    }
  };

  // Copy to Clipboard
  const copyToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary.content);
      addLog('Markdown 已複製到剪貼簿。', 'success');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 md:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <i className="fas fa-brain text-2xl text-white"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              Obsidian AI 新聞同步
            </h1>
            <p className="text-sm text-gray-400">由 Gemini 3.0 與 Google 搜尋驅動</p>
          </div>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="text-gray-400 hover:text-white transition-colors p-2"
        >
          <i className="fas fa-cog text-xl"></i>
        </button>
      </header>

      {/* Main Controls */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Control Card */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">自動化控制</h2>
            
            <button
              onClick={handleGenerate}
              disabled={status === AppStatus.GENERATING || status === AppStatus.SYNCING}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg 
                ${status === AppStatus.GENERATING 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-500/20'
                }`}
            >
              {status === AppStatus.GENERATING ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> 處理中...
                </>
              ) : (
                <>
                  <i className="fas fa-play"></i> 執行每日同步
                </>
              )}
            </button>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <i className="fas fa-info-circle"></i>
              <span>手動執行或透過網址觸發</span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
             <h2 className="text-lg font-semibold text-white mb-4">狀態日誌</h2>
             <ConsoleLog logs={logs} />
          </div>
        </div>

        {/* Content Preview */}
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl min-h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">
              <i className="fab fa-markdown text-yellow-500 mr-2"></i> 
              每日簡報預覽
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={copyToClipboard}
                disabled={!summary}
                className="text-sm px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors disabled:opacity-50"
              >
                <i className="fas fa-copy mr-1"></i> 複製
              </button>
              {summary && (status === AppStatus.SUCCESS || status === AppStatus.SYNC_SUCCESS) && (
                 <button 
                 onClick={() => handleSync(summary)}
                 className="text-sm px-3 py-1 bg-green-900/50 hover:bg-green-900 text-green-400 border border-green-800 rounded transition-colors"
               >
                 <i className="fas fa-sync mr-1"></i> 重試同步
               </button>
              )}
            </div>
          </div>

          {summary ? (
            <div className="flex-1 overflow-y-auto pr-2">
              <article className="markdown-body prose prose-invert prose-sm max-w-none">
                 <div className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
                   {summary.content}
                 </div>
              </article>
              
              {/* Sources Section */}
              {summary.sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-800">
                  <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">已驗證來源</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {summary.sources.map((source, idx) => (
                      <a 
                        key={idx} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 truncate block p-2 bg-gray-950 rounded border border-gray-800 hover:border-blue-900 transition-all"
                      >
                        <i className="fas fa-external-link-alt mr-2 opacity-50"></i>
                        {source.title || source.uri}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
              <i className="fas fa-newspaper text-6xl mb-4 opacity-20"></i>
              <p>尚未生成簡報。</p>
              <p className="text-sm">點擊「執行每日同步」開始。</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-gray-600 text-sm border-t border-gray-800 pt-6">
        <p>本應用程式不會在伺服器上儲存資料。GitHub Token 僅儲存於您的瀏覽器中。</p>
      </footer>

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={(newConfig) => {
          setGhConfig(newConfig);
          addLog('設定已更新。', 'info');
        }}
        initialConfig={ghConfig}
      />
    </div>
  );
};

export default App;