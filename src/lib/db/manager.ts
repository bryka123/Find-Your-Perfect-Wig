// Simple in-memory database manager 
// In production, replace with PostgreSQL, SQLite, or Shopify metafields

import { 
  AppSettings, 
  ScoringWeights, 
  ColorFamilySettings, 
  SyncLog, 
  WebhookLog, 
  ErrorLog,
  UndertoneSettings,
  RootedVariant 
} from './schema';

// In-memory storage (replace with real database in production)
const appSettingsStore = new Map<string, AppSettings>();
const syncLogsStore = new Map<string, SyncLog[]>();
const webhookLogsStore = new Map<string, WebhookLog[]>();
const errorLogsStore = new Map<string, ErrorLog[]>();

export class DatabaseManager {
  private static instance: DatabaseManager;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // App Settings Management
  async getAppSettings(shop: string): Promise<AppSettings> {
    const existing = appSettingsStore.get(shop);
    if (existing) {
      return existing;
    }

    // Return default settings
    const defaultSettings: AppSettings = {
      id: `settings_${shop}`,
      shop,
      scoringWeights: {
        color: 0.55,
        texture: 0.20,
        availability: 0.10,
        popularity: 0.10,
        capFeature: 0.05
      },
      colorFamilies: this.getDefaultColorFamilies(),
      syncSettings: {
        autoSync: false,
        syncInterval: 60, // 1 hour
        webhooksEnabled: true,
        lastSyncStatus: 'never'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    appSettingsStore.set(shop, defaultSettings);
    return defaultSettings;
  }

  async updateAppSettings(shop: string, updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getAppSettings(shop);
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date()
    };
    
    appSettingsStore.set(shop, updated);
    return updated;
  }

  async updateScoringWeights(shop: string, weights: ScoringWeights): Promise<AppSettings> {
    return this.updateAppSettings(shop, { scoringWeights: weights });
  }

  async updateColorFamilies(shop: string, colorFamilies: ColorFamilySettings[]): Promise<AppSettings> {
    return this.updateAppSettings(shop, { colorFamilies });
  }

  // Color Family Management
  async getColorFamily(shop: string, familyId: string): Promise<ColorFamilySettings | null> {
    const settings = await this.getAppSettings(shop);
    return settings.colorFamilies.find(cf => cf.id === familyId) || null;
  }

  async createColorFamily(shop: string, colorFamily: Omit<ColorFamilySettings, 'id'>): Promise<ColorFamilySettings> {
    const settings = await this.getAppSettings(shop);
    const newFamily: ColorFamilySettings = {
      ...colorFamily,
      id: `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    settings.colorFamilies.push(newFamily);
    await this.updateAppSettings(shop, { colorFamilies: settings.colorFamilies });
    
    return newFamily;
  }

  async updateColorFamily(shop: string, familyId: string, updates: Partial<ColorFamilySettings>): Promise<ColorFamilySettings | null> {
    const settings = await this.getAppSettings(shop);
    const familyIndex = settings.colorFamilies.findIndex(cf => cf.id === familyId);
    
    if (familyIndex === -1) return null;
    
    settings.colorFamilies[familyIndex] = {
      ...settings.colorFamilies[familyIndex],
      ...updates
    };
    
    await this.updateAppSettings(shop, { colorFamilies: settings.colorFamilies });
    return settings.colorFamilies[familyIndex];
  }

  async deleteColorFamily(shop: string, familyId: string): Promise<boolean> {
    const settings = await this.getAppSettings(shop);
    const initialLength = settings.colorFamilies.length;
    settings.colorFamilies = settings.colorFamilies.filter(cf => cf.id !== familyId);
    
    if (settings.colorFamilies.length < initialLength) {
      await this.updateAppSettings(shop, { colorFamilies: settings.colorFamilies });
      return true;
    }
    
    return false;
  }

  // Sync Logging
  async addSyncLog(log: Omit<SyncLog, 'id'>): Promise<SyncLog> {
    const newLog: SyncLog = {
      ...log,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const logs = syncLogsStore.get(log.shop) || [];
    logs.unshift(newLog); // Add to beginning
    logs.splice(50); // Keep only last 50 logs
    syncLogsStore.set(log.shop, logs);
    
    // Update last sync info in app settings
    await this.updateAppSettings(log.shop, {
      syncSettings: {
        ...(await this.getAppSettings(log.shop)).syncSettings,
        lastSync: log.timestamp,
        lastSyncStatus: log.status,
        lastSyncStats: log.stats
      }
    });
    
    return newLog;
  }

  async getSyncLogs(shop: string, limit = 20): Promise<SyncLog[]> {
    const logs = syncLogsStore.get(shop) || [];
    return logs.slice(0, limit);
  }

  // Webhook Logging
  async addWebhookLog(log: Omit<WebhookLog, 'id'>): Promise<WebhookLog> {
    const newLog: WebhookLog = {
      ...log,
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const logs = webhookLogsStore.get(log.shop) || [];
    logs.unshift(newLog);
    logs.splice(100); // Keep only last 100 webhook logs
    webhookLogsStore.set(log.shop, logs);
    
    return newLog;
  }

  async getWebhookLogs(shop: string, limit = 20): Promise<WebhookLog[]> {
    const logs = webhookLogsStore.get(shop) || [];
    return logs.slice(0, limit);
  }

  // Error Logging
  async addErrorLog(log: Omit<ErrorLog, 'id'>): Promise<ErrorLog> {
    const newLog: ErrorLog = {
      ...log,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const logs = errorLogsStore.get(log.shop) || [];
    logs.unshift(newLog);
    logs.splice(200); // Keep only last 200 error logs
    errorLogsStore.set(log.shop, logs);
    
    return newLog;
  }

  async getErrorLogs(shop: string, limit = 50, level?: 'error' | 'warning' | 'info'): Promise<ErrorLog[]> {
    const logs = errorLogsStore.get(shop) || [];
    const filtered = level ? logs.filter(log => log.level === level) : logs;
    return filtered.slice(0, limit);
  }

  async markErrorResolved(shop: string, errorId: string): Promise<boolean> {
    const logs = errorLogsStore.get(shop) || [];
    const error = logs.find(log => log.id === errorId);
    
    if (error) {
      error.resolved = true;
      return true;
    }
    
    return false;
  }

  // Statistics and Analytics
  async getStats(shop: string): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalWebhooks: number;
    totalErrors: number;
    unresolvedErrors: number;
  }> {
    const syncLogs = syncLogsStore.get(shop) || [];
    const webhookLogs = webhookLogsStore.get(shop) || [];
    const errorLogs = errorLogsStore.get(shop) || [];

    return {
      totalSyncs: syncLogs.length,
      successfulSyncs: syncLogs.filter(log => log.status === 'success').length,
      failedSyncs: syncLogs.filter(log => log.status === 'failed').length,
      totalWebhooks: webhookLogs.length,
      totalErrors: errorLogs.length,
      unresolvedErrors: errorLogs.filter(log => !log.resolved).length
    };
  }

  // Default color families
  private getDefaultColorFamilies(): ColorFamilySettings[] {
    return [
      {
        id: 'blonde',
        name: 'blonde',
        displayName: 'Blonde',
        labValues: [85, 5, 25],
        hexColor: '#F7E7A1',
        enabled: true,
        undertones: [
          {
            id: 'blonde_warm',
            name: 'warm',
            description: 'Golden, honey, strawberry undertones',
            labAdjustment: [0, 5, 10],
            examples: ['Golden Blonde', 'Honey Blonde', 'Strawberry Blonde']
          },
          {
            id: 'blonde_cool',
            name: 'cool',
            description: 'Ash, platinum, icy undertones',
            labAdjustment: [5, -3, -5],
            examples: ['Ash Blonde', 'Platinum Blonde', 'Icy Blonde']
          }
        ],
        rootedVariants: [
          {
            id: 'blonde_rooted_ss',
            name: 'SS (Shaded)',
            description: 'Darker roots with blonde lengths',
            rootColor: 'brunette',
            tipColor: 'blonde',
            gradientType: 'linear'
          },
          {
            id: 'blonde_rooted_rt',
            name: 'RT (Rooted)',
            description: 'Dark brown roots gradually lightening to blonde',
            rootColor: 'dark_brown',
            tipColor: 'blonde',
            gradientType: 'ombre'
          }
        ]
      },
      {
        id: 'brunette',
        name: 'brunette',
        displayName: 'Brunette',
        labValues: [35, 10, 20],
        hexColor: '#8B4513',
        enabled: true,
        undertones: [
          {
            id: 'brunette_warm',
            name: 'warm',
            description: 'Golden, chestnut, caramel undertones',
            labAdjustment: [0, 3, 8],
            examples: ['Golden Brown', 'Chestnut', 'Caramel']
          },
          {
            id: 'brunette_cool',
            name: 'cool',
            description: 'Ash, cool brown undertones',
            labAdjustment: [0, -2, -3],
            examples: ['Ash Brown', 'Cool Brown', 'Espresso']
          }
        ],
        rootedVariants: [
          {
            id: 'brunette_highlighted',
            name: 'HL (Highlighted)',
            description: 'Brunette base with blonde highlights',
            rootColor: 'brunette',
            tipColor: 'blonde',
            gradientType: 'highlights'
          }
        ]
      },
      {
        id: 'black',
        name: 'black',
        displayName: 'Black',
        labValues: [15, 0, 0],
        hexColor: '#000000',
        enabled: true,
        undertones: [
          {
            id: 'black_neutral',
            name: 'neutral',
            description: 'True black with neutral undertones',
            labAdjustment: [0, 0, 0],
            examples: ['Jet Black', 'Natural Black']
          },
          {
            id: 'black_blue',
            name: 'blue',
            description: 'Black with blue undertones',
            labAdjustment: [0, -5, -10],
            examples: ['Blue Black', 'Raven Black']
          }
        ],
        rootedVariants: []
      },
      {
        id: 'red',
        name: 'red',
        displayName: 'Red',
        labValues: [45, 35, 25],
        hexColor: '#8B0000',
        enabled: true,
        undertones: [
          {
            id: 'red_warm',
            name: 'warm',
            description: 'Copper, auburn, ginger undertones',
            labAdjustment: [0, 5, 15],
            examples: ['Auburn', 'Copper Red', 'Ginger']
          },
          {
            id: 'red_cool',
            name: 'cool',
            description: 'Burgundy, wine, cherry undertones',
            labAdjustment: [-5, 10, 0],
            examples: ['Burgundy', 'Wine Red', 'Cherry']
          }
        ],
        rootedVariants: [
          {
            id: 'red_ombre',
            name: 'OM (Ombre)',
            description: 'Dark roots transitioning to red',
            rootColor: 'brunette',
            tipColor: 'red',
            gradientType: 'ombre'
          }
        ]
      }
    ];
  }
}

// Utility functions for database operations
export class DatabaseUtils {
  static async log(shop: string, level: 'error' | 'warning' | 'info', source: string, message: string, details?: any) {
    const db = DatabaseManager.getInstance();
    return await db.addErrorLog({
      shop,
      timestamp: new Date(),
      level,
      source: source as any,
      message,
      details,
      resolved: false
    });
  }

  static async logSyncEvent(shop: string, type: 'manual' | 'webhook' | 'scheduled', stats: any, status: 'success' | 'failed', duration: number) {
    const db = DatabaseManager.getInstance();
    return await db.addSyncLog({
      shop,
      timestamp: new Date(),
      type,
      status,
      stats,
      duration
    });
  }

  static async logWebhookEvent(shop: string, topic: string, payload: any, status: 'success' | 'failed', errorMessage?: string, processingTime?: number) {
    const db = DatabaseManager.getInstance();
    return await db.addWebhookLog({
      shop,
      timestamp: new Date(),
      topic,
      status,
      payload,
      errorMessage,
      processingTime: processingTime || 0
    });
  }
}










