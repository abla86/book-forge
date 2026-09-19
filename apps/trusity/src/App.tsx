import React, { useState, useEffect } from 'react';
import { Sparkles, RotateCcw, Layers, History, Copy, Split, Users } from 'lucide-react';
import { Header } from './components/Header';
import { FormSection } from './components/FormSection';
import { SlideCanvas } from './components/SlideCanvas';
import { SlideSidebar } from './components/SlideSidebar';
import { SpeakerNotesPanel } from './components/SpeakerNotesPanel';
import { PresentationMode } from './components/PresentationMode';
import { StoryArcInspector } from './components/StoryArcInspector';
import { PolishModal } from './components/PolishModal';
import { DeckSnapshotModal } from './components/DeckSnapshotModal';
import { CollaborationModal } from './components/CollaborationModal';
import { VideoExportModal } from './components/VideoExportModal';
import { ImageStudioModal } from './components/ImageStudioModal';
import {
  GenerationRequest,
  PresentationPlan,
  Slide,
  ThemeName,
  PolishOptions,
  PolishResult,
  DeckSnapshot,
  SlideVisualAsset,
} from './types';
import { generatePresentation, regenerateSlide, polishDeck } from './api';
import {
  exportToPPTX,
  exportToJSON,
  exportToPNGZip,
  exportToMarkdown,
} from './lib/exportUtils';
import { optimizeDeckLayouts, splitDenseSlide } from './lib/smartLayout';
import { useCollaboration } from './lib/useCollaboration';
import { THEMES, SAMPLE_IDEAS } from './data/themes';

