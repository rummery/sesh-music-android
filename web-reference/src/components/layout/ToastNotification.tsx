import React from 'react';
import { WifiOff, Wifi, AlertTriangle, CheckCircle2, Info, X, ArrowDownToLine } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const ToastNotification: React.FC = () => {
  const { toast, hideToast } = useMusic();

  if (!toast) return null;

  const durationMs = toast.durationMs || 5000;

  const renderIcon = () => {
    switch (toast.type) {
      case 'warning':
        return <WifiOff className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#1ed760] shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-sky-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'warning':
        return 'border-amber-500/40 shadow-amber-950/40';
      case 'error':
        return 'border-rose-500/40 shadow-rose-950/40';
      case 'success':
        return 'border-[#1ed760]/40 shadow-emerald-950/40';
      case 'info':
      default:
        return 'border-zinc-700 shadow-black/60';
    }
  };

  const getProgressBarColor = () => {
    switch (toast.type) {
      case 'warning':
        return 'bg-amber-400';
      case 'success':
        return 'bg-[#1ed760]';
      case 'error':
        return 'bg-rose-500';
      case 'info':
      default:
        return 'bg-sky-400';
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed z-50 bottom-24 md:bottom-28 left-4 right-4 md:left-auto md:right-8 md:max-w-md pointer-events-auto transition-all transform duration-300 ease-out"
    >
      <style>{`
        @keyframes seshToastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div
        className={`bg-zinc-900/95 backdrop-blur-xl border ${getBorderColor()} rounded-xl p-4 shadow-2xl flex flex-col gap-3 relative overflow-hidden`}
      >
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 p-1.5 rounded-lg bg-black/40 border border-white/5">
              {renderIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white tracking-tight leading-tight">
                {toast.title}
              </h4>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>
          </div>

          <button
            onClick={() => hideToast()}
            className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons Row */}
        {toast.actions && toast.actions.length > 0 && (
          <div className="flex items-center gap-2 pt-1 pl-11 flex-wrap">
            {toast.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  action.onClick();
                  hideToast();
                }}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow ${
                  action.primary
                    ? 'bg-[#1ed760] hover:bg-[#1fdf63] text-black font-bold hover:scale-[1.02] active:scale-95'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:text-white active:scale-95'
                }`}
              >
                {action.primary && <ArrowDownToLine className="w-3.5 h-3.5" />}
                {!action.primary && action.label.toLowerCase().includes('online') && (
                  <Wifi className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Auto-dismiss subtle progress line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800 overflow-hidden">
          <div
            key={toast.id}
            className={`h-full ${getProgressBarColor()}`}
            style={{
              animation: `seshToastProgress ${durationMs}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
