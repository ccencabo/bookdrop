import 'server-only';
import { createHmac } from 'node:crypto';
import { createAdminClient } from './supabase/admin';

type RateLimitOptions = {
  action: string;
  limit: number;
  windowSeconds: number;
  subject?: string;
};

function clientAddress(request: Request) {
  const directAddress = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0];
  return directAddress?.trim() || 'unknown';
}

export async function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const secret = process.env.RATE_LIMIT_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    console.error('Rate limiting is unavailable because no hashing secret is configured.');
    return Response.json({ error: 'This service is temporarily unavailable.' }, { status: 503 });
  }

  const identifier = options.subject?.trim().toLowerCase() || clientAddress(request);
  const identifierHash = createHmac('sha256', secret)
    .update(`${options.action}:${identifier}`)
    .digest('hex');
  const { data, error } = await createAdminClient().rpc('consume_rate_limit', {
    p_action: options.action,
    p_identifier_hash: identifierHash,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });

  if (error) {
    console.error(`Could not enforce the ${options.action} rate limit`, error);
    return Response.json({ error: 'This service is temporarily unavailable.' }, { status: 503 });
  }
  if (data === true) return null;

  return Response.json(
    { error: 'Too many attempts. Please wait a few minutes and try again.' },
    {
      status: 429,
      headers: { 'Retry-After': String(options.windowSeconds) },
    },
  );
}
