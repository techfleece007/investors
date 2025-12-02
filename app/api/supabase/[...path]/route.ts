import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yzfbkrswdizehjucrmev.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'DELETE')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PATCH')
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Handle preflight requests
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version',
      'Access-Control-Max-Age': '86400',
    }
  })
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Reconstruct the path
    const path = pathSegments.join('/')
    const url = new URL(request.url)
    const searchParams = url.searchParams.toString()
    const fullPath = `${SUPABASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`

    // Prepare headers - start with required Supabase headers
    const headers: HeadersInit = {
      'apikey': SUPABASE_ANON_KEY!,
    }

    // Copy relevant headers from the original request
    const requestHeaders = request.headers
    const relevantHeaders = [
      'accept',
      'accept-language',
      'cache-control',
      'content-type',
      'x-client-info',
      'x-supabase-api-version',
    ]

    for (const headerName of relevantHeaders) {
      const headerValue = requestHeaders.get(headerName)
      if (headerValue) {
        headers[headerName] = headerValue
      }
    }

    // Handle authorization header - use client's auth header or fall back to anon key
    const authHeader = requestHeaders.get('authorization')
    headers['Authorization'] = authHeader || `Bearer ${SUPABASE_ANON_KEY}`

    // Prepare request body
    let body: string | undefined
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.text()
      } catch (error) {
        console.error('Error reading request body:', error)
      }
    }

    // Make the request to Supabase
    const response = await fetch(fullPath, {
      method,
      headers,
      body,
    })

    // Get response body
    const responseBody = await response.text()

    // Handle 204 No Content status - NextResponse doesn't accept 204, so use 200 instead
    const status = response.status === 204 ? 200 : response.status

    // Create response with proper headers
    const nextResponse = new NextResponse(
      response.status === 204 ? null : responseBody, // No body for 204
      {
        status: status,
        statusText: response.statusText,
      }
    )

    // Copy content-type header - important for JSON parsing
    const contentType = response.headers.get('content-type')
    if (contentType) {
      nextResponse.headers.set('Content-Type', contentType)
    }

    // Copy cache headers
    const cacheControl = response.headers.get('cache-control')
    if (cacheControl) {
      nextResponse.headers.set('Cache-Control', cacheControl)
    }

    // Note: We intentionally do NOT pass through set-cookie from Supabase
    // because those cookies have domain=.supabase.co which won't work on localhost
    // The Supabase client handles session storage via its own cookie mechanism

    // Add CORS headers
    nextResponse.headers.set('Access-Control-Allow-Origin', '*')
    nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version')

    return nextResponse

  } catch (error) {
    console.error('Proxy error:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: 'Proxy request failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
}
