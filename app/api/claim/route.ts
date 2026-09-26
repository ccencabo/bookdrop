import { createClaim } from '../../../lib/data';

const clean = (value:unknown, max:number) => typeof value === 'string' ? value.trim().slice(0,max) : '';

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string,unknown>;
    const input = {
      bookIds: Array.isArray(body.bookIds) ? body.bookIds.map(Number) : [],
      name: clean(body.name,80), facebook: clean(body.facebook,200), phone: clean(body.phone,30),
      delivery: clean(body.delivery,40), address: clean(body.address,300), notes: clean(body.notes,300),
    };
    if (!input.name || !input.facebook || !input.phone || !input.delivery) return Response.json({error:'Please complete all required details.'},{status:400});
    const order = await createClaim(input);
    return Response.json(order,{status:201});
  } catch (reason) {
    return Response.json({error:reason instanceof Error ? reason.message : 'Could not submit your claim.'},{status:409});
  }
}
