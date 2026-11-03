import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';

export interface AddressInput {
  label?: string;
  name: string;
  phone: string;
  houseBuilding: string;
  streetLocality: string;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string;
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
}

export class AddressService {
  static listAddresses(customerId: string) {
    return Database.query<any>(
      `SELECT * FROM customer_addresses 
       WHERE customer_id = ? 
       ORDER BY is_default DESC, created_at DESC`,
      [customerId]
    );
  }

  static getAddressById(customerId: string, addressId: string) {
    const address = Database.get<any>(
      'SELECT * FROM customer_addresses WHERE id = ?',
      [addressId]
    );

    if (!address) {
      throw AppError.notFound('Address not found');
    }

    if (address.customer_id !== customerId) {
      throw AppError.forbidden('You are not authorized to access this address record.');
    }

    return address;
  }

  static createAddress(customerId: string, input: AddressInput) {
    if (!input.name?.trim() || !input.phone?.trim() || !input.houseBuilding?.trim() || 
        !input.streetLocality?.trim() || !input.city?.trim() || !input.state?.trim() || !input.postalCode?.trim()) {
      throw AppError.badRequest('All primary address fields (Name, Phone, House/Building, Locality, City, State, PIN) are required.');
    }

    const id = `addr-${uuidv4()}`;
    const now = new Date().toISOString();

    const existingCount = Database.get<any>(
      'SELECT COUNT(*) as cnt FROM customer_addresses WHERE customer_id = ?',
      [customerId]
    )?.cnt || 0;

    // Automatically make first address default if not specified
    const shouldBeDefault = input.isDefault || existingCount === 0;

    Database.transaction(() => {
      if (shouldBeDefault) {
        Database.run(
          'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?',
          [customerId]
        );
      }

      Database.run(
        `INSERT INTO customer_addresses (
          id, customer_id, label, name, phone, house_building, street_locality,
          city, state, postal_code, landmark, is_default, latitude, longitude,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          customerId,
          sanitizeText(input.label?.trim() || 'Home'),
          sanitizeText(input.name.trim()),
          sanitizeText(input.phone.trim()),
          sanitizeText(input.houseBuilding.trim()),
          sanitizeText(input.streetLocality.trim()),
          sanitizeText(input.city.trim()),
          sanitizeText(input.state.trim()),
          sanitizeText(input.postalCode.trim()),
          sanitizeText(input.landmark?.trim() || ''),
          shouldBeDefault ? 1 : 0,
          input.latitude || null,
          input.longitude || null,
          now,
          now,
        ]
      );

      if (shouldBeDefault) {
        Database.run(
          'UPDATE customer_profiles SET default_address_id = ?, updated_at = ? WHERE user_id = ?',
          [id, now, customerId]
        );
      }
    });

    return this.getAddressById(customerId, id);
  }

  static updateAddress(customerId: string, addressId: string, input: Partial<AddressInput>) {
    const existing = this.getAddressById(customerId, addressId);
    const now = new Date().toISOString();

    Database.transaction(() => {
      if (input.isDefault) {
        Database.run(
          'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?',
          [customerId]
        );
      }

      Database.run(
        `UPDATE customer_addresses SET
          label = COALESCE(?, label),
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          house_building = COALESCE(?, house_building),
          street_locality = COALESCE(?, street_locality),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          postal_code = COALESCE(?, postal_code),
          landmark = COALESCE(?, landmark),
          is_default = CASE WHEN ? IS NOT NULL THEN ? ELSE is_default END,
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          updated_at = ?
        WHERE id = ? AND customer_id = ?`,
        [
          input.label !== undefined ? sanitizeText(input.label.trim()) : null,
          input.name !== undefined ? sanitizeText(input.name.trim()) : null,
          input.phone !== undefined ? sanitizeText(input.phone.trim()) : null,
          input.houseBuilding !== undefined ? sanitizeText(input.houseBuilding.trim()) : null,
          input.streetLocality !== undefined ? sanitizeText(input.streetLocality.trim()) : null,
          input.city !== undefined ? sanitizeText(input.city.trim()) : null,
          input.state !== undefined ? sanitizeText(input.state.trim()) : null,
          input.postalCode !== undefined ? sanitizeText(input.postalCode.trim()) : null,
          input.landmark !== undefined ? sanitizeText(input.landmark.trim()) : null,
          input.isDefault !== undefined ? (input.isDefault ? 1 : 0) : null,
          input.isDefault !== undefined ? (input.isDefault ? 1 : 0) : null,
          input.latitude !== undefined ? input.latitude : null,
          input.longitude !== undefined ? input.longitude : null,
          now,
          addressId,
          customerId,
        ]
      );

      if (input.isDefault) {
        Database.run(
          'UPDATE customer_profiles SET default_address_id = ?, updated_at = ? WHERE user_id = ?',
          [addressId, now, customerId]
        );
      }
    });

    return this.getAddressById(customerId, addressId);
  }

  static deleteAddress(customerId: string, addressId: string) {
    const existing = this.getAddressById(customerId, addressId);
    const wasDefault = existing.is_default === 1;

    Database.transaction(() => {
      Database.run(
        'DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?',
        [addressId, customerId]
      );

      if (wasDefault) {
        const remaining = Database.get<any>(
          `SELECT id FROM customer_addresses 
           WHERE customer_id = ? 
           ORDER BY created_at DESC LIMIT 1`,
          [customerId]
        );

        if (remaining) {
          Database.run(
            'UPDATE customer_addresses SET is_default = 1 WHERE id = ?',
            [remaining.id]
          );
          Database.run(
            'UPDATE customer_profiles SET default_address_id = ? WHERE user_id = ?',
            [remaining.id, customerId]
          );
        } else {
          Database.run(
            'UPDATE customer_profiles SET default_address_id = NULL WHERE user_id = ?',
            [customerId]
          );
        }
      }
    });

    return { success: true, deletedId: addressId };
  }

  static setDefaultAddress(customerId: string, addressId: string) {
    // Validates ownership
    this.getAddressById(customerId, addressId);
    const now = new Date().toISOString();

    Database.transaction(() => {
      Database.run(
        'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?',
        [customerId]
      );
      Database.run(
        'UPDATE customer_addresses SET is_default = 1, updated_at = ? WHERE id = ? AND customer_id = ?',
        [now, addressId, customerId]
      );
      Database.run(
        'UPDATE customer_profiles SET default_address_id = ?, updated_at = ? WHERE user_id = ?',
        [addressId, now, customerId]
      );
    });

    return this.getAddressById(customerId, addressId);
  }
}
