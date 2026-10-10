import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/data/constants';
import { connectToNats, customizedRequest } from '@/lib/nats/client';
import { randomUUID } from 'node:crypto';
import { isNatsErrorResponse } from '@/lib/utils/natsErrorHandler';
import { redis } from '@/lib/redis/client';
import { setCookie } from '@/lib/utils/serverUtils';
import type { SubmitQuizDto, SubmitQuizResponse } from '@/lib/types/course/DTO/quizSubmission.dto';
import NatsError from '@/lib/nats/error';

/**
 * Same-origin proxy for unload-time quiz submit (`keepalive` fetch from the browser).
 * The beacon cannot reliably call the Nest API host cross-origin with cookies; this route
 * reads the session cookie and uses NATS like `submitQuizAction`.
 */
export async function PUT(request: NextRequest) {
  const idToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SubmitQuizDto;
  try {
    body = (await request.json()) as SubmitQuizDto;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const natsClient = await connectToNats();
  const response = await customizedRequest<SubmitQuizResponse | { err: NatsError }>(
    natsClient,
    'enrollment.submitQuiz',
    JSON.stringify({
      id: randomUUID(),
      data: {
        authorization: idToken,
        ...body,
      },
    }),
    100_000
  );

  if (isNatsErrorResponse(response)) {
    if (response.err.message.startsWith('auth-failed-')) {
      await redis.del(`auth-${idToken}`);
      await setCookie(AUTH_COOKIE_NAME, '', {
        httpOnly: process.env.NODE_ENV === 'production',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        path: '/',
      });
      return NextResponse.json({ error: response.err.message }, { status: 401 });
    }
    return NextResponse.json({ error: response.err.message }, { status: 400 });
  }

  return NextResponse.json(response);
}
