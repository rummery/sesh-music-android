// High-fidelity in-browser procedural music synthesizer & WAV encoder
// Generates 100% self-contained, CORS-free audio tracks that work reliably in all browsers

function writeWavHeader(samplesLength: number, sampleRate: number, numChannels: number): ArrayBuffer {
  const byteRate = sampleRate * numChannels * 2; // 16-bit = 2 bytes
  const blockAlign = numChannels * 2;
  const dataSize = samplesLength * numChannels * 2;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // 'RIFF'
  view.setUint32(4, 36 + dataSize, true); // file size - 8
  view.setUint32(8, 0x57415645, false); // 'WAVE'

  // fmt subchunk
  view.setUint32(12, 0x666d7420, false); // 'fmt '
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16)

  // data subchunk
  view.setUint32(36, 0x64617461, false); // 'data'
  view.setUint32(40, dataSize, true); // data size

  return buffer;
}

export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const header = writeWavHeader(length, sampleRate, numChannels);

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;

  const pcmData = new Int16Array(length * numChannels);
  let pcmIdx = 0;

  for (let i = 0; i < length; i++) {
    // Clamp and convert float32 (-1.0 to 1.0) to int16 (-32768 to 32767)
    const lSample = Math.max(-1, Math.min(1, left[i]));
    pcmData[pcmIdx++] = lSample < 0 ? lSample * 0x8000 : lSample * 0x7fff;

    if (numChannels > 1) {
      const rSample = Math.max(-1, Math.min(1, right[i]));
      pcmData[pcmIdx++] = rSample < 0 ? rSample * 0x8000 : rSample * 0x7fff;
    }
  }

  return new Blob([header, pcmData.buffer], { type: 'audio/wav' });
}

