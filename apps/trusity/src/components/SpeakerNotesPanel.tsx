import React, { useState } from 'react';
import { Mic, Clock, Sparkles, Check, Edit2, Volume2, Copy } from 'lucide-react';
import { Slide } from '../types';

interface SpeakerNotesPanelProps {
  slide: Slide;
  onUpdateNotes: (notes: string) => void;
}

export const SpeakerNotesPanel: React.FC<SpeakerNotesPanelProps> = ({
  slide,
  onUpdateNotes,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notesText, setNotesText] = useState(slide.content.speakerNotes || '');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    setNotesText(slide.content.speakerNotes || '');
    setIsEditing(false);
  }, [slide.id, slide.content.speakerNotes]);

  const handleSave = () => {
    onUpdateNotes(notesText);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = (notesText || '').trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((wordCount / 130) * 60); // standard speaking rate 130 wpm

  return (
    <div className="w-full max-w-4xl bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg mt-4 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-200">
              AI Presenter Speaker Notes
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> ~{estimatedSeconds}s talk time
              </span>
              <span>•</span>
              <span>{wordCount} words</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-all"
            title="Copy notes"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              isEditing
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
            <span>{isEditing ? 'Save' : 'Edit'}</span>
          </button>
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          rows={3}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none font-sans leading-relaxed"
          placeholder="Type or customize your speaker notes..."
        />
      ) : (
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 font-sans">
          "{notesText || 'No speaker notes written for this slide yet.'}"
        </p>
      )}
    </div>
  );
};
