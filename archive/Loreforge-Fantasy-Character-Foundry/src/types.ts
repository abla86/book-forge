export interface CharacterStats {
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
}

export interface FantasyCharacter {
  id: string;
  name: string;
  class: string; // 'Mage', 'Rogue', 'Warrior', etc.
  race: string;
  title: string;
  level: number;
  bio: string;
  ability: string;
  stats: CharacterStats;
  portraitUrl?: string;
  portraitStyle: string;
  portraitSeed?: string;
}

export interface PortraitGenerationResponse {
  imageUrl: string;
  source: 'gemini' | 'fallback';
  message?: string;
}
