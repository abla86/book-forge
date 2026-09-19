import { FantasyCharacter } from '../types';

export const CLASSES = [
  'Mage',
  'Rogue',
  'Warrior',
  'Paladin',
  'Ranger',
  'Cleric',
  'Bard',
  'Druid',
];

export const RACES = [
  'Elf',
  'Human',
  'Dwarf',
  'Tiefling',
  'Dragonborn',
  'Halfling',
  'Gnome',
  'Orc',
];

const FIRST_NAMES = [
  'Aeloria',
  'Thorne',
  'Kaelen',
  'Lyra',
  'Valerius',
  'Morrigan',
  'Zephyr',
  'Eldrin',
  'Seraphina',
  'Gideon',
  'Brynna',
  'Roderic',
  'Sylas',
  'Rowan',
  'Cassian',
  'Astrid',
  'Dorian',
  'Gwyneira',
  'Fenris',
  'Talia',
  'Orion',
  'Theron',
  'Isolde',
  'Vesper',
  'Corvus',
];

const SURNAMES = [
  'Nightbreeze',
  'Ironbreaker',
  'Shadowstep',
  'Sunshard',
  'Frostweaver',
  'Stormborn',
  'Silverleaf',
  'Flamecaller',
  'Stoneguard',
  'Whisperwind',
  'Drakeblood',
  'Deepdelver',
  'Moonshadow',
  'Ravenshield',
  'Starfall',
  'Ashwalker',
  'Bloodfang',
  'Runevale',
  'Dawnseeker',
  'Gloomweaver',
];

const TITLES: Record<string, string[]> = {
  Mage: ['Master of the Arcane', 'Scholar of Ember & Ice', 'The Astral Weaver', 'Pyromancer of the Citadel'],
  Rogue: ['The Whisper in the Dark', 'Master Infiltrator', 'The Phantom Blade', 'Dagger of the Black Alley'],
  Warrior: ['Champion of the Vanguard', 'The Shield of Valor', 'The Unbroken Mountain', 'Warden of the Iron Gate'],
  Paladin: ['Bearer of the Sacred Oath', 'Knight of the Sunlit Order', 'Protector of the Innocent', 'Justiciar of Light'],
  Ranger: ['Ghost of the Deepwoods', 'The Hawkeye Tracker', 'Stalker of the Wild Frontier', 'Beast Whisperer'],
  Cleric: ['Vessel of Grace', 'High Priest of the Dawn', 'Beacon of the Fallen', 'Hand of the Sanctum'],
  Bard: ['Weaver of Ballads', 'The Silver Tongue', 'Jester of the High Court', 'Voice of the Lost Ages'],
  Druid: ['Voice of the Ancient Grove', 'Keeper of the Verdant Cycle', 'Shapeshifter of the Wilds', 'Storm Druid'],
};

const ABILITIES: Record<string, string[]> = {
  Mage: ['Arcane Singularity: Summons a vortex of cosmic energy', 'Pyroclastic Surge: Channels intense fireballs', 'Chrono Shift: Slows time around enemies'],
  Rogue: ['Shadow Step: Teleports behind target in a wisp of smoke', 'Poisoned Flurry: A lightning strike of envenomed daggers', 'Smoke Veil: Conceals the entire party from detection'],
  Warrior: ['Titan Slam: Smashes the ground creating a shockwave', 'Battle Cry: Boosts allies attack power and morale', 'Iron Bulwark: Completely deflects the next lethal strike'],
  Paladin: ['Radiant Smite: Imbues blade with blinding holy judgment', 'Aura of Sanctuary: Shields nearby companions from dark curses', 'Lay on Hands: Instantly restores vitality to wounded comrades'],
  Ranger: ['Piercing Barrage: Fires a hail of enchanted arrows', 'Call of the Wild Wolf: Summons an alpha direwolf companion', 'Camouflage Camber: Blends invisibly into surrounding terrain'],
  Cleric: ['Divine Resurrection: Channels restorative miracles to heal party', 'Radiant Dawn: Scorches undead with pure heavenly light', 'Blessing of Fortitude: Grants unyielding endurance'],
  Bard: ['Harmonic Discord: Disorients foes with hypnotic chords', 'Inspiring Crescendo: Maximizes ally critical strike potency', 'Lullaby of the Stars: Puts hostile targets into gentle slumber'],
  Druid: ['Primal Metamorphosis: Shifts into an armored bear form', 'Entangling Roots: Summons thorned brambles to root enemies', 'Verdant Rejuvenation: Blooms healing flora across the field'],
};

