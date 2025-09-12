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
  return handleRequest(request, params.path, 'OPTIONS')
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

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }

    // Copy relevant headers from the original request
    const requestHeaders = request.headers
    const relevantHeaders = [
      'accept',
      'accept-encoding',
      'accept-language',
      'cache-control',
      'content-type',
      'user-agent',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-real-ip',
    ]

    for (const headerName of relevantHeaders) {
      const headerValue = requestHeaders.get(headerName)
      if (headerValue) {
        headers[headerName] = headerValue
      }
    }

    // Handle authorization header if present
    const authHeader = requestHeaders.get('authorization')
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

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

    // Create response with proper headers
    const nextResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy relevant response headers
    const responseHeaders = response.headers
    const relevantResponseHeaders = [
      'content-type',
      'content-encoding',
      'cache-control',
      'etag',
      'last-modified',
      'set-cookie',
    ]

    for (const headerName of relevantResponseHeaders) {
      const headerValue = responseHeaders.get(headerName)
      if (headerValue) {
        nextResponse.headers.set(headerName, headerValue)
      }
    }

    // Add CORS headers
    nextResponse.headers.set('Access-Control-Allow-Origin', '*')
    nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey')
    nextResponse.headers.set('Access-Control-Allow-Credentials', 'true')

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
