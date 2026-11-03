import { Router } from 'express';
import { weatherService } from '../services/weatherService';
import { aiWeatherLimiter } from '../middleware/rateLimiter';
import { requireFeature } from '../config/killSwitch';
import { sanitizeText } from '../utils/sanitize';

export const weatherRouter = Router();

// GET /api/v1/weather/agro?city=Dehradun
// GET /api/v1/weather/forecast?city=Dehradun&lat=...&lng=...
const handleWeather = async (req: any, res: any, next: any) => {
  try {
    const rawCity = typeof req.query.city === 'string' ? req.query.city : 'Dehradun';
    const city = sanitizeText(rawCity).slice(0, 50) || 'Dehradun';

    const data = await weatherService.getAgroWeather(city);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

weatherRouter.get('/agro', aiWeatherLimiter, requireFeature('ai_advisory'), handleWeather);
weatherRouter.get('/forecast', aiWeatherLimiter, requireFeature('ai_advisory'), handleWeather);
