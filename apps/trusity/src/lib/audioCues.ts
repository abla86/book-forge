/**
 * Audio cue synthesis engine for presentation playback and video export.
 * Generates pristine, synchronized digital audio cues using the Web Audio API
 * and routes them directly to a MediaStreamDestination for the MediaRecorder API.
 */

export interface AudioCueEngine {
  audioContext: AudioContext;
  destinationNode: MediaStreamAudioDestinationNode;
  playSlideChime: (volume?: number) => void;
  playIntroFanfare: (volume?: number) => void;
  playOutroChord: (volume?: number) => void;
  startAmbientTrack: (volume?: number) => () => void;
  close: () => void;
}

export function createAudioCueEngine(monitorAudio = false): AudioCueEngine {
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass();

  // Create stream destination for MediaRecorder
  const destinationNode = audioContext.createMediaStreamDestination();

  // Master gain node
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(destinationNode);

  // If monitorAudio is true, also send to computer speakers
  if (monitorAudio) {
    try {
      masterGain.connect(audioContext.destination);
    } catch {
      // AudioContext destination might be restricted before interaction
    }
  }

  // Pre-generate noise buffer for slide whoosh
  const bufferSize = audioContext.sampleRate * 0.3; // 300ms
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const ensureRunning = async () => {
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (err) {
        console.warn('AudioContext resume error:', err);
      }
    }
  };

  /**
   * Slide transition chime + aerodynamic whoosh
   */
  const playSlideChime = (volume = 0.8) => {
    ensureRunning();
    const now = audioContext.currentTime;

    // 1. Crystal Two-Tone Chime
    const chimeFrequencies = [880, 1318.51]; // A5 & E6
    chimeFrequencies.forEach((freq, idx) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      // Fast attack, exponential decay
      gain.gain.setValueAtTime(0.001, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.22 * volume, now + idx * 0.04 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.45);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.5);
    });

    // 2. Soft filtered transition whoosh
    try {
      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bandpass = audioContext.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.Q.setValueAtTime(2.5, now);
      bandpass.frequency.setValueAtTime(400, now);
      bandpass.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
      bandpass.frequency.exponentialRampToValueAtTime(300, now + 0.28);

      const noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.12 * volume, now + 0.08);
      noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.28);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(masterGain);

      noiseSource.start(now);
      noiseSource.stop(now + 0.3);
    } catch {
      // Noise buffer fallback safe
    }
  };

  /**
   * Title slide opening fanfare / welcome chime
   */
  const playIntroFanfare = (volume = 0.8) => {
    ensureRunning();
    const now = audioContext.currentTime;
    // C Major 9th Arpeggio: C4, G4, C5, E5, G5
    const notes = [261.63, 392.0, 523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.07;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.18 * volume, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.8);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.85);
    });
  };

  /**
   * Concluding slide resolution chord
   */
  const playOutroChord = (volume = 0.8) => {
    ensureRunning();
    const now = audioContext.currentTime;
    // Warm Cmaj7 closing chord: C3, G3, E4, B4
    const notes = [130.81, 196.0, 329.63, 493.88];

    notes.forEach((freq) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16 * volume, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 1.7);
    });
  };

  /**
   * Gentle, elegant ambient presentation pad track (loops in background)
   */
  const startAmbientTrack = (volume = 0.8): (() => void) => {
    ensureRunning();
    const now = audioContext.currentTime;

    const ambientGain = audioContext.createGain();
    ambientGain.gain.setValueAtTime(0.001, now);
    ambientGain.gain.linearRampToValueAtTime(0.07 * volume, now + 1.5);
    ambientGain.connect(masterGain);

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, now);
    filter.connect(ambientGain);

    // Subtle LFO modulation on filter
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.frequency.setValueAtTime(0.2, now); // 0.2 Hz slow pulse
    lfoGain.gain.setValueAtTime(150, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    // Warm chords: C3, G3, D4
    const oscillators: OscillatorNode[] = [];
    const freqs = [130.81, 196.0, 293.66];

    freqs.forEach((freq, idx) => {
      const osc = audioContext.createOscillator();
      osc.type = 'sine';
      // Slight detune for analog warmth
      osc.frequency.setValueAtTime(freq + (idx - 1) * 0.4, now);
      osc.connect(filter);
      osc.start(now);
      oscillators.push(osc);
    });

    let isStopped = false;
    return () => {
      if (isStopped) return;
      isStopped = true;
      const stopNow = audioContext.currentTime;
      try {
        ambientGain.gain.linearRampToValueAtTime(0.0001, stopNow + 0.8);
        setTimeout(() => {
          oscillators.forEach((osc) => {
            try {
              osc.stop();
              osc.disconnect();
            } catch {}
          });
          try {
            lfo.stop();
            lfo.disconnect();
          } catch {}
        }, 900);
      } catch {}
    };
  };

  const close = () => {
    try {
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    } catch {}
  };

  return {
    audioContext,
    destinationNode,
    playSlideChime,
    playIntroFanfare,
    playOutroChord,
    startAmbientTrack,
    close,
  };
}
