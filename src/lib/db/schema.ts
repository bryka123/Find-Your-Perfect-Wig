// Database schema for app management data
// This can be stored in SQLite, PostgreSQL, or Shopify metafields

export interface AppSettings {
  id: string;
  shop: string;
  scoringWeights: ScoringWeights;
  colorFamilies: ColorFamilySettings[];
  syncSettings: SyncSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoringWeights {
  color: number;      // 0.55 default
  texture: number;    // 0.20 default
  availability: number; // 0.10 default
  popularity: number;   // 0.10 default
  capFeature: number;   // 0.05 default
}

export interface ColorFamilySettings {
  id: string;
  name: string; // 'blonde', 'brunette', etc.
  displayName: string; // 'Golden Blonde', 'Rich Brunette'
  undertones: UndertoneSettings[];
  rootedVariants: RootedVariant[];
  labValues: [number, number, number]; // LAB color space
  hexColor: string; // For UI display
  enabled: boolean;
}

export interface UndertoneSettings {
  id: string;
  name: string; // 'warm', 'cool', 'neutral'
  description: string;
  labAdjustment: [number, number, number]; // LAB adjustments
  examples: string[]; // Example shade names
}

export interface RootedVariant {
  id: string;
  name: string; // 'SS (Shaded)', 'RT (Rooted)', 'TT (Tipped)'
  description: string;
  rootColor: string; // Base color at roots
  tipColor: string; // Color at tips
  gradientType: 'linear' | 'ombre' | 'highlights' | 'lowlights';
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  webhooksEnabled: boolean;
  lastSync?: Date;
  lastSyncStatus: 'success' | 'failed' | 'pending' | 'never';
  lastSyncStats?: {
    totalProducts: number;
    totalVariants: number;
    errors: string[];
  };
}

export interface SyncLog {
  id: string;
  shop: string;
  timestamp: Date;
  type: 'manual' | 'webhook' | 'scheduled';
  status: 'success' | 'failed' | 'pending';
  stats: {
    totalProducts: number;
    totalVariants: number;
    processed: number;
    errors: string[];
  };
  duration: number; // milliseconds
}

export interface WebhookLog {
  id: string;
  shop: string;
  timestamp: Date;
  topic: string;
  status: 'success' | 'failed' | 'pending';
  payload: any;
  errorMessage?: string;
  processingTime: number; // milliseconds
}

export interface ErrorLog {
  id: string;
  shop: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  source: 'sync' | 'webhook' | 'api' | 'matching' | 'vector_store';
  message: string;
  details: any;
  resolved: boolean;
}







