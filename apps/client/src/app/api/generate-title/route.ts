import { getCookie } from '@/lib/utils/serverUtils';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { getPublicApiUrl } from '@/lib/data/constants/api-url.constants';

export async function POST(req: Request) {
  const token = await getCookie(AUTH_COOKIE_NAME);
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.text();

  const response = await fetch(`${getPublicApiUrl()}/ai/generate-title`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  return new Response(response.body, { status: response.status });
}
