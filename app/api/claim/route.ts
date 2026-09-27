import { createClaim } from '../../../lib/data';
import { enforceRateLimit } from '../../../lib/rate-limit';

const clean = (value:unknown, max:number) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const allowedDeliveryMethods = new Set(['Pickup', 'Maxim / Angkas', 'J&T']);
const MAX_BOOKS_PER_CLAIM = 6;
const MAX_REQUEST_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    action: 'create-claim',
    limit: 6,
    windowSeconds: 10 * 60,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) return Response.json({error:'The request is too large.'},{status:413});
    const body = await request.json() as Record<string,unknown>;
    const bookIds = Array.isArray(body.bookIds)
      ? [...new Set(body.bookIds.map(Number))]
      : [];
    const input = {
      bookIds,
      name: clean(body.name,80), facebook: clean(body.facebook,200), phone: clean(body.phone,30),
      delivery: clean(body.delivery,40), address: clean(body.address,300), notes: clean(body.notes,300),
      termsAccepted: body.termsAccepted === 'on' || body.termsAccepted === true,
    };
    if (!input.name || !input.facebook || !input.phone || !input.delivery) return Response.json({error:'Please complete all required details.'},{status:400});
    if (input.bookIds.length < 1 || input.bookIds.length > MAX_BOOKS_PER_CLAIM || input.bookIds.some((id) => !Number.isInteger(id) || id < 1)) {
      return Response.json({error:`Choose between 1 and ${MAX_BOOKS_PER_CLAIM} valid books.`},{status:400});
    }
    if (!allowedDeliveryMethods.has(input.delivery)) return Response.json({error:'Choose a valid delivery method.'},{status:400});
    if (input.delivery !== 'Pickup' && !input.address) return Response.json({error:'Enter a delivery address for courier delivery.'},{status:400});
    const phoneDigits = input.phone.replaceAll(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) return Response.json({error:'Enter a valid mobile number.'},{status:400});
    if (!input.termsAccepted) return Response.json({error:'Please accept the claim policy before submitting.'},{status:400});
    const order = await createClaim(input);
    return Response.json(order,{status:201});
  } catch (reason) {
    if (reason instanceof SyntaxError) return Response.json({error:'Enter valid claim details.'},{status:400});
    return Response.json({error:reason instanceof Error ? reason.message : 'Could not submit your claim.'},{status:409});
  }
}
