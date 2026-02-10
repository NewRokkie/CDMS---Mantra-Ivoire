/**
 * Vercel Serverless Function: Health check
 * Replaces Flask endpoint: GET /api/v1/codeco/health
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'EDI CODECO API',
    version: '2.0.0',
    platform: 'Vercel Serverless'
  });
}