export async function generateProceduralTrack(
  genre: 'Synthwave' | 'Lo-Fi Chill' | 'Electronic' | 'Indie Folk',
  durationSeconds = 60
): Promise<string> {
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    2,
    totalSamples,
    sampleRate
  );

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);
  masterGain.connect(offlineCtx.destination);

  // Reverb simulation
  const convolver = offlineCtx.createConvolver();
  const revTime = 2.0;
  const revLength = Math.floor(sampleRate * revTime);
  const revBuffer = offlineCtx.createBuffer(2, revLength, sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = revBuffer.getChannelData(c);
    for (let i = 0; i < revLength; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLength, 2.5);
    }
  }
  convolver.buffer = revBuffer;
  const revGain = offlineCtx.createGain();
  revGain.gain.value = 0.25;
  convolver.connect(revGain);
  revGain.connect(masterGain);

  const now = 0;

  if (genre === 'Synthwave') {
    // 120 BPM (0.5s per beat)
    const bpm = 120;
    const beatSec = 60 / bpm;
    const chordRoots = [130.81, 103.83, 155.56, 116.54]; // C3, Ab2, Eb3, Bb2

    // Chords and bass
    for (let bar = 0; bar < Math.floor(durationSeconds / (beatSec * 4)); bar++) {
      const barTime = bar * beatSec * 4;
      const root = chordRoots[bar % chordRoots.length];

      // Bass notes (16th notes arpeggiated)
      for (let s = 0; s < 16; s++) {
        const noteTime = barTime + s * (beatSec / 4);
        const osc = offlineCtx.createOscillator();
        const g = offlineCtx.createGain();
        osc.type = 'sawtooth';
        const bassFreq = s % 2 === 0 ? root / 2 : root;
        osc.frequency.setValueAtTime(bassFreq, noteTime);

        g.gain.setValueAtTime(0.3, noteTime);
        g.gain.exponentialRampToValueAtTime(0.001, noteTime + beatSec / 4);

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, noteTime);
        filter.frequency.exponentialRampToValueAtTime(200, noteTime + beatSec / 4);

        osc.connect(filter);
        filter.connect(g);
        g.connect(masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + beatSec / 4);
      }

      // Warm Synth Pad Chords
      [root, root * 1.2, root * 1.5].forEach((freq) => {
        const padOsc = offlineCtx.createOscillator();
        const padGain = offlineCtx.createGain();
        padOsc.type = 'sawtooth';
        padOsc.frequency.setValueAtTime(freq, barTime);

        const padFilter = offlineCtx.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(800, barTime);

        padGain.gain.setValueAtTime(0.001, barTime);
        padGain.gain.linearRampToValueAtTime(0.12, barTime + 0.3);
        padGain.gain.setValueAtTime(0.12, barTime + beatSec * 4 - 0.3);
        padGain.gain.linearRampToValueAtTime(0.001, barTime + beatSec * 4);

        padOsc.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(convolver);
        padGain.connect(masterGain);

        padOsc.start(barTime);
        padOsc.stop(barTime + beatSec * 4);
      });

      // Drums: Kick on 1 & 3, Snare on 2 & 4
      for (let b = 0; b < 4; b++) {
        const beatTime = barTime + b * beatSec;
        if (b % 2 === 0) {
          // Kick
          const kick = offlineCtx.createOscillator();
          const kickG = offlineCtx.createGain();
          kick.frequency.setValueAtTime(150, beatTime);
          kick.frequency.exponentialRampToValueAtTime(40, beatTime + 0.15);
          kickG.gain.setValueAtTime(0.7, beatTime);
          kickG.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.2);
          kick.connect(kickG);
          kickG.connect(masterGain);
          kick.start(beatTime);
          kick.stop(beatTime + 0.2);
        } else {
          // Snare (Noise burst + tonal crack)
          const snareOsc = offlineCtx.createOscillator();
          const snareG = offlineCtx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(200, beatTime);
          snareG.gain.setValueAtTime(0.3, beatTime);
          snareG.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);
          snareOsc.connect(snareG);
          snareG.connect(masterGain);
          snareOsc.start(beatTime);
          snareOsc.stop(beatTime + 0.15);
        }
      }
    }
  } else if (genre === 'Lo-Fi Chill') {
    // 72 BPM relaxed swing
    const beatSec = 60 / 72;
    const chords = [
      [146.83, 174.61, 220.0, 261.63], // Dm7
      [196.0, 246.94, 293.66, 349.23], // G7
      [130.81, 164.81, 196.0, 246.94], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
    ];

    for (let bar = 0; bar < Math.floor(durationSeconds / (beatSec * 4)); bar++) {
      const barTime = bar * beatSec * 4;
      const chord = chords[bar % chords.length];

      // Rhodes-style electric piano notes
      chord.forEach((freq, idx) => {
        const osc = offlineCtx.createOscillator();
        const g = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, barTime + idx * 0.03);

        g.gain.setValueAtTime(0.18, barTime + idx * 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, barTime + beatSec * 3);

        osc.connect(g);
        g.connect(convolver);
        g.connect(masterGain);

        osc.start(barTime + idx * 0.03);
        osc.stop(barTime + beatSec * 3);
      });

      // Warm mellow bass
      const bass = offlineCtx.createOscillator();
      const bassG = offlineCtx.createGain();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(chord[0] / 2, barTime);
      bassG.gain.setValueAtTime(0.4, barTime);
      bassG.gain.exponentialRampToValueAtTime(0.001, barTime + beatSec * 2);
      bass.connect(bassG);
      bassG.connect(masterGain);
      bass.start(barTime);
      bass.stop(barTime + beatSec * 2);

      // Soft rim & dusty kick
      for (let b = 0; b < 4; b++) {
        const beatTime = barTime + b * beatSec;
        if (b === 0 || b === 2) {
          const kick = offlineCtx.createOscillator();
          const kickG = offlineCtx.createGain();
          kick.frequency.setValueAtTime(110, beatTime);
          kick.frequency.exponentialRampToValueAtTime(45, beatTime + 0.12);
          kickG.gain.setValueAtTime(0.5, beatTime);
          kickG.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);
          kick.connect(kickG);
          kickG.connect(masterGain);
          kick.start(beatTime);
          kick.stop(beatTime + 0.15);
        }
      }
    }
  } else if (genre === 'Electronic') {
    // 126 BPM 4/4 Sub-Bass & Arp
    const beatSec = 60 / 126;
    const notes = [110, 130.81, 146.83, 164.81, 196, 220]; // A minor pentatonic

    for (let bar = 0; bar < Math.floor(durationSeconds / (beatSec * 4)); bar++) {
      const barTime = bar * beatSec * 4;

      // 4-on-the-floor kick
      for (let b = 0; b < 4; b++) {
        const beatTime = barTime + b * beatSec;
        const kick = offlineCtx.createOscillator();
        const kickG = offlineCtx.createGain();
        kick.frequency.setValueAtTime(160, beatTime);
        kick.frequency.exponentialRampToValueAtTime(38, beatTime + 0.18);
        kickG.gain.setValueAtTime(0.8, beatTime);
        kickG.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.22);
        kick.connect(kickG);
        kickG.connect(masterGain);
        kick.start(beatTime);
        kick.stop(beatTime + 0.22);
      }

      // 16th-note arpeggiator
      for (let s = 0; s < 16; s++) {
        const noteTime = barTime + s * (beatSec / 4);
        const osc = offlineCtx.createOscillator();
        const g = offlineCtx.createGain();
        osc.type = 'sawtooth';
        const note = notes[(s + bar * 2) % notes.length];
        osc.frequency.setValueAtTime(note * 2, noteTime);

        g.gain.setValueAtTime(0.2, noteTime);
        g.gain.exponentialRampToValueAtTime(0.001, noteTime + beatSec / 4);

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200 + Math.sin(bar + s * 0.2) * 800, noteTime);

        osc.connect(filter);
        filter.connect(g);
        g.connect(convolver);
        g.connect(masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + beatSec / 4);
      }
    }
  } else {
    // Indie Folk: Acoustic chords (D - G - Bm - A)
    const beatSec = 60 / 84;
    const chords = [
      [146.83, 220.0, 293.66, 369.99], // D major
      [98.0, 146.83, 196.0, 246.94],   // G major
      [123.47, 185.0, 246.94, 293.66], // B minor
      [110.0, 164.81, 220.0, 277.18],  // A major
    ];

    for (let bar = 0; bar < Math.floor(durationSeconds / (beatSec * 4)); bar++) {
      const barTime = bar * beatSec * 4;
      const chord = chords[bar % chords.length];

      // Fingerpicked arpeggio pattern
      for (let s = 0; s < 8; s++) {
        const noteTime = barTime + s * (beatSec / 2);
        const note = chord[s % chord.length];
        const osc = offlineCtx.createOscillator();
        const g = offlineCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, noteTime);

        g.gain.setValueAtTime(0.25, noteTime);
        g.gain.exponentialRampToValueAtTime(0.001, noteTime + beatSec * 1.5);

        osc.connect(g);
        g.connect(convolver);
        g.connect(masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + beatSec * 1.5);
      }
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  return URL.createObjectURL(wavBlob);
}

// In-memory cache for generated track blob URLs
const generatedBlobsCache: Record<string, string> = {};

export async function getOrGenerateDemoTrackUrl(
  trackId: string,
  genre: 'Synthwave' | 'Lo-Fi Chill' | 'Electronic' | 'Indie Folk',
  remoteFallbackUrl?: string
): Promise<string> {
  if (generatedBlobsCache[trackId]) {
    return generatedBlobsCache[trackId];
  }

  try {
    const blobUrl = await generateProceduralTrack(genre, 60);
    generatedBlobsCache[trackId] = blobUrl;
    return blobUrl;
  } catch (err) {
    console.warn('Procedural synthesis fallback to remote URL:', err);
    return remoteFallbackUrl || '';
  }
}
