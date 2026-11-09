import { Request, Response, NextFunction } from 'express';
import { GeoService } from '../services/geoService';

export class MapController {
  static async getNearbyFarmers(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude, radiusKm, category, verifiedOnly, availableTodayOnly, limit } = req.query as any;

      const lat = latitude ? Number(latitude) : 30.3165;
      const lng = longitude ? Number(longitude) : 78.0322;

      const farmers = GeoService.getNearbyFarmers({
        latitude: lat,
        longitude: lng,
        radiusKm: radiusKm ? Number(radiusKm) : 25,
        category,
        verifiedOnly: verifiedOnly === 'true' || verifiedOnly === '1',
        availableTodayOnly: availableTodayOnly === 'true' || availableTodayOnly === '1',
        limit: limit ? Number(limit) : 50,
      });

      res.json({
        success: true,
        data: farmers,
      });
    } catch (err) {
      next(err);
    }
  }
}
