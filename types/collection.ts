export type CollectibleType = 'stamp' | 'coin' | 'banknote' | 'card' | 'other';

export interface CollectionItem {
  id: string;
  userId?: string;
  type: CollectibleType;
  name: string;
  description?: string;
  estimatedValueMin?: number;
  estimatedValueMax?: number;
  estimatedValueCurrency: string;
  confidenceScore?: number;
  historicalInfo?: string;
  originCountry?: string;
  originYear?: string;
  imageUrl?: string;
  aiAnalysis?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanResult {
  type: CollectibleType;
  name: string;
  description: string;
  estimatedValueMin: number;
  estimatedValueMax: number;
  currency: string;
  confidenceScore: number;
  historicalInfo: string;
  originCountry: string;
  originYear: string;
  condition: string;
  rarity: string;
  keyFacts: string[];
}
