import { Request, Response, NextFunction } from 'express';
import { Database } from '../db/database';

export type SystemFeature = 'ai_advisory' | 'chat' | 'uploads' | 'registrations' | 'instant_payouts';

export class KillSwitchService {
  private featureStates: Record<SystemFeature, boolean> = {
    ai_advisory: process.env.KILL_SWITCH_AI !== 'true',
    chat: process.env.KILL_SWITCH_CHAT !== 'true',
    uploads: process.env.KILL_SWITCH_UPLOADS !== 'true',
    registrations: process.env.KILL_SWITCH_REGISTRATIONS !== 'true',
    instant_payouts: process.env.KILL_SWITCH_PAYOUTS !== 'true',
  };

  private initialized = false;

  private syncFromDatabase() {
    try {
      const records = Database.query<any>("SELECT key, value FROM platform_settings WHERE key LIKE 'kill_switch_%'");
      for (const r of records) {
        const feat = r.key.replace('kill_switch_', '') as SystemFeature;
        if (this.featureStates[feat] !== undefined) {
          this.featureStates[feat] = r.value === '1' || r.value === 'true';
        }
      }
      this.initialized = true;
    } catch {
      // Database might not be migrated yet on early boot
    }
  }

  public isEnabled(feature: SystemFeature): boolean {
    if (!this.initialized) {
      this.syncFromDatabase();
    }
    return this.featureStates[feature] ?? true;
  }

  public setFeatureState(feature: SystemFeature, enabled: boolean): void {
    this.featureStates[feature] = enabled;
    console.log(`[KillSwitch] Feature "${feature}" toggled to: ${enabled ? 'ENABLED' : 'DISABLED (KILLED)'}`);

    try {
      const now = new Date().toISOString();
      Database.run(
        `INSERT INTO platform_settings (key, value, description, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [`kill_switch_${feature}`, enabled ? '1' : '0', `Kill switch state for ${feature}`, now]
      );
    } catch (err: any) {
      console.warn('[KillSwitch] Warning: Could not persist kill switch state to DB:', err.message);
    }
  }

  public getAllStates(): Record<SystemFeature, boolean> {
    if (!this.initialized) {
      this.syncFromDatabase();
    }
    return { ...this.featureStates };
  }
}

export const killSwitch = new KillSwitchService();

/**
 * Express middleware to protect routes with an emergency kill switch
 */
export function requireFeature(feature: SystemFeature) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!killSwitch.isEnabled(feature)) {
      res.status(503).json({
        success: false,
        error: {
          code: 'FEATURE_TEMPORARILY_DISABLED',
          message: `The ${feature.replace(/_/g, ' ')} feature is temporarily disabled for maintenance or security review. Please check back shortly.`,
        },
      });
      return;
    }
    next();
  };
}
