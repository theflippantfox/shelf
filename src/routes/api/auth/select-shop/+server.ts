import { json } from '@sveltejs/kit';
import { apiError } from '$lib/server/apiResponse';
export async function POST({ request, cookies }: import('@sveltejs/kit').RequestEvent) {
  const { shopId } = await request.json();
  if (!shopId) return apiError('shopId required', 400);
  cookies.set('shelf-current-shop', shopId, { path: '/', sameSite: 'lax', maxAge: 60*60*24*30 });
  return json({ ok: true });
}