const BIOS: Record<string, string[]> = {
  Mage: [
    'A dedicated student of ancient ruins who deciphered celestial glyphs atop the Whispering Peaks.',
    'Exiled from the High Spire for seeking forbidden astral knowledge, now wandering to protect the realm.',
    'Born under a twin-moon eclipse, channeling raw elemental currents through an enchanted crystal focus.',
  ],
  Rogue: [
    'Trained in the rooftops of the Gilded Quarter, known for slipping through impenetrable vaults unnoticed.',
    'A former scout who survived treacherous dungeons by wit, stealth, and razor-sharp reflexes.',
    'Operates along the fog-laden docks, balancing a moral compass against royal bounties.',
  ],
  Warrior: [
    'A hardened veteran of the Northern Border Wars, bearing scars and a heavy claymore forged in dragonfire.',
    'Former commander of the Royal Guard, now a freelance mercenary defending defenseless villages.',
    'Raised in the mountain clan where strength and honor are tempered like fine steel.',
  ],
  Paladin: [
    'Bound by an inviolable oath of celestial light, wandering the scorched lands to vanquish corruption.',
    'A noble knight who gave up titles and estates to defend the downtrodden against encroaching shadows.',
  ],
  Ranger: [
    'A solitary guardian of the primeval woods, able to track a single leaf disturbed three leagues away.',
    'Friend to forest beasts and fierce adversary to poachers and despoilers of nature.',
  ],
  Cleric: [
    'Devout healer whose prayers bring warmth to the dying and banish lingering malevolent spirits.',
    'A compassionate wanderer bringing medicines and blessings to remote frontier hamlets.',
  ],
  Bard: [
    'A charismatic traveler with a lute strung with silk from mystic spiders, collecting legends across kingdoms.',
    'Performs in bustling taverns and grand halls, hiding subtle rebel messages inside beloved tavern tunes.',
  ],
  Druid: [
    'Communes with primordial trees and wild spirits, defending sacred stone circles from reckless miners.',
    'Walks between human settlements and untamed wilderness, restoring equilibrium where chaos reigns.',
  ],
};

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomCharacter(preferredClass?: string): FantasyCharacter {
  const charClass = preferredClass && CLASSES.includes(preferredClass)
    ? preferredClass
    : getRandomItem(CLASSES);

  const firstName = getRandomItem(FIRST_NAMES);
  const surname = getRandomItem(SURNAMES);
  const race = getRandomItem(RACES);
  const classTitles = TITLES[charClass] || ['The Adventurer'];
  const classAbilities = ABILITIES[charClass] || ['Mighty Strike'];
  const classBios = BIOS[charClass] || ['A brave adventurer setting forth on epic quests.'];

  // Base stats tailored to class archetype
  let strength = getRandomNumber(8, 16);
  let agility = getRandomNumber(8, 16);
  let intelligence = getRandomNumber(8, 16);
  let vitality = getRandomNumber(8, 16);

  if (charClass === 'Warrior' || charClass === 'Paladin') {
    strength += getRandomNumber(3, 5);
    vitality += getRandomNumber(2, 4);
  } else if (charClass === 'Mage') {
    intelligence += getRandomNumber(4, 6);
  } else if (charClass === 'Rogue' || charClass === 'Ranger') {
    agility += getRandomNumber(4, 6);
  } else if (charClass === 'Cleric' || charClass === 'Druid') {
    vitality += getRandomNumber(2, 4);
    intelligence += getRandomNumber(2, 4);
  } else if (charClass === 'Bard') {
    agility += getRandomNumber(2, 4);
    intelligence += getRandomNumber(2, 4);
  }

  const id = `char-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    name: `${firstName} ${surname}`,
    class: charClass,
    race,
    title: getRandomItem(classTitles),
    level: getRandomNumber(1, 10),
    bio: getRandomItem(classBios),
    ability: getRandomItem(classAbilities),
    stats: {
      strength,
      agility,
      intelligence,
      vitality,
    },
    portraitStyle: 'cartoon/video game style',
  };
}

/**
 * Generates a colorful, cartoon video-game style avatar URL for fallback or instant display
 */
export function getFallbackCartoonPortraitUrl(char: { name: string; class: string; race?: string }, seedModifier?: string): string {
  const seed = encodeURIComponent(`${char.name}-${char.class}-${seedModifier || 'v1'}`);
  // Use Dicebear adventurer collection which produces vibrant, colorful cartoon/video game style RPG portraits
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=12`;
}
