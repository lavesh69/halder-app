import { Request, Response, NextFunction } from 'express';
import { Database } from '../db/database';
import { AppError } from '../utils/errors';

export class LogisticsController {
  // GET /api/v1/logistics/partners
  static getPartners(req: Request, res: Response, next: NextFunction) {
    try {
      const partners = Database.query(`
        SELECT dp.*, u.name as partner_name, u.phone as partner_phone, u.email as partner_email
        FROM delivery_partners dp
        JOIN users u ON dp.user_id = u.id
        ORDER BY dp.rating DESC, dp.total_deliveries DESC
      `);

      res.json({ success: true, count: partners.length, data: partners });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/logistics/partners (Register / update partner)
  static registerPartner(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { vehicle_type, vehicle_number, license_number, service_zone } = req.body;

      if (!vehicle_number || !license_number) {
        throw AppError.badRequest('Vehicle number and license number are required');
      }

      const existing = Database.get<any>('SELECT id FROM delivery_partners WHERE user_id = ?', [userId]);
      const now = new Date().toISOString();

      if (existing) {
        Database.run(
          `UPDATE delivery_partners SET 
            vehicle_type = COALESCE(?, vehicle_type),
            vehicle_number = ?,
            license_number = ?,
            service_zone = COALESCE(?, service_zone),
            updated_at = ?
           WHERE user_id = ?`,
          [vehicle_type, vehicle_number, license_number, service_zone, now, userId]
        );
      } else {
        const id = 'partner-' + Date.now();
        Database.run(
          `INSERT INTO delivery_partners (
            id, user_id, vehicle_type, vehicle_number, license_number,
            service_zone, is_available, current_lat, current_lng, rating,
            total_deliveries, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 1, 30.3165, 78.0322, 5.0, 0, 'active', ?, ?)`,
          [id, userId, vehicle_type || 'bike', vehicle_number, license_number, service_zone || 'Dehradun Urban', now, now]
        );
      }

      const profile = Database.get('SELECT * FROM delivery_partners WHERE user_id = ?', [userId]);
      res.json({ success: true, message: 'Delivery partner profile saved', data: profile });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/logistics/partners/:id/status
  static updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { is_available, current_lat, current_lng, status } = req.body;

      const partner = Database.get<any>('SELECT * FROM delivery_partners WHERE id = ?', [id]);
      if (!partner) {
        throw AppError.notFound('Delivery partner not found');
      }

      const user = (req as any).user;
      if (user && user.role !== 'admin' && partner.user_id !== user.id) {
        throw AppError.forbidden('Unauthorized: You can only update your own delivery partner profile');
      }

      if (current_lat != null) {
        const numLat = Number(current_lat);
        if (isNaN(numLat) || numLat < -90 || numLat > 90) {
          throw AppError.badRequest('Invalid latitude: must be a valid number between -90 and 90 degrees');
        }
      }

      if (current_lng != null) {
        const numLng = Number(current_lng);
        if (isNaN(numLng) || numLng < -180 || numLng > 180) {
          throw AppError.badRequest('Invalid longitude: must be a valid number between -180 and 180 degrees');
        }
      }

      const now = new Date().toISOString();

      Database.run(
        `UPDATE delivery_partners SET
          is_available = COALESCE(?, is_available),
          current_lat = COALESCE(?, current_lat),
          current_lng = COALESCE(?, current_lng),
          status = COALESCE(?, status),
          updated_at = ?
         WHERE id = ?`,
        [is_available ?? null, current_lat != null ? Number(current_lat) : null, current_lng != null ? Number(current_lng) : null, status ?? null, now, id]
      );

      const updated = Database.get('SELECT * FROM delivery_partners WHERE id = ?', [id]);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/logistics/tasks
  static getTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      let query = `
        SELECT dt.*, 
               o.order_number, o.customer_name, o.customer_phone, o.farmer_name, o.farm_name, o.total_amount,
               dp.vehicle_type, dp.vehicle_number, u.name as partner_name, u.phone as partner_phone
        FROM delivery_tasks dt
        JOIN orders o ON dt.order_id = o.id
        LEFT JOIN delivery_partners dp ON dt.partner_id = dp.id
        LEFT JOIN users u ON dp.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status && typeof status === 'string') {
        query += ' AND dt.status = ?';
        params.push(status);
      }

      query += ' ORDER BY dt.created_at DESC';
      const tasks = Database.query(query, params);
      res.json({ success: true, count: tasks.length, data: tasks });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/logistics/tasks/order/:orderId
  static getTaskByOrderId(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const task = Database.get<any>(`
        SELECT dt.*, 
               o.order_number, o.customer_name, o.customer_phone, o.farmer_name, o.farm_name, o.order_status,
               dp.vehicle_type, dp.vehicle_number, dp.rating as partner_rating, dp.current_lat, dp.current_lng,
               u.name as partner_name, u.phone as partner_phone
        FROM delivery_tasks dt
        JOIN orders o ON dt.order_id = o.id
        LEFT JOIN delivery_partners dp ON dt.partner_id = dp.id
        LEFT JOIN users u ON dp.user_id = u.id
        WHERE dt.order_id = ?
      `, [orderId]);

      if (!task) {
        // Fallback: create pending delivery task if order exists
        const order = Database.get<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (!order) {
          throw AppError.notFound('Order not found');
        }

        const taskId = 'task-' + Date.now();
        const now = new Date().toISOString();
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        Database.run(
          `INSERT INTO delivery_tasks (
            id, order_id, partner_id, status, pickup_address, delivery_address,
            distance_km, delivery_fee, partner_payout, otp_code, created_at, updated_at
          ) VALUES (?, ?, 'partner-1', 'assigned', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            taskId, orderId, order.farm_name + ', ' + order.city, order.delivery_address,
            order.delivery_distance_km || 5.0, order.delivery_fee || 25.0,
            (order.delivery_fee || 25.0) * 0.8, otp, now, now
          ]
        );

        return this.getTaskByOrderId(req, res, next);
      }

      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/logistics/tasks/:taskId/assign
  static assignPartner(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const { partnerId } = req.body;

      if (!partnerId) {
        throw AppError.badRequest('partnerId is required');
      }

      const now = new Date().toISOString();
      Database.run(
        `UPDATE delivery_tasks SET partner_id = ?, status = 'assigned', assigned_at = ?, updated_at = ? WHERE id = ?`,
        [partnerId, now, now, taskId]
      );

      const task = Database.get<any>('SELECT order_id FROM delivery_tasks WHERE id = ?', [taskId]);
      if (task?.order_id) {
        Database.run(
          `UPDATE orders SET order_status = 'ready', updated_at = ? WHERE id = ?`,
          [now, task.order_id]
        );
      }

      res.json({ success: true, message: 'Delivery partner assigned successfully' });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/logistics/tasks/:taskId/status
  static updateTaskStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const { status, notes, proof_image } = req.body;

      const validStatuses = ['assigned', 'pickup_in_progress', 'picked_up', 'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw AppError.badRequest('Invalid status provided');
      }

      const now = new Date().toISOString();
      let pickedUpAt = null;
      let deliveredAt = null;

      if (status === 'picked_up' || status === 'out_for_delivery') {
        pickedUpAt = now;
      }
      if (status === 'delivered') {
        deliveredAt = now;
      }

      Database.run(
        `UPDATE delivery_tasks SET
          status = ?,
          notes = COALESCE(?, notes),
          proof_image = COALESCE(?, proof_image),
          picked_up_at = COALESCE(?, picked_up_at),
          delivered_at = COALESCE(?, delivered_at),
          updated_at = ?
         WHERE id = ?`,
        [status, notes ?? null, proof_image ?? null, pickedUpAt ?? null, deliveredAt ?? null, now, taskId]
      );

      // Sync status with orders table
      const task = Database.get<any>('SELECT order_id FROM delivery_tasks WHERE id = ?', [taskId]);
      if (task?.order_id) {
        let orderStatus = 'preparing';
        if (status === 'picked_up' || status === 'out_for_delivery') orderStatus = 'out_for_delivery';
        if (status === 'delivered') orderStatus = 'delivered';
        if (status === 'cancelled') orderStatus = 'cancelled';

        Database.run(
          `UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ?`,
          [orderStatus, now, task.order_id]
        );

        // Add timeline entry
        const tlId = 'tl-' + Date.now();
        Database.run(
          `INSERT INTO order_timeline (id, order_id, status, title, description, time, completed, current, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            tlId, task.order_id, orderStatus,
            status === 'out_for_delivery' ? 'Out for Delivery 🛵' : status === 'delivered' ? 'Delivered 🎉' : 'Delivery Update',
            notes || `Delivery status changed to ${status}`,
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status === 'delivered' ? 1 : 0,
            now
          ]
        );
      }

      res.json({ success: true, message: `Delivery task updated to ${status}` });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/logistics/tasks/:taskId/verify-otp
  static verifyDeliveryOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;
      const { otp } = req.body;

      if (!otp) {
        throw AppError.badRequest('OTP code is required');
      }

      const task = Database.get<any>('SELECT * FROM delivery_tasks WHERE id = ?', [taskId]);
      if (!task) {
        throw AppError.notFound('Delivery task not found');
      }

      if (task.otp_code !== String(otp).trim()) {
        throw AppError.badRequest('Invalid Delivery OTP. Please verify with the customer.');
      }

      const now = new Date().toISOString();
      Database.run(
        `UPDATE delivery_tasks SET status = 'delivered', delivered_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, taskId]
      );

      Database.run(
        `UPDATE orders SET order_status = 'delivered', payment_status = 'paid', updated_at = ? WHERE id = ?`,
        [now, task.order_id]
      );

      // Add timeline
      const tlId = 'tl-' + Date.now();
      Database.run(
        `INSERT INTO order_timeline (id, order_id, status, title, description, time, completed, current, created_at)
         VALUES (?, ?, 'delivered', 'Delivered & Handover Confirmed', 'Customer verified via Secure OTP handover', ?, 1, 1, ?)`,
        [tlId, task.order_id, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), now]
      );

      // Increment partner delivery count
      if (task.partner_id) {
        Database.run(
          `UPDATE delivery_partners SET total_deliveries = total_deliveries + 1, updated_at = ? WHERE id = ?`,
          [now, task.partner_id]
        );
      }

      res.json({ success: true, message: 'OTP verified. Delivery marked as DELIVERED successfully!' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/logistics/partners/:id/telemetry
  static updateTelemetry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { lat, lng, speed_kmh, heading_deg, is_simulated } = req.body;

      if (lat == null || lng == null) {
        throw AppError.badRequest('GPS coordinates (lat, lng) are required');
      }

      const numLat = Number(lat);
      const numLng = Number(lng);

      if (isNaN(numLat) || numLat < -90 || numLat > 90) {
        throw AppError.badRequest('Invalid latitude: must be a valid number between -90 and 90 degrees');
      }

      if (isNaN(numLng) || numLng < -180 || numLng > 180) {
        throw AppError.badRequest('Invalid longitude: must be a valid number between -180 and 180 degrees');
      }

      const partner = Database.get<any>('SELECT * FROM delivery_partners WHERE id = ?', [id]);
      if (!partner) {
        throw AppError.notFound('Delivery partner not found');
      }

      const user = (req as any).user;
      if (user && user.role !== 'admin' && partner.user_id !== user.id) {
        throw AppError.forbidden('Unauthorized: You can only update telemetry for your own delivery partner account');
      }

      const now = new Date().toISOString();
      Database.run(
        `UPDATE delivery_partners SET
          current_lat = ?,
          current_lng = ?,
          updated_at = ?
         WHERE id = ?`,
        [numLat, numLng, now, id]
      );

      res.json({
        success: true,
        data: {
          partner_id: id,
          current_lat: numLat,
          current_lng: numLng,
          speed_kmh: Number(speed_kmh || 0),
          heading_deg: Number(heading_deg || 0),
          telemetry_type: is_simulated ? 'simulated_telemetry' : 'live_gps_telemetry',
          recorded_at: now
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/logistics/analytics
  static getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const totalPartners = Database.get<any>('SELECT COUNT(*) as count FROM delivery_partners') || { count: 0 };
      const activePartners = Database.get<any>("SELECT COUNT(*) as count FROM delivery_partners WHERE is_available = 1 AND status = 'active'") || { count: 0 };
      const tasksSummary = Database.query<any>(`
        SELECT status, COUNT(*) as count FROM delivery_tasks GROUP BY status
      `);
      const totalDeliveries = Database.get<any>("SELECT COUNT(*) as count FROM delivery_tasks WHERE status = 'delivered'") || { count: 0 };
      const avgRating = Database.get<any>('SELECT AVG(rating) as avg_rating FROM delivery_partners') || { avg_rating: 4.9 };

      // Calculate actual transit duration from completed tasks with recorded timestamps
      const transitStats = Database.get<any>(`
        SELECT 
          AVG((julianday(delivered_at) - julianday(picked_up_at)) * 24 * 60) as avg_transit_minutes,
          COUNT(*) as timed_count
        FROM delivery_tasks 
        WHERE status = 'delivered' 
          AND picked_up_at IS NOT NULL 
          AND delivered_at IS NOT NULL
          AND delivered_at >= picked_up_at
      `);

      // Calculate actual on-time performance against estimated delivery times
      const onTimeStats = Database.get<any>(`
        SELECT 
          COUNT(*) as total_with_estimate,
          SUM(CASE WHEN delivered_at <= estimated_delivery_time THEN 1 ELSE 0 END) as on_time_count
        FROM delivery_tasks 
        WHERE status = 'delivered' 
          AND estimated_delivery_time IS NOT NULL 
          AND delivered_at IS NOT NULL
      `);

      const hasRealTransit = transitStats && transitStats.timed_count > 0 && transitStats.avg_transit_minutes != null;
      const realTransitMinutes = hasRealTransit ? Math.round(transitStats.avg_transit_minutes) : null;

      const hasRealOnTime = onTimeStats && onTimeStats.total_with_estimate > 0;
      const realOnTimePct = hasRealOnTime ? Math.round((onTimeStats.on_time_count / onTimeStats.total_with_estimate) * 1000) / 10 : null;

      // Fleet benchmark estimates (clearly flagged when actual database records are insufficient)
      const benchmarkTransitMinutes = 35;
      const benchmarkOnTimeRate = 98.0;

      res.json({
        success: true,
        data: {
          total_registered_partners: totalPartners.count,
          active_fleet_partners: activePartners.count,
          completed_deliveries: totalDeliveries.count,
          fleet_average_rating: Math.round((avgRating.avg_rating || 4.9) * 10) / 10,
          tasks_by_status: tasksSummary,
          average_transit_minutes: realTransitMinutes ?? benchmarkTransitMinutes,
          is_transit_time_estimated: !hasRealTransit,
          on_time_delivery_rate_pct: realOnTimePct ?? benchmarkOnTimeRate,
          is_on_time_rate_estimated: !hasRealOnTime,
          metrics_source: {
            transit_time: hasRealTransit ? 'database_actual' : 'preliminary_benchmark_estimate',
            on_time_rate: hasRealOnTime ? 'database_actual' : 'preliminary_benchmark_estimate',
            sample_size_timed_tasks: transitStats?.timed_count || 0
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
