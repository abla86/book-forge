import { useState } from 'react';
import { FantasyCharacter } from '../types';
import { Sparkles, RefreshCw, Shield, Zap, Award, User, Image as ImageIcon } from 'lucide-react';

interface CharacterCardProps {
  character: FantasyCharacter;
  isGeneratingPortrait: boolean;
  onGeneratePortrait: () => void;
  onRegeneratePortrait: () => void;
}

export function CharacterCard({
  character,
  isGeneratingPortrait,
  onGeneratePortrait,
  onRegeneratePortrait,
}: CharacterCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  // Class badge color scheme
  const getClassColor = (c: string) => {
    switch (c.toLowerCase()) {
      case 'mage':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'rogue':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'warrior':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'paladin':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ranger':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'cleric':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'bard':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'druid':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div
      id="character-display-card"
      className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transition-all duration-300"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8">
        {/* Left Column: Portrait and Portrait Buttons */}
        <div className="md:col-span-5 flex flex-col items-center justify-start space-y-4">
          <div
            id="portrait-container"
            className="relative w-full max-w-[280px] aspect-square rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-inner group"
          >
            {character.portraitUrl ? (
              <>
                <img
                  id="character-portrait"
                  key={character.portraitUrl}
                  src={character.portraitUrl}
                  alt={`Cartoon/video game style portrait of ${character.name}`}
                  referrerPolicy="no-referrer"
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imgLoaded && !isGeneratingPortrait ? 'opacity-100' : 'opacity-80'
                  }`}
                />
                {isGeneratingPortrait && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-2" />
                    <span className="text-sm font-medium">Generating Portrait...</span>
                    <span className="text-xs text-slate-300 mt-1">Cartoon / Video Game Style</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                {isGeneratingPortrait ? (
                  <>
                    <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
                    <span className="text-sm font-medium text-slate-700">Generating Portrait...</span>
                    <span className="text-xs text-slate-500 mt-1">Cartoon / Video Game Style</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 stroke-[1.5] text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-600">No Portrait Yet</span>
                    <span className="text-xs text-slate-400 mt-1">
                      Click below to generate a cartoon/video game style portrait
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Badge overlay on top corner */}
            <div className="absolute top-2 right-2 bg-slate-900/75 backdrop-blur-xs text-amber-300 text-[11px] font-semibold px-2 py-0.5 rounded-md tracking-wide">
              Cartoon / Video Game Style
            </div>
          </div>

          {/* Portrait Action Controls */}
          <div className="w-full max-w-[280px] space-y-2 pt-1" id="portrait-controls">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="generate-portrait-btn"
                data-action="generate-portrait"
                onClick={onGeneratePortrait}
                disabled={isGeneratingPortrait}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-xl text-xs sm:text-sm shadow-sm transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                title="Generate cartoon/video game style portrait"
              >
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Generate</span>
              </button>

              <button
                type="button"
                id="regenerate-portrait-btn"
                data-action="regenerate-portrait"
                onClick={onRegeneratePortrait}
                disabled={isGeneratingPortrait}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-900 font-medium rounded-xl text-xs sm:text-sm shadow-sm transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                title="Regenerate cartoon/video game style portrait"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isGeneratingPortrait ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-500 italic">
              Cartoon / video game style portrait of {character.name}
            </p>
          </div>
        </div>

        {/* Right Column: Character Details (Name, Class, Stats, Lore) */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-5">
          <div>
            {/* Header: Name and Class */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Name</span>
                </div>
                <h2
                  id="character-name"
                  className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-0.5"
                >
                  {character.name}
                </h2>
                <p className="text-sm font-medium text-indigo-600 italic">
                  {character.title}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block mb-1">
                  Class
                </span>
                <span
                  id="character-class"
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold border ${getClassColor(
                    character.class
                  )}`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  {character.class}
                </span>
                <span className="block text-xs text-slate-500 mt-1 font-medium">
                  {character.race} • Level {character.level}
                </span>
              </div>
            </div>

            {/* Backstory / Bio */}
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Background & Lore
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                "{character.bio}"
              </p>
            </div>

            {/* Signature Ability */}
            <div className="mt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Signature Ability</span>
              </div>
              <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 text-sm text-amber-950 font-medium">
                {character.ability}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-indigo-500" />
                Character Attributes
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Strength</span>
                <span className="text-lg font-bold text-slate-800">{character.stats.strength}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Agility</span>
                <span className="text-lg font-bold text-slate-800">{character.stats.agility}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Intelligence</span>
                <span className="text-lg font-bold text-slate-800">{character.stats.intelligence}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block">Vitality</span>
                <span className="text-lg font-bold text-slate-800">{character.stats.vitality}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
