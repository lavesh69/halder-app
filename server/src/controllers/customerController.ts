import { Request, Response, NextFunction } from 'express';
import { CustomerProfileService } from '../services/customerProfileService';
import { AddressService } from '../services/addressService';

export class CustomerController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = CustomerProfileService.getProfile(req.user!.id);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = CustomerProfileService.updateProfile(req.user!.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async updateAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const { avatar } = req.body;
      const result = CustomerProfileService.updateAvatar(req.user!.id, avatar);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async removeAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const result = CustomerProfileService.removeAvatar(req.user!.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async listAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = AddressService.listAddresses(req.user!.id);
      res.json({ success: true, data: addresses });
    } catch (err) {
      next(err);
    }
  }

  static async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = AddressService.createAddress(req.user!.id, req.body);
      res.status(201).json({ success: true, data: address });
    } catch (err) {
      next(err);
    }
  }

  static async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = AddressService.updateAddress(req.user!.id, req.params.id, req.body);
      res.json({ success: true, data: address });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const result = AddressService.deleteAddress(req.user!.id, req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async setDefaultAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = AddressService.setDefaultAddress(req.user!.id, req.params.id);
      res.json({ success: true, data: address });
    } catch (err) {
      next(err);
    }
  }

  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = CustomerProfileService.getSettings(req.user!.id);
      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = CustomerProfileService.updateSettings(req.user!.id, req.body);
      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }
}
