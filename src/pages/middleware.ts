import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const authCookie = req.cookies.get('@skylab:access_token');

  if (!authCookie) {
    return NextResponse.redirect('/');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};