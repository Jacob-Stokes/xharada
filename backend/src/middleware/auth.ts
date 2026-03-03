import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      username: string;
    };
  }
}

// Validate an API key record: check hash match and expiration
function validateApiKey(apiKey: string, record: any): boolean {
  // Check expiration
  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return false;
  }
  // Check hash
  return bcrypt.compareSync(apiKey, record.key_hash);
}

// Middleware to check if user is authenticated via session OR API key
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check for API key in header first, then query param
  const apiKey = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);

  if (apiKey) {
    // Validate API key - extract key ID from format: {uuid}-{randomstring}
    // UUID is 36 chars (including dashes), e.g., "1e1be6bb-0e71-438d-b92f-55a4c6da2f54"
    const keyId = apiKey.substring(0, 36);

    const apiKeyRecord = db.prepare(`
      SELECT ak.*, u.id as user_id, u.username
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.id = ?
    `).get(keyId) as any;

    if (apiKeyRecord && validateApiKey(apiKey, apiKeyRecord)) {
      // Update last used
      db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(apiKeyRecord.id);

      req.user = {
        id: apiKeyRecord.user_id,
        username: apiKeyRecord.username
      };
      return next();
    }
  }

  // Check session
  if (req.session && (req.session as any).userId) {
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get((req.session as any).userId) as any;

    if (user) {
      req.user = {
        id: user.id,
        username: user.username
      };
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required. Please login or provide a valid API key.'
  });
};

// Optional auth - sets user if authenticated but doesn't require it
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);

  if (apiKey) {
    const keyId = apiKey.substring(0, 36);
    const apiKeyRecord = db.prepare(`
      SELECT ak.*, u.id as user_id, u.username
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.id = ?
    `).get(keyId) as any;

    if (apiKeyRecord && validateApiKey(apiKey, apiKeyRecord)) {
      db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(apiKeyRecord.id);
      req.user = {
        id: apiKeyRecord.user_id,
        username: apiKeyRecord.username
      };
    }
  } else if (req.session && (req.session as any).userId) {
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get((req.session as any).userId) as any;
    if (user) {
      req.user = {
        id: user.id,
        username: user.username
      };
    }
  }

  next();
};
