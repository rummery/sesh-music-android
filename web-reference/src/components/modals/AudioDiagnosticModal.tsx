import React from 'react';
import {
  X,
  Activity,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
  Info,
  ShieldCheck,
  Server,
  RefreshCw,
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const AudioDiagnosticModal: React.FC = () => {
  const {
    audioDiagnostics,
    playDiagnosticTestTone,
    resumeAudioContext,
    isDiagnosticOpen,
    setIsDiagnosticOpen,
    currentTrack,
    playTrack,
    allTracks,
  } = useMusic();

  if (!isDiagnosticOpen) return null;

  const isContextRunning = audioDiagnostics.audioContextState === 'running';

  const handleFixSound = async () => {
    await resumeAudioContext();
    playDiagnosticTestTone();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#1e1e1e] border border-zinc-800 rounded-2xl p-6 text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1ed760]/10 flex items-center justify-center text-[#1ed760] border border-[#1ed760]/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Audio & Playback Diagnostics</h3>
              <p className="text-xs text-zinc-400">Chrome, Edge, and Subsonic audio pipeline monitor</p>
            </div>
          </div>

          <button
            onClick={() => setIsDiagnosticOpen(false)}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Audio Context & Autoplay State */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1ed760]" />
              Browser Audio Permission (Edge / Chrome)
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isContextRunning
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {isContextRunning ? 'Audio Active & Unlocked' : 'Autoplay Needs Gesture'}
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Chrome and Microsoft Edge enforce a strict Autoplay Security Policy requiring a user click before audio output is permitted.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleFixSound}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1ed760] hover:bg-[#1ed760]/90 text-black text-xs font-bold transition-all shadow hover:scale-105 active:scale-95"
            >
              <Volume2 className="w-4 h-4 fill-black" />
              <span>Unlock Audio & Play Test Chime</span>
            </button>

            {allTracks.length > 0 && (
              <button
                onClick={() => playTrack(allTracks[0])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-[#1ed760]" />
                <span>Play Track 1 with Synth Fallback</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Pipeline Status */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 text-xs">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
            Audio Stream Telemetry
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-800/60 rounded-lg space-y-1">
              <span className="text-zinc-400 block text-[11px]">Active Audio Engine</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#1ed760]" />
                {audioDiagnostics.pipelineMode === 'Procedural_Synthesizer'
                  ? 'Procedural Synth (Zero CORS)'
                  : audioDiagnostics.pipelineMode === 'WebAudio_Gapless'
                  ? 'Web Audio Gapless Deck'
                  : 'Direct HTML5 Audio'}
              </span>
            </div>

            <div className="p-3 bg-zinc-800/60 rounded-lg space-y-1">
              <span className="text-zinc-400 block text-[11px]">AudioContext State</span>
              <span className="font-mono text-white font-semibold capitalize">
                {audioDiagnostics.audioContextState}
              </span>
            </div>
          </div>

          {currentTrack && (
            <div className="p-3 bg-zinc-800/40 rounded-lg space-y-1 border border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Target Track</span>
              <p className="font-semibold text-white truncate">{currentTrack.title} — {currentTrack.artist}</p>
              <p className="text-[10px] text-zinc-500 font-mono truncate">
                {audioDiagnostics.streamUrl || currentTrack.streamUrl}
              </p>
            </div>
          )}

          {audioDiagnostics.lastError && (
            <div className="p-3 bg-rose-950/60 border border-rose-900/80 rounded-lg text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Browser Audio Error Detected:</span>
                <span className="text-[11px] opacity-90">{audioDiagnostics.lastError}</span>
              </div>
            </div>
          )}
        </div>

        {/* Diagnosis & Common Solutions */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2.5 text-xs text-zinc-400">
          <span className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <Info className="w-4 h-4 text-[#1ed760]" />
            Why Audio Might Have Failed in Chrome or Edge:
          </span>

          <ul className="space-y-1.5 list-disc list-inside text-[11px] leading-relaxed">
            <li>
              <strong className="text-zinc-300">ISP Firewall & Archive.org Blocks Bypassed:</strong> External hosts like Archive.org or SoundHelix are frequently filtered by ISP firewalls or regional content filters. We have completely eliminated external third-party audio URLs for the demo library.
            </li>
            <li>
              <strong className="text-zinc-300">100% In-Browser Procedural Audio Synthesis:</strong> All demo tracks now synthesize authentic stereo WAV tracks in real-time inside your browser using the Web Audio API. They require zero external network requests and bypass all ISP blocks.
            </li>
            <li>
              <strong className="text-zinc-300">Autoplay Security Policy:</strong> Click any play button or the "Unlock Audio" button above to give your browser permission to emit sound.
            </li>
            <li>
              <strong className="text-zinc-300">Your Personal Subsonic Server:</strong> When you connect your Subsonic, Navidrome, or LMS server, the app connects directly to your private server URL for seamless streaming.
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            onClick={() => setIsDiagnosticOpen(false)}
            className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
