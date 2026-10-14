import React from 'react';
import { X, Sliders, Volume2, Zap, Check } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

const PRESETS: Record<string, { [f: number]: number }> = {
  Flat: { 60: 0, 230: 0, 910: 0, 3600: 0, 14000: 0 },
  'Bass Boost': { 60: 7, 230: 4, 910: 0, 3600: 1, 14000: 2 },
  Electronic: { 60: 5, 230: 3, 910: -1, 3600: 3, 14000: 5 },
  Acoustic: { 60: 3, 230: 2, 910: 1, 3600: 3, 14000: 4 },
  'Vocal Booster': { 60: -2, 230: 1, 910: 4, 3600: 4, 14000: 1 },
  Rock: { 60: 4, 230: 2, 910: -1, 3600: 2, 14000: 4 },
  Chill: { 60: 3, 230: 1, 910: 0, 3600: -1, 14000: 2 },
};

export const EqualizerModal: React.FC = () => {
  const {
    equalizerSettings,
    setEqualizerBand,
    setEqualizerPreset,
    toggleEqualizer,
    toggleBassBoost,
    setCrossfadeDuration,
    toggleGapless,
    isEqualizerOpen,
    setIsEqualizerOpen,
  } = useMusic();

  if (!isEqualizerOpen) return null;

  const frequencies = [60, 230, 910, 3600, 14000];

  const formatFreq = (f: number) => {
    if (f >= 1000) return `${f / 1000} kHz`;
    return `${f} Hz`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#1e1e1e] border border-zinc-800 rounded-2xl p-6 text-white shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1ed760]/10 flex items-center justify-center text-[#1ed760]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Audio Engine & Equalizer</h3>
              <p className="text-xs text-zinc-400">Web Audio API • Gapless Playback • 5-Band Graphic EQ</p>
            </div>
          </div>

          <button
            onClick={() => setIsEqualizerOpen(false)}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gapless Playback & Crossfade Settings */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#1ed760]" />
                Gapless Playback
              </span>
              <p className="text-xs text-zinc-400 max-w-sm">
                Dual-deck lookahead audio scheduler eliminates silence between consecutive tracks.
              </p>
            </div>
            <button
              onClick={() => toggleGapless(!equalizerSettings.gaplessEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                equalizerSettings.gaplessEnabled ? 'bg-[#1ed760]' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  equalizerSettings.gaplessEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Crossfade Duration Slider */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300">Crossfade Between Tracks</span>
              <span className="font-mono text-[#1ed760] font-bold">
                {equalizerSettings.crossfadeDuration === 0
                  ? 'Off (Instant 0ms gapless)'
                  : `${equalizerSettings.crossfadeDuration} seconds`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={equalizerSettings.crossfadeDuration}
              onChange={(e) => setCrossfadeDuration(parseInt(e.target.value, 10))}
              className="w-full accent-[#1ed760] cursor-pointer"
            />
          </div>
        </div>

        {/* 5-Band Equalizer Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">5-Band Graphic Equalizer</span>
              <button
                onClick={() => toggleEqualizer(!equalizerSettings.enabled)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  equalizerSettings.enabled ? 'bg-[#1ed760] text-black' : 'bg-zinc-700 text-zinc-300'
                }`}
              >
                {equalizerSettings.enabled ? 'Enabled' : 'Bypassed'}
              </button>
            </div>

            {/* Bass Boost Toggle */}
            <button
              onClick={() => toggleBassBoost(!equalizerSettings.bassBoost)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors border ${
                equalizerSettings.bassBoost
                  ? 'bg-[#1ed760]/20 text-[#1ed760] border-[#1ed760]/40'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
            >
              Bass Boost (+7dB)
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {Object.keys(PRESETS).map((pName) => {
              const isSelected = equalizerSettings.preset === pName;
              return (
                <button
                  key={pName}
                  onClick={() => setEqualizerPreset(pName, PRESETS[pName])}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-white text-black font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {pName}
                </button>
              );
            })}
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-5 gap-3 pt-3 pb-1 bg-zinc-900/60 rounded-xl p-4 border border-zinc-800">
            {frequencies.map((freq) => {
              const gain = equalizerSettings.bands[freq] || 0;
              return (
                <div key={freq} className="flex flex-col items-center gap-3">
                  <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                    {gain > 0 ? `+${gain}` : gain} dB
                  </span>

                  <div className="h-32 flex items-center justify-center">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={gain}
                      disabled={!equalizerSettings.enabled}
                      onChange={(e) => setEqualizerBand(freq, parseInt(e.target.value, 10))}
                      className="h-28 w-2 accent-[#1ed760] cursor-pointer appearance-slider-vertical"
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    />
                  </div>

                  <span className="text-[10px] font-bold text-zinc-300 text-center tracking-tight">
                    {formatFreq(freq)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setIsEqualizerOpen(false)}
            className="px-5 py-2 rounded-full bg-[#1ed760] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
