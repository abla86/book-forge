import { useState, useEffect, useCallback } from 'react';
import { FantasyCharacter } from './types';
import { generateRandomCharacter, getFallbackCartoonPortraitUrl, CLASSES } from './data/characterData';
import { CharacterCard } from './components/CharacterCard';
import { Dices, Sparkles, Wand2, ShieldAlert, History } from 'lucide-react';

export default function App() {
  const [character, setCharacter] = useState<FantasyCharacter | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('random');
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState<boolean>(false);
  const [portraitCounter, setPortraitCounter] = useState<number>(1);
  const [characterHistory, setCharacterHistory] = useState<FantasyCharacter[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Generate a random fantasy character
  const handleGenerateCharacter = useCallback((classOverride?: string) => {
    const classToUse = classOverride || (selectedClass !== 'random' ? selectedClass : undefined);
    const newChar = generateRandomCharacter(classToUse);

    // Initial default cartoon portrait for immediate visual appeal
    const initialPortrait = getFallbackCartoonPortraitUrl(newChar, 'v1');
    const charWithPortrait: FantasyCharacter = {
      ...newChar,
      portraitUrl: initialPortrait,
    };

    setCharacter(charWithPortrait);
    setPortraitCounter(1);
    setCharacterHistory(prev => [charWithPortrait, ...prev.slice(0, 5)]);

    setNotification(`Generated ${charWithPortrait.name} the ${charWithPortrait.class}!`);
    setTimeout(() => setNotification(null), 3000);
  }, [selectedClass]);

  // Initial character generation on first mount
  useEffect(() => {
    handleGenerateCharacter();
  }, [handleGenerateCharacter]);

  // Request a portrait from the server (calls Gemini with instant fallback)
  const fetchPortrait = async (currentChar: FantasyCharacter, seedVariant: string) => {
    setIsGeneratingPortrait(true);
    try {
      const response = await fetch('/api/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentChar.name,
          class: currentChar.class,
          race: currentChar.race,
          seed: seedVariant,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const newImageUrl = data.imageUrl || getFallbackCartoonPortraitUrl(currentChar, seedVariant);

      setCharacter(prev => (prev ? { ...prev, portraitUrl: newImageUrl } : null));
      setNotification(`Portrait created in cartoon/video game style!`);
    } catch (err) {
      console.warn('Backend portrait fetch failed, using fallback portrait:', err);
      const fallback = getFallbackCartoonPortraitUrl(currentChar, seedVariant);
      setCharacter(prev => (prev ? { ...prev, portraitUrl: fallback } : null));
      setNotification(`Portrait generated in cartoon/video game style!`);
    } finally {
      setIsGeneratingPortrait(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Generate portrait for currently displayed character
  const handleGeneratePortrait = () => {
    if (!character) return;
    const nextSeed = `gen-${portraitCounter}-${Date.now()}`;
    setPortraitCounter(prev => prev + 1);
    fetchPortrait(character, nextSeed);
  };

  // Regenerate portrait for currently displayed character
  const handleRegeneratePortrait = () => {
    if (!character) return;
    const nextSeed = `regen-${portraitCounter + 1}-${Date.now()}`;
    setPortraitCounter(prev => prev + 1);
    fetchPortrait(character, nextSeed);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation / App Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                Fantasy Character Generator
              </h1>
              <p className="text-xs text-slate-500">
                Core Generator & Cartoon / Video Game Style Portraits
              </p>
            </div>
          </div>

          {/* Quick Generate Action */}
          <button
            type="button"
            id="header-generate-btn"
            onClick={() => handleGenerateCharacter()}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition duration-150 cursor-pointer"
          >
            <Dices className="w-4 h-4 text-amber-400" />
            <span>New Character</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col items-center">
        {/* Toast Notification */}
        {notification && (
          <div
            id="toast-notification"
            className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 z-50 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Primary Controls Container */}
        <section
          aria-label="Character Generation Controls"
          className="w-full max-w-3xl mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Class Filter Selector */}
            <div className="w-full sm:w-auto flex items-center gap-2">
              <label htmlFor="class-select" className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Class Focus:
              </label>
              <select
                id="class-select"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm font-medium rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden w-full sm:w-44"
              >
                <option value="random">🎲 Any / Random Class</option>
                <option value="Mage">🔮 Mage</option>
                <option value="Rogue">🗡️ Rogue</option>
                <option value="Warrior">⚔️ Warrior</option>
                {CLASSES.filter(c => !['Mage', 'Rogue', 'Warrior'].includes(c)).map(c => (
                  <option key={c} value={c}>
                    ✨ {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Main Primary Button requested in Task 1 */}
            <button
              type="button"
              id="generate-character-btn"
              data-action="generate-character"
              onClick={() => handleGenerateCharacter()}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-98 text-white font-bold rounded-xl text-sm sm:text-base shadow-md hover:shadow-lg transition duration-150 cursor-pointer"
            >
              <Dices className="w-5 h-5 text-amber-300" />
              <span>Generate Character</span>
            </button>
          </div>
        </section>

        {/* Active Character Display Card */}
        <section aria-label="Character Profile" className="w-full max-w-3xl">
          {character ? (
            <CharacterCard
              character={character}
              isGeneratingPortrait={isGeneratingPortrait}
              onGeneratePortrait={handleGeneratePortrait}
              onRegeneratePortrait={handleRegeneratePortrait}
            />
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700">No Character Generated Yet</h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                Click the Generate Character button to summon a hero with Name and Class.
              </p>
              <button
                type="button"
                onClick={() => handleGenerateCharacter()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
              >
                Generate Character
              </button>
            </div>
          )}
        </section>

        {/* Recent Characters History */}
        {characterHistory.length > 1 && (
          <section className="w-full max-w-3xl mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-slate-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent Generated Characters
              </h4>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {characterHistory.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCharacter(item)}
                  className={`shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-150 ${
                    character?.id === item.id
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.portraitUrl ? (
                    <img
                      src={item.portraitUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-xs">
                      {item.name[0]}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold leading-tight truncate max-w-[110px]">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {item.class} • Lvl {item.level}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>
          Fantasy Character Generator • Features Name, Class, and Cartoon/Video Game Style Portraits
        </p>
      </footer>
    </div>
  );
}
