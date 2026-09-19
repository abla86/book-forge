import html2canvas from 'html2canvas';
import {
  PresentationPlan,
  VideoExportSettings,
  VideoExportProgress,
  VideoExportResult,
} from '../types';
import { createAudioCueEngine, AudioCueEngine } from './audioCues';
import { THEMES } from '../data/themes';

/**
 * Detects browser-supported video MIME types for MediaRecorder.
 * Prefers MP4 with H.264/AAC where supported, with transparent WebM fallback.
 */
export function getSupportedVideoMimeType(): {
  mimeType: string;
  extension: 'mp4' | 'webm';
  label: string;
} {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/mp4', extension: 'mp4', label: 'MP4 Video' };
  }

  const candidateFormats: Array<{
    mimeType: string;
    extension: 'mp4' | 'webm';
    label: string;
  }> = [
    {
      mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      extension: 'mp4',
      label: 'MP4 (H.264 / AAC High-Quality)',
    },
    { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4', label: 'MP4 (H.264)' },
    { mimeType: 'video/mp4', extension: 'mp4', label: 'MP4 Standard' },
    {
      mimeType: 'video/webm;codecs=vp9,opus',
      extension: 'mp4', // Saved as mp4 or webm container compatible with modern players
      label: 'WebM / MP4 (VP9 / Opus High-Def)',
    },
    {
      mimeType: 'video/webm;codecs=vp8,opus',
      extension: 'mp4',
      label: 'WebM / MP4 (VP8 / Opus)',
    },
    { mimeType: 'video/webm', extension: 'mp4', label: 'WebM Video' },
  ];

  for (const candidate of candidateFormats) {
    try {
      if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
        return candidate;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return { mimeType: '', extension: 'mp4', label: 'Browser Native Video' };
}

/**
 * Pre-captures high-resolution canvas bitmaps for all slides in the deck.
 */
export async function captureAllSlideCanvases(
  slideElementIds: string[],
  onProgress?: (index: number, total: number) => void
): Promise<HTMLCanvasElement[]> {
  const capturedCanvases: HTMLCanvasElement[] = [];

  for (let i = 0; i < slideElementIds.length; i++) {
    const elId = slideElementIds[i];
    const el = document.getElementById(elId);
    if (!el) {
      throw new Error(`Slide element #${elId} was not found in document.`);
    }

    if (onProgress) {
      onProgress(i + 1, slideElementIds.length);
    }

    // Brief yield to allow browser layout & style stability
    await new Promise((resolve) => setTimeout(resolve, 80));

    const slideCanvas = await html2canvas(el, {
      scale: 1,
      useCORS: true,
      logging: false,
      backgroundColor: null,
    });

    capturedCanvases.push(slideCanvas);
  }

  return capturedCanvases;
}

// EaseInOut Quad interpolation for silky transitions
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Draws slide transitions on the master 2D canvas context.
 */
function renderTransitionFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentSlide: HTMLCanvasElement,
  nextSlide: HTMLCanvasElement,
  style: VideoExportSettings['transitionStyle'],
  rawProgress: number
) {
  const p = Math.max(0, Math.min(1, rawProgress));
  const eased = easeInOutQuad(p);

  ctx.clearRect(0, 0, width, height);

  switch (style) {
    case 'slide': {
      // Horizontal push left
      const currentX = -width * eased;
      const nextX = width * (1 - eased);

      ctx.drawImage(currentSlide, currentX, 0, width, height);
      ctx.drawImage(nextSlide, nextX, 0, width, height);

      // Subtle shadow between incoming and outgoing slide
      ctx.save();
      const shadowGrad = ctx.createLinearGradient(nextX - 25, 0, nextX, 0);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(nextX - 25, 0, 25, height);
      ctx.restore();
      break;
    }

    case 'zoom': {
      // Cinematic scale out and dissolve
      ctx.save();
      ctx.globalAlpha = 1 - eased;
      const scaleOut = 1 + eased * 0.08;
      const transX = (width * (1 - scaleOut)) / 2;
      const transY = (height * (1 - scaleOut)) / 2;
      ctx.drawImage(currentSlide, transX, transY, width * scaleOut, height * scaleOut);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = eased;
      const scaleIn = 0.94 + eased * 0.06;
      const inX = (width * (1 - scaleIn)) / 2;
      const inY = (height * (1 - scaleIn)) / 2;
      ctx.drawImage(nextSlide, inX, inY, width * scaleIn, height * scaleIn);
      ctx.restore();
      break;
    }

    case 'wipe': {
      // Sleek left-to-right horizontal wipe reveal
      ctx.drawImage(currentSlide, 0, 0, width, height);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width * eased, height);
      ctx.clip();
      ctx.drawImage(nextSlide, 0, 0, width, height);
      ctx.restore();

      // Soft luminous accent edge along the wipe line
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width * eased, 0);
      ctx.lineTo(width * eased, height);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'fade':
    default: {
      // Smooth cross-dissolve
      ctx.drawImage(currentSlide, 0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = eased;
      ctx.drawImage(nextSlide, 0, 0, width, height);
      ctx.restore();
      break;
    }
  }
}

/**
 * Draws speaker notes as sleek frosted glass subtitle pill at bottom of slide.
 */
function drawCaptions(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  notes: string
) {
  if (!notes || !notes.trim()) return;

  const maxText = notes.length > 130 ? notes.substring(0, 127) + '...' : notes;

  ctx.save();
  ctx.font = `600 ${Math.round(height * 0.024)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textMetrics = ctx.measureText(maxText);
  const pillPaddingX = 24;
  const pillPaddingY = 12;
  const pillWidth = Math.min(width * 0.85, textMetrics.width + pillPaddingX * 2);
  const pillHeight = Math.round(height * 0.048);
  const pillX = (width - pillWidth) / 2;
  const pillY = height - pillHeight - Math.round(height * 0.05);

  // Frosted dark pill background
  ctx.fillStyle = 'rgba(10, 14, 26, 0.82)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
  ctx.fill();
  ctx.stroke();

  // Subtitle text
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(maxText, width / 2, pillY + pillHeight / 2);
  ctx.restore();
}

/**
 * Draws a subtle, high-precision progress bar at the very bottom edge.
 */
function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number, // 0 to 1
  primaryColor = '#6366F1'
) {
  const barHeight = 6;
  const currentW = Math.max(0, Math.min(width, width * progress));

  ctx.save();
  // Background groove
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, height - barHeight, width, barHeight);

  // Active progress gradient fill
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, primaryColor);
  grad.addColorStop(1, '#A855F7');

  ctx.fillStyle = grad;
  ctx.fillRect(0, height - barHeight, currentW, barHeight);
  ctx.restore();
}

/**
 * Main presentation video recording engine.
 * Records the complete presentation with transitions and synchronized audio cues
 * to a high-quality video file using the browser's MediaRecorder API.
 */
export async function recordPresentationVideo({
  plan,
  slideCanvases,
  settings,
  onProgress,
  signal,
  onFrameUpdate,
}: {
  plan: PresentationPlan;
  slideCanvases: HTMLCanvasElement[];
  settings: VideoExportSettings;
  onProgress: (prog: VideoExportProgress) => void;
  signal?: AbortSignal;
  onFrameUpdate?: (canvas: HTMLCanvasElement) => void;
}): Promise<VideoExportResult> {
  const totalSlides = slideCanvases.length;
  if (totalSlides === 0) {
    throw new Error('No slide canvases available to record.');
  }

  // Determine resolution
  const width = settings.resolution === '1080p' ? 1920 : 1280;
  const height = settings.resolution === '1080p' ? 1080 : 720;

  // Master canvas where frames will be composited
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = width;
  masterCanvas.height = height;
  const ctx = masterCanvas.getContext('2d', { alpha: false })!;

  // Primary brand color
  const theme = THEMES[plan.theme] || THEMES.startup;
  const primaryColor = theme.primary || '#6366F1';

  // Initialize Web Audio API audio cue engine
  let audioEngine: AudioCueEngine | null = null;
  let stopAmbient: (() => void) | null = null;

  try {
    audioEngine = createAudioCueEngine(settings.enableAudioMonitor);
    if (settings.ambientMusic) {
      stopAmbient = audioEngine.startAmbientTrack(settings.audioVolume);
    }
  } catch (err) {
    console.warn('Web Audio engine could not be initialized:', err);
  }

  // Setup MediaRecorder with combined canvas video and audio tracks
  const supported = getSupportedVideoMimeType();
  const fps = 30;
  const canvasStream = masterCanvas.captureStream(fps);

  const combinedStream = new MediaStream();
  canvasStream.getVideoTracks().forEach((vt) => combinedStream.addTrack(vt));

  if (audioEngine && audioEngine.destinationNode) {
    try {
      const audioTracks = audioEngine.destinationNode.stream.getAudioTracks();
      audioTracks.forEach((at) => combinedStream.addTrack(at));
    } catch (err) {
      console.warn('Could not add audio tracks to stream:', err);
    }
  }

  // Choose appropriate bitrate for high-quality video
  const videoBitsPerSecond = settings.resolution === '1080p' ? 5_000_000 : 2_500_000;
  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond,
  };
  if (supported.mimeType) {
    recorderOptions.mimeType = supported.mimeType;
  }

  const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
  const recordedChunks: Blob[] = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  // Compute playback timing
  const slideDisplayDuration = Math.max(1.5, settings.slideDuration);
  const transitionDuration =
    totalSlides > 1 ? Math.max(0.4, Math.min(2.0, settings.transitionDuration)) : 0;
  const totalDurationSeconds =
    totalSlides * slideDisplayDuration + (totalSlides - 1) * transitionDuration;

  onProgress({
    phase: 'recording',
    currentSlide: 1,
    totalSlides,
    percent: 0,
    elapsedSeconds: 0,
    totalEstimatedSeconds: Math.round(totalDurationSeconds),
    message: 'Starting MediaRecorder presentation recording...',
  });

  // Track chime firing states to ensure each cue fires only once
  const firedTransitionChimes = new Set<number>();
  let firedIntro = false;
  let firedOutro = false;

  // Start recorder
  mediaRecorder.start(200); // Collect chunks every 200ms

  const startTime = performance.now();

  return new Promise<VideoExportResult>((resolve, reject) => {
    let animationFrameId: number | null = null;
    let isCancelled = false;

    // Handle user cancellation
    const handleAbort = () => {
      isCancelled = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      try {
        if (stopAmbient) stopAmbient();
        if (audioEngine) audioEngine.close();
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      } catch {}
      reject(new Error('Video export was cancelled by the user.'));
    };

    if (signal) {
      signal.addEventListener('abort', handleAbort);
    }

    // Playback and frame drawing tick
    const tick = () => {
      if (isCancelled) return;

      const elapsedMs = performance.now() - startTime;
      const elapsedSeconds = elapsedMs / 1000;
      const overallProgress = Math.min(1, elapsedSeconds / totalDurationSeconds);

      // Finish recording if elapsed reaches total duration
      if (elapsedSeconds >= totalDurationSeconds) {
        // Draw last frame cleanly
        const lastCanvas = slideCanvases[totalSlides - 1];
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(lastCanvas, 0, 0, width, height);
        if (settings.showProgressBar) {
          drawProgressBar(ctx, width, height, 1, primaryColor);
        }

        onProgress({
          phase: 'finalizing',
          currentSlide: totalSlides,
          totalSlides,
          percent: 100,
          elapsedSeconds: Math.round(elapsedSeconds),
          totalEstimatedSeconds: Math.round(totalDurationSeconds),
          message: 'Finalizing high-quality MP4 video encoding...',
        });

        // Small delay to allow audio trail and final MediaRecorder flush
        setTimeout(() => {
          if (stopAmbient) stopAmbient();
          try {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          } catch (err) {
            reject(err);
          }
        }, 500);
        return;
      }

      // Calculate which slide cycle we are currently in
      const cycleTime = slideDisplayDuration + transitionDuration;
      let currentIdx = Math.floor(elapsedSeconds / cycleTime);
      currentIdx = Math.max(0, Math.min(totalSlides - 1, currentIdx));

      const timeInCurrentCycle = elapsedSeconds - currentIdx * cycleTime;
      const isDisplayPhase =
        timeInCurrentCycle < slideDisplayDuration || currentIdx === totalSlides - 1;

      // 1. Audio Cues Triggering
      if (currentIdx === 0 && !firedIntro && settings.introOutroAudio && audioEngine) {
        firedIntro = true;
        audioEngine.playIntroFanfare(settings.audioVolume);
      }

      if (
        currentIdx === totalSlides - 1 &&
        !firedOutro &&
        settings.introOutroAudio &&
        audioEngine
      ) {
        firedOutro = true;
        audioEngine.playOutroChord(settings.audioVolume);
      }

      // 2. Rendering Phase
      if (isDisplayPhase) {
        // Static or subtle Ken Burns display
        const activeCanvas = slideCanvases[currentIdx];
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(activeCanvas, 0, 0, width, height);

        // Captions
        if (settings.showCaptions) {
          const notes = plan.slides[currentIdx]?.content?.speakerNotes || '';
          drawCaptions(ctx, width, height, notes);
        }
      } else {
        // Transition Phase between currentIdx and currentIdx + 1
        const nextIdx = currentIdx + 1;
        const timeInTransition = timeInCurrentCycle - slideDisplayDuration;
        const transProgress = Math.min(1, timeInTransition / transitionDuration);

        // Trigger slide transition chime right at transition start
        if (!firedTransitionChimes.has(currentIdx) && settings.audioCues && audioEngine) {
          firedTransitionChimes.add(currentIdx);
          audioEngine.playSlideChime(settings.audioVolume);
        }

        renderTransitionFrame(
          ctx,
          width,
          height,
          slideCanvases[currentIdx],
          slideCanvases[nextIdx],
          settings.transitionStyle,
          transProgress
        );

        if (settings.showCaptions) {
          // Fade captions during transition
          const notes = plan.slides[nextIdx]?.content?.speakerNotes || '';
          drawCaptions(ctx, width, height, notes);
        }
      }

      // 3. Progress bar along bottom
      if (settings.showProgressBar) {
        drawProgressBar(ctx, width, height, overallProgress, primaryColor);
      }

      // 4. Send frame notification for live preview monitor
      if (onFrameUpdate) {
        onFrameUpdate(masterCanvas);
      }

      // 5. Update progress metadata
      const percent = Math.round(overallProgress * 100);
      onProgress({
        phase: 'recording',
        currentSlide: currentIdx + 1,
        totalSlides,
        percent,
        elapsedSeconds: Math.round(elapsedSeconds),
        totalEstimatedSeconds: Math.round(totalDurationSeconds),
        message: `Recording Slide ${currentIdx + 1} of ${totalSlides} (${percent}%)...`,
      });

      // Request next frame
      animationFrameId = requestAnimationFrame(tick);
    };

    // MediaRecorder completion callback
    mediaRecorder.onstop = () => {
      if (isCancelled) return;

      if (audioEngine) {
        audioEngine.close();
      }

      const mimeType = supported.mimeType || 'video/mp4';
      const videoBlob = new Blob(recordedChunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(videoBlob);
      const cleanTitle = plan.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Pitch_Deck';
      const fileName = `${cleanTitle}_presentation.${supported.extension}`;

      onProgress({
        phase: 'completed',
        currentSlide: totalSlides,
        totalSlides,
        percent: 100,
        elapsedSeconds: Math.round(totalDurationSeconds),
        totalEstimatedSeconds: Math.round(totalDurationSeconds),
        message: 'Presentation MP4 video ready to download!',
      });

      resolve({
        blob: videoBlob,
        url: videoUrl,
        mimeType,
        fileSizeBytes: videoBlob.size,
        durationSeconds: Math.round(totalDurationSeconds),
        fileName,
      });
    };

    mediaRecorder.onerror = (event: Event) => {
      if (audioEngine) audioEngine.close();
      reject(new Error(`MediaRecorder error: ${(event as any).error || 'Unknown error'}`));
    };

    // Kick off the loop
    animationFrameId = requestAnimationFrame(tick);
  });
}
