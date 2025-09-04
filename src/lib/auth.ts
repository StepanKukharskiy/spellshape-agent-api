import PocketBase from 'pocketbase';
import { DB_URL } from '$env/static/private';

const pb = new PocketBase(DB_URL);


export async function validateApiKey(request) {
  const apiKey = request.headers.get('X-API-Key');
  console.log(apiKey)
  
  const errorResponse = (message) => new Response(
    JSON.stringify({ error: message }),
    { 
      status: 401,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );

  if (!apiKey) {
    return { valid: false, response: errorResponse('Missing X-API-Key header') };
  }

  try {

    const allKeys = await pb.collection('api_keys').getFullList();
//console.log('All API keys in database:', allKeys.map(k => ({ key: k.key, active: k.is_active })));

    const keyRecord = await pb.collection('api_keys').getFirstListItem(
      `key="${apiKey}" && is_active=true`
    );

    console.log(keyRecord)

    
    
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return { valid: false, response: errorResponse('API key expired') };
    }

    if (keyRecord) {
    // Update last_used and usage_count
    pb.collection('api_keys').update(keyRecord.id, {
      last_used: new Date().toISOString(),
      usage_count: (keyRecord.usage_count || 0) + 1
    }).catch(() => {}); // Don't block on update failure
    
    return {
      valid: true,
      keyId: keyRecord.id,
      userId: keyRecord.user,
      scopes: keyRecord.scopes || []
    };
  }
    
  } catch (error) {
    console.log(error)
    return { valid: false, response: errorResponse('Invalid API key') };
  }
}

export function logUsage(userId, keyId, endpoint, method = 'POST', prompt) {
  // Fire and forget logging
  pb.collection('usage_logs').create({
    user: userId,
    api_key: keyId,
    endpoint,
    method,
    prompt,
    ip_address: '', // Add if needed
    user_agent: '' // Add if needed
  }).catch(() => {
    // Silently ignore logging errors
  });
}
