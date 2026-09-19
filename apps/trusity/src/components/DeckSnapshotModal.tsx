import React, { useState } from 'react';
import {
  History,
  X,
  RotateCcw,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';
import { DeckSnapshot, PresentationPlan } from '../types';

interface DeckSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: DeckSnapshot[];
  currentPlan: PresentationPlan;
  onRestoreSnapshot: (snapshot: DeckSnapshot) => void;
  onCreateSnapshot: (label: string) => void;
  onDeleteSnapshot: (id: string) => void;
}

export const DeckSnapshotModal: React.FC<DeckSnapshotModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  currentPlan,
  onRestoreSnapshot,
  onCreateSnapshot,
  onDeleteSnapshot,
}) => {
  const [newLabel, setNewLabel] = useState('');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim() || `Snapshot #${snapshots.length + 1}`;
    onCreateSnapshot(label);
    setNewLabel('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Version History & Snapshots
              </h3>
              <p className="text-xs text-slate-400">
                Safe checkpoints created before AI actions, polish runs, and manual edits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Create New Snapshot Form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Name this checkpoint (e.g. 'Pre-Investor Demo')..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Version</span>
            </button>
          </form>

          {/* Snapshots List */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Saved Checkpoints ({snapshots.length})
            </span>

            {snapshots.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                No checkpoints saved yet. A checkpoint is automatically created when you run
                Professional Polish, or you can create one above.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {snapshots.map((snap) => {
                  const dateStr = new Date(snap.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <div
                      key={snap.id}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {snap.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">
                            {snap.slideCount} slides
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span className="capitalize">{snap.theme} theme</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Restore deck to checkpoint "${snap.label}"?`)) {
                              onRestoreSnapshot(snap);
                              onClose();
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all"
                          title="Restore this version"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteSnapshot(snap.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/95 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
