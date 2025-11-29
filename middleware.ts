import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Create a response object
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // CORS headers for Supabase compatibility
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent')
    response.headers.set('Access-Control-Allow-Credentials', 'false')
    response.headers.set('Access-Control-Max-Age', '86400')
    response.headers.set('Access-Control-Expose-Headers', 'content-range, x-total-count')

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200, 
        headers: response.headers 
      })
    }

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    
    // If there's an error, still allow the request to proceed with basic CORS
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('X-Middleware-Error', 'true')
    response.headers.set('X-Middleware-Error-Message', error instanceof Error ? error.message : 'Unknown error')
    
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - they handle their own CORS)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
