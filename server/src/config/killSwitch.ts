import { Request, Response, NextFunction } from 'express';

export type SystemFeature = 'ai_advisory' | 'chat' | 'uploads' | 'registrations' | 'instant_payouts';

class KillSwitchService {
  private featureStates: Record<SystemFeature, boolean> = {
    ai_advisory: process.env.KILL_SWITCH_AI !== 'true',
    chat: process.env.KILL_SWITCH_CHAT !== 'true',
    uploads: process.env.KILL_SWITCH_UPLOADS !== 'true',
    registrations: process.env.KILL_SWITCH_REGISTRATIONS !== 'true',
    instant_payouts: process.env.KILL_SWITCH_PAYOUTS !== 'true',
  };

  public isEnabled(feature: SystemFeature): boolean {
    return this.featureStates[feature] ?? true;
  }

  public setFeatureState(feature: SystemFeature, enabled: boolean): void {
    this.featureStates[feature] = enabled;
    console.log(`[KillSwitch] Feature "${feature}" toggled to: ${enabled ? 'ENABLED' : 'DISABLED (KILLED)'}`);
  }

  public getAllStates(): Record<SystemFeature, boolean> {
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
