import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface ConsoleLogProps {
  logs: LogEntry[];
}

const ConsoleLog: React.FC<ConsoleLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-black rounded-lg border border-gray-800 p-4 h-48 overflow-y-auto font-mono text-xs shadow-inner">
      {logs.length === 0 && <span className="text-gray-600 italic">系統就緒。等待初始化...</span>}
      {logs.map((log, index) => (
        <div key={index} className="mb-1">
          <span className="text-gray-500">[{log.timestamp}]</span>{' '}
          <span className={`
            ${log.type === 'error' ? 'text-red-400' : ''}
            ${log.type === 'success' ? 'text-green-400' : ''}
            ${log.type === 'info' ? 'text-blue-300' : ''}
          `}>
            {log.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ConsoleLog;