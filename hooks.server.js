/** @type {import('@sveltejs/kit').Handle} */

export async function handle({ event, resolve }) {
  // Handle preflight requests
  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  const response = await resolve(event);

  // Add CORS headers to all responses
  response.headers.append('Access-Control-Allow-Origin', '*');
  response.headers.append('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.append('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  return response;
}