export default function App() {
  const [plan, setPlan] = useState<PresentationPlan | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isPresenting, setIsPresenting] = useState<boolean>(false);
  const [isPolishModalOpen, setIsPolishModalOpen] = useState<boolean>(false);
  const [isPolishing, setIsPolishing] = useState<boolean>(false);
  const [previousPlan, setPreviousPlan] = useState<PresentationPlan | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Version Snapshots state
  const [snapshots, setSnapshots] = useState<DeckSnapshot[]>([]);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState<boolean>(false);

  // Collaboration State
  const [isCollaborationModalOpen, setIsCollaborationModalOpen] = useState<boolean>(false);
  const [showRemoteCursors, setShowRemoteCursors] = useState<boolean>(true);

  // Video Export Modal State
  const [isVideoExportModalOpen, setIsVideoExportModalOpen] = useState<boolean>(false);

  // AI Visual & Stock Photo Studio State
  const [isImageStudioOpen, setIsImageStudioOpen] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Real-time Collaboration Engine Hook
  const {
    sessionId,
    sessionTitle,
    isConnected: isCollaborating,
    isConnecting: isCollabConnecting,
    isHost: isCollabHost,
    currentUser: collabUser,
    participants: collabParticipants,
    remoteCursors,
    reactions: collabReactions,
    messages: collabMessages,
    followPresenter,
    joinSession,
    leaveSession,
    broadcastCursor,
    broadcastSlideChange,
    broadcastDeckUpdate,
    sendMessage: sendCollabMessage,
    sendReaction: sendCollabReaction,
    updateUserProfile,
    setFollowPresenter,
  } = useCollaboration({
    activeSlideIndex,
    currentPlan: plan,
    onRemoteSlideChange: (newSlideIndex) => {
      setActiveSlideIndex(newSlideIndex);
    },
    onRemoteDeckUpdate: (updatedPlan, newSlideIndex) => {
      setPlan(updatedPlan);
      if (typeof newSlideIndex === 'number') {
        setActiveSlideIndex(newSlideIndex);
      }
      showToast('Deck synced from collaborator');
    },
    onNotification: (notif) => {
      showToast(notif);
    },
  });

  // Auto-connect if URL query contains ?session=ROOM_ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    if (sessionParam) {
      joinSession(sessionParam, plan || undefined);
      setIsCollaborationModalOpen(true);
    }
  }, []);

  const handleSelectSlide = (idx: number) => {
    setActiveSlideIndex(idx);
    if (isCollaborating) {
      broadcastSlideChange(idx);
    }
  };

  // Generate complete presentation
  const handleGenerate = async (req: GenerationRequest) => {
    setIsLoading(true);
    setLoadingStep('Stage 1: Business Analyzer evaluating market & value proposition...');
    try {
      const timer1 = setTimeout(() => {
        setLoadingStep('Stage 2: Structuring 8-part narrative story arc (Hook → Problem → Solution → Market)...');
      }, 1200);

      const timer2 = setTimeout(() => {
        setLoadingStep('Stage 3: Generating slide copy, formatted layouts & presenter speaker notes...');
      }, 2500);

      const generatedPlan = await generatePresentation(req);
      clearTimeout(timer1);
      clearTimeout(timer2);

      setPlan(generatedPlan);
      setActiveSlideIndex(0);

      // Create initial snapshot
      const initSnap: DeckSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: 'Initial Generation',
        slideCount: generatedPlan.slides.length,
        theme: generatedPlan.theme,
        plan: JSON.parse(JSON.stringify(generatedPlan)),
      };
      setSnapshots([initSnap]);

      showToast(`Generated ${generatedPlan.slides.length} slides for ${generatedPlan.title}!`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to generate presentation.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Switch Theme
  const handleThemeChange = (newTheme: ThemeName) => {
    if (!plan) return;
    setPlan({ ...plan, theme: newTheme });
    showToast(`Switched theme to "${THEMES[newTheme]?.name || newTheme}"`);
  };

  // Update a single slide
  const handleUpdateSlide = (updatedSlide: Slide) => {
    if (!plan) return;
    const newSlides = plan.slides.map((s) => (s.id === updatedSlide.id ? updatedSlide : s));
    setPlan({ ...plan, slides: newSlides });
  };

  // Regenerate single slide with AI instruction
  const handleRegenerateSlide = async (targetSlide: Slide, instruction: string) => {
    if (!plan) return;
    setIsRegenerating(true);
    showToast(`AI refining slide with prompt: "${instruction}"...`);
    try {
      const updatedSlide = await regenerateSlide(targetSlide, instruction, plan.analysis);
      handleUpdateSlide(updatedSlide);
      showToast('Slide successfully refined by AI!');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to regenerate slide.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Professional Polish execution
  const handleApplyPolish = async (options: PolishOptions): Promise<PolishResult> => {
    if (!plan) {
      throw new Error('No presentation plan loaded to polish.');
    }

    setIsPolishing(true);
    // Save current plan for undo
    setPreviousPlan(JSON.parse(JSON.stringify(plan)));

    // Save automatic checkpoint snapshot
    const snapId = `snap-${Date.now()}`;
    const autoSnap: DeckSnapshot = {
      id: snapId,
      timestamp: new Date().toISOString(),
      label: `Pre-Polish (${options.styleArchetype || options.targetTone || 'Default'})`,
      slideCount: plan.slides.length,
      theme: plan.theme,
      plan: JSON.parse(JSON.stringify(plan)),
    };
    setSnapshots((prev) => [autoSnap, ...prev]);

    try {
      const result = await polishDeck(plan, options);
      const nextPlan = result.polishedPlan || result.plan;
      setPlan(nextPlan);
      const count = result.stats?.totalSlidesPolished ?? result.polishedCount;
      const tone = result.stats?.overallTone ?? plan.tone;
      showToast(
        `Professional Polish completed: ${count} slides elevated (${tone} tone)`
      );
      return result;
    } catch (error: any) {
      console.error('Polish failure:', error);
      showToast(`Polish failed: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setIsPolishing(false);
    }
  };

  const handleRevertPolish = () => {
    if (!previousPlan) return;
    setPlan(previousPlan);
    setPreviousPlan(null);
    showToast('Reverted presentation to state prior to polish.');
  };

  // Snapshot Checkpoint Handlers
  const handleCreateSnapshot = (label: string) => {
    if (!plan) return;
    const snap: DeckSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      label: label.trim() || `Snapshot #${snapshots.length + 1}`,
      slideCount: plan.slides.length,
      theme: plan.theme,
      plan: JSON.parse(JSON.stringify(plan)),
    };
    setSnapshots((prev) => [snap, ...prev]);
    showToast(`Checkpoint "${snap.label}" saved`);
  };

  const handleRestoreSnapshot = (snapshot: DeckSnapshot) => {
    setPlan(JSON.parse(JSON.stringify(snapshot.plan)));
    showToast(`Restored checkpoint: "${snapshot.label}"`);
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    showToast('Checkpoint deleted');
  };

  // Reorder slides
  const handleMoveUp = (index: number) => {
    if (!plan || index === 0) return;
    const newSlides = [...plan.slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[index - 1];
    newSlides[index - 1] = temp;
    setPlan({ ...plan, slides: newSlides });
    setActiveSlideIndex(index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (!plan || index === plan.slides.length - 1) return;
    const newSlides = [...plan.slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[index + 1];
    newSlides[index + 1] = temp;
    setPlan({ ...plan, slides: newSlides });
    setActiveSlideIndex(index + 1);
  };

  // Delete slide
  const handleDeleteSlide = (index: number) => {
    if (!plan || plan.slides.length <= 1) return;
    const newSlides = plan.slides.filter((_, i) => i !== index);
    setPlan({ ...plan, slides: newSlides });
    setActiveSlideIndex(Math.max(0, index - 1));
    showToast('Slide deleted');
  };

  // Duplicate slide
  const handleDuplicateSlide = (index: number) => {
    if (!plan) return;
    const target = plan.slides[index];
    if (!target) return;
    const duplicated: Slide = {
      ...JSON.parse(JSON.stringify(target)),
      id: `slide-${Date.now()}`,
      content: {
        ...target.content,
        headline: `${target.content.headline} (Copy)`,
      },
    };
    const nextSlides = [...plan.slides];
    nextSlides.splice(index + 1, 0, duplicated);
    setPlan({ ...plan, slides: nextSlides });
    setActiveSlideIndex(index + 1);
    showToast('Slide duplicated successfully');
  };

  // Split slide (if high density or 5+ bullet items)
  const handleSplitSlide = (index: number) => {
    if (!plan) return;
    const target = plan.slides[index];
    if (!target) return;
    const [part1, part2] = splitDenseSlide(target);
    const nextSlides = [...plan.slides];
    nextSlides.splice(index, 1, part1, part2);
    setPlan({ ...plan, slides: nextSlides });
    showToast('Dense slide split into 2 balanced slides');
  };

  // Apply AI visual or stock photo to active slide or deck
  const handleApplyVisual = (asset: SlideVisualAsset | null, applyToAllSlides?: boolean) => {
    if (!plan) return;

    if (applyToAllSlides && asset) {
      const updatedSlides = plan.slides.map((s) => ({
        ...s,
        metadata: {
          ...s.metadata,
          visualAsset: asset,
        },
        content: {
          ...s.content,
          visualAsset: asset,
        },
      }));

      const newPlan: PresentationPlan = {
        ...plan,
        slides: updatedSlides,
      };
      setPlan(newPlan);
      broadcastDeckUpdate(newPlan);
      showToast('Visual backdrop applied across all slides in deck');
      return;
    }

    const currentSlide = plan.slides[activeSlideIndex];
    if (!currentSlide) return;

    const updatedSlide: Slide = {
      ...currentSlide,
      metadata: {
        ...currentSlide.metadata,
        visualAsset: asset || undefined,
      },
      content: {
        ...currentSlide.content,
        visualAsset: asset || undefined,
      },
    };

    const nextSlides = [...plan.slides];
    nextSlides[activeSlideIndex] = updatedSlide;

    const newPlan: PresentationPlan = {
      ...plan,
      slides: nextSlides,
    };

    setPlan(newPlan);
    broadcastDeckUpdate(newPlan);
    showToast(asset ? 'Visual applied to slide' : 'Visual removed from slide');
  };

  // Add new slide
  const handleAddSlide = () => {
    if (!plan) return;
    const newSlideId = `slide-${Date.now()}`;
    const newSlide: Slide = {
      id: newSlideId,
      slideType: 'solution',
      layout: 'bullet_list',
      content: {
        headline: 'Key Strategic Pillar',
        subheadline: 'Highlight a crucial facet of your company architecture.',
        badge: `0${plan.slides.length + 1} / STRATEGY`,
        bulletPoints: [
          'High operational leverage and zero marginal distribution cost.',
          'Proprietary network effects that strengthen with every new customer.',
          'Defensible moat powered by data feedback loops and sticky workflow lock-in.',
        ],
        speakerNotes:
          'Walk the audience through why this strategic pillar protects our unit economics and defensibility over time.',
      },
    };
    const newSlides = [...plan.slides, newSlide];
    setPlan({ ...plan, slides: newSlides });
    setActiveSlideIndex(newSlides.length - 1);
    showToast('New slide added to deck');
  };

  // Exports
  const handleExportPPTX = async () => {
    if (!plan) return;
    setIsExporting(true);
    showToast('Generating PowerPoint (.pptx) file with speaker notes & annotations...');
    try {
      await exportToPPTX(plan);
      showToast('PowerPoint deck downloaded successfully!');
    } catch (err: any) {
      console.error(err);
      showToast('PPTX export error: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (!plan) return;
    window.print();
  };

  const handleExportPNG = async () => {
    if (!plan) return;
    setIsExporting(true);
    showToast('Capturing slide images and creating ZIP archive...');
    try {
      const slideIds = plan.slides.map((s) => `slide-canvas-${s.id}`);
      await exportToPNGZip(plan, slideIds);
      showToast('Slide images downloaded as ZIP archive!');
    } catch (err: any) {
      console.error(err);
      showToast('PNG Zip export error: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    if (!plan) return;
    exportToJSON(plan);
    showToast('Presentation plan exported as JSON!');
  };

  const handleExportMarkdown = () => {
    if (!plan) return;
    exportToMarkdown(plan);
    showToast('Presentation outline exported as Markdown (.md)!');
  };

  const handleOptimizeDeckLayouts = () => {
    if (!plan) return;
    const result = optimizeDeckLayouts(plan.slides);
    setPlan({
      ...plan,
      slides: result.slides,
    });
    showToast(
      result.changedCount > 0
        ? `Smart Layout: Optimized ${result.changedCount} slides for rhythmic flow`
        : 'All slide layouts already match their content optimally!'
    );
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-indigo-500/60 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentTheme={plan?.theme || 'startup'}
        onThemeChange={handleThemeChange}
        onStartPresenting={() => setIsPresenting(true)}
        onExportPPTX={handleExportPPTX}
        onExportPDF={handleExportPDF}
        onExportPNG={handleExportPNG}
        onExportJSON={handleExportJSON}
        onExportMarkdown={handleExportMarkdown}
        onExportMP4={() => setIsVideoExportModalOpen(true)}
        onOpenVersionHistory={() => setIsSnapshotModalOpen(true)}
        onNewDeck={() => setPlan(null)}
        onOpenPolishModal={() => setIsPolishModalOpen(true)}
        onOpenImageStudio={() => setIsImageStudioOpen(true)}
        isPolishing={isPolishing}
        hasSlides={Boolean(plan && plan.slides.length > 0)}
        isExporting={isExporting}
        isCollaborating={isCollaborating}
        participants={collabParticipants}
        onOpenCollaboration={() => setIsCollaborationModalOpen(true)}
      />

      {/* Main App Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!plan ? (
          /* Generation Input Screen */
          <FormSection
            onGenerate={handleGenerate}
            isLoading={isLoading}
            loadingStep={loadingStep}
          />
        ) : (
          /* Interactive Pitch Deck Workspace */
          <div className="space-y-6">
            {/* Story Arc & Business Analysis Inspector */}
            <StoryArcInspector analysis={plan.analysis} slides={plan.slides} />

            {/* Editorial Deck Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-5 py-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-sm tracking-tight">{plan.title}</span>
                <span className="text-slate-600">•</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 capitalize font-medium">
                  {plan.tone} tone
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-medium">{plan.slides.length} slides</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Collaborative Room Status Indicator */}
                <button
                  onClick={() => setIsCollaborationModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold text-xs rounded-xl transition-all border ${
                    isCollaborating
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-900/30'
                      : 'bg-indigo-950/40 text-indigo-300 border-indigo-700/50 hover:bg-indigo-900/50'
                  }`}
                  title="Collaborative multi-user session overlay"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isCollaborating
                      ? `Room ${sessionId} (${collabParticipants.length})`
                      : 'Live Collaborate'}
                  </span>
                </button>

                {/* Version History Checkpoint Trigger */}
                <button
                  onClick={() => setIsSnapshotModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-xs text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-700/60 rounded-xl transition-all"
                  title="View deck version checkpoints or create a manual restore point"
                >
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Snapshots ({snapshots.length})</span>
                </button>

                {/* Deck-Wide Smart Layout Optimizer */}
                <button
                  onClick={handleOptimizeDeckLayouts}
                  className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-xs text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-700/60 rounded-xl transition-all"
                  title="Auto-optimize visual layout variety across all slides based on content fit"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Smart Layout Deck</span>
                </button>

                {previousPlan && (
                  <button
                    onClick={handleRevertPolish}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded-xl transition-colors font-semibold"
                    title="Undo the last polish changes"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Polish</span>
                  </button>
                )}
                <button
                  onClick={() => setIsPolishModalOpen(true)}
                  disabled={isPolishing}
                  className="flex items-center gap-2 px-3.5 py-1.5 font-semibold text-xs text-purple-100 bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600 hover:from-purple-600 hover:via-indigo-500 hover:to-pink-500 rounded-xl shadow-md shadow-purple-900/30 transition-all border border-purple-400/30"
                  title="Run all slides through AI to standardize tone, fix grammar, and improve phrasing"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
                  <span>Professional Polish ({plan.slides.length} Slides)</span>
                </button>
              </div>
            </div>

            {/* Workspace Grid */}
            <div className="flex flex-col lg:flex-row items-start gap-6">
              {/* Sidebar Thumbnail Strip */}
              <SlideSidebar
                slides={plan.slides}
                activeIndex={activeSlideIndex}
                themeName={plan.theme}
                onSelectSlide={handleSelectSlide}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDeleteSlide={handleDeleteSlide}
                onAddSlide={handleAddSlide}
                onDuplicateSlide={handleDuplicateSlide}
              />

              {/* Main Slide Editor & Canvas Area */}
              <div className="flex-1 w-full flex flex-col items-center">
                {plan.slides[activeSlideIndex] && (
                  <>
                    <SlideCanvas
                      slide={plan.slides[activeSlideIndex]}
                      slideIndex={activeSlideIndex}
                      totalSlides={plan.slides.length}
                      themeName={plan.theme}
                      onUpdateSlide={handleUpdateSlide}
                      onRegenerateSlide={handleRegenerateSlide}
                      analysis={plan.analysis}
                      isRegenerating={isRegenerating}
                      onOptimizeDeck={handleOptimizeDeckLayouts}
                      onDuplicateSlide={() => handleDuplicateSlide(activeSlideIndex)}
                      onSplitSlide={() => handleSplitSlide(activeSlideIndex)}
                      onOpenImageStudio={() => setIsImageStudioOpen(true)}
                      isCollaborating={isCollaborating}
                      sessionId={sessionId}
                      participants={collabParticipants}
                      currentUserId={collabUser.id}
                      remoteCursors={remoteCursors}
                      reactions={collabReactions}
                      showRemoteCursors={showRemoteCursors}
                      followPresenter={followPresenter}
                      isHost={isCollabHost}
                      onToggleCursors={() => setShowRemoteCursors((prev) => !prev)}
                      onToggleFollow={() => setFollowPresenter((prev) => !prev)}
                      onSendReaction={sendCollabReaction}
                      onOpenSessionModal={() => setIsCollaborationModalOpen(true)}
                      onCursorMove={(x, y) => broadcastCursor(x, y, activeSlideIndex)}
                    />

                    {/* Speaker Notes Drawer */}
                    <SpeakerNotesPanel
                      slide={plan.slides[activeSlideIndex]}
                      onUpdateNotes={(newNotes) => {
                        handleUpdateSlide({
                          ...plan.slides[activeSlideIndex],
                          content: {
                            ...plan.slides[activeSlideIndex].content,
                            speakerNotes: newNotes,
                          },
                        });
                        showToast('Speaker notes updated');
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fullscreen Presentation Mode Modal */}
      {isPresenting && plan && (
        <PresentationMode
          plan={plan}
          initialSlideIndex={activeSlideIndex}
          onClose={() => setIsPresenting(false)}
          onOpenVideoExport={() => {
            setIsPresenting(false);
            setIsVideoExportModalOpen(true);
          }}
          isCollaborating={isCollaborating}
          sessionId={sessionId}
          participants={collabParticipants}
          currentUserId={collabUser.id}
          remoteCursors={remoteCursors}
          reactions={collabReactions}
          showRemoteCursors={showRemoteCursors}
          followPresenter={followPresenter}
          isHost={isCollabHost}
          onToggleCursors={() => setShowRemoteCursors((prev) => !prev)}
          onToggleFollow={() => setFollowPresenter((prev) => !prev)}
          onSendReaction={sendCollabReaction}
          onOpenSessionModal={() => setIsCollaborationModalOpen(true)}
          onCursorMove={(x, y) => broadcastCursor(x, y, activeSlideIndex)}
          onSlideChange={handleSelectSlide}
        />
      )}

      {/* Real-Time Collaboration Workspace Hub Modal */}
      {isCollaborationModalOpen && (
        <CollaborationModal
          isOpen={isCollaborationModalOpen}
          onClose={() => setIsCollaborationModalOpen(false)}
          sessionId={sessionId}
          sessionTitle={sessionTitle || plan?.title || 'Shared Pitch Deck'}
          isConnected={isCollaborating}
          isConnecting={isCollabConnecting}
          isHost={isCollabHost}
          currentUser={collabUser}
          participants={collabParticipants}
          messages={collabMessages}
          currentSlideIndex={activeSlideIndex}
          totalSlides={plan ? plan.slides.length : 0}
          currentPlan={plan}
          followPresenter={followPresenter}
          onToggleFollow={() => setFollowPresenter((prev) => !prev)}
          onJoinSession={(room, p, forceHost) =>
            joinSession(room, p || plan || undefined, forceHost)
          }
          onLeaveSession={leaveSession}
          onUpdateProfile={updateUserProfile}
          onBroadcastSlide={(idx, force) => broadcastSlideChange(idx, force)}
          onBroadcastDeck={broadcastDeckUpdate}
          onSendMessage={sendCollabMessage}
          onSendReaction={sendCollabReaction}
        />
      )}

      {/* Professional Polish Modal */}
      {isPolishModalOpen && plan && (
        <PolishModal
          isOpen={isPolishModalOpen}
          onClose={() => setIsPolishModalOpen(false)}
          plan={plan}
          onApplyPolish={handleApplyPolish}
          onRevertPolish={previousPlan ? handleRevertPolish : undefined}
          canRevert={Boolean(previousPlan)}
        />
      )}

      {/* Version History Checkpoint Modal */}
      {isSnapshotModalOpen && plan && (
        <DeckSnapshotModal
          isOpen={isSnapshotModalOpen}
          onClose={() => setIsSnapshotModalOpen(false)}
          snapshots={snapshots}
          currentPlan={plan}
          onCreateSnapshot={handleCreateSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
          onDeleteSnapshot={handleDeleteSnapshot}
        />
      )}

      {/* Export to MP4 Video Recording Modal */}
      {isVideoExportModalOpen && plan && (
        <VideoExportModal
          isOpen={isVideoExportModalOpen}
          onClose={() => setIsVideoExportModalOpen(false)}
          plan={plan}
        />
      )}

      {/* AI-Powered Image Search and Generation Studio Modal */}
      {isImageStudioOpen && plan && plan.slides[activeSlideIndex] && (
        <ImageStudioModal
          isOpen={isImageStudioOpen}
          onClose={() => setIsImageStudioOpen(false)}
          slide={plan.slides[activeSlideIndex]}
          themeName={plan.theme}
          presentationTitle={plan.title}
          onApplyVisual={handleApplyVisual}
        />
      )}
    </div>
  );
}
