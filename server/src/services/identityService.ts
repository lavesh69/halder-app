import { Database } from '../db/database';
import { AppError } from '../utils/errors';

export type UserRole = 'customer' | 'farmer' | 'admin';

const ROLE_PREFIX_MAP: Record<UserRole, string> = {
  customer: 'HAL-CUS-',
  farmer: 'HAL-FRM-',
  admin: 'HAL-ADM-',
};

export class IdentityService {
  /**
   * Initializes identity sequences in database if not present
   */
  public static ensureSequencesInitialized(): void {
    const db = Database.getDB();
    db.exec(`
      CREATE TABLE IF NOT EXISTS identity_sequences (
        role TEXT PRIMARY KEY CHECK(role IN ('customer', 'farmer', 'admin')),
        prefix TEXT NOT NULL,
        current_seq INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
    `);

    const now = new Date().toISOString();
    for (const [role, prefix] of Object.entries(ROLE_PREFIX_MAP)) {
      const existing = Database.get<any>('SELECT role FROM identity_sequences WHERE role = ?', [role]);
      if (!existing) {
        Database.run(
          'INSERT INTO identity_sequences (role, prefix, current_seq, updated_at) VALUES (?, ?, 0, ?)',
          [role, prefix, now]
        );
      }
    }
  }

  /**
   * Atomically generates the next permanent HALDER ID for the specified role
   * Formats:
   * - Customer: HAL-CUS-00000001
   * - Farmer:   HAL-FRM-00000001
   * - Admin:    HAL-ADM-00000001
   */
  public static generateNextId(role: UserRole): string {
    this.ensureSequencesInitialized();

    const prefix = ROLE_PREFIX_MAP[role];
    if (!prefix) {
      throw AppError.badRequest(`Invalid user role for identity generation: ${role}`);
    }

    let nextSeq = 1;
    const now = new Date().toISOString();

    Database.transaction(() => {
      Database.run(
        'UPDATE identity_sequences SET current_seq = current_seq + 1, updated_at = ? WHERE role = ?',
        [now, role]
      );
      const row = Database.get<{ current_seq: number }>('SELECT current_seq FROM identity_sequences WHERE role = ?', [role]);
      if (row && typeof row.current_seq === 'number') {
        nextSeq = row.current_seq;
      }
    });

    return this.formatId(role, nextSeq);
  }

  /**
   * Formats a numeric sequence into an official 8-digit zero-padded HALDER ID
   */
  public static formatId(role: UserRole, seq: number): string {
    const prefix = ROLE_PREFIX_MAP[role];
    return `${prefix}${String(seq).padStart(8, '0')}`;
  }

  /**
   * Validates if a string matches the official HALDER ID specification
   */
  public static isValidHalderId(id: string): boolean {
    return /^HAL-(CUS|FRM|ADM)-\d{8}$/.test(id);
  }

  /**
   * Safe public lookup of a user by their permanent HALDER ID
   */
  public static lookupByHalderId(halderId: string) {
    if (!this.isValidHalderId(halderId)) {
      throw AppError.badRequest('Invalid HALDER ID format. Expected format: HAL-CUS-00000001 or HAL-FRM-00000001');
    }

    const user = Database.get<any>(
      `SELECT u.id, u.halder_id, u.name, u.role, u.status, u.created_at,
              fp.id as farmer_profile_id, fp.farm_name, fp.city, fp.verification_status, fp.rating
       FROM users u
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       WHERE u.halder_id = ?`,
      [halderId]
    );

    if (!user) {
      throw AppError.notFound(`No user found with HALDER ID: ${halderId}`);
    }

    return user;
  }
}
