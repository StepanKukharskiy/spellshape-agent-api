// This is your updated /api/spell endpoint for chat support
import OpenAI from "openai";
import { OPENAI_API_TOKEN } from '$env/static/private';
import { systemPrompt } from "$lib/systemPrompt.js";
import { validateApiKey, logUsage } from '$lib/auth.js';
import { handleCORS, addCORSHeaders } from '$lib/cors.js';

export async function OPTIONS() {
  return handleCORS();
}

export async function POST({ request }) {
    // Validate API key first
    const auth = await validateApiKey(request);
    if (!auth.valid) {
        return auth.response!;
    }

    
    
    try {
        const { prompt, schema, regenerateFromPrompt, chatHistory, questionOnly } = await request.json();
        // Log the request
    logUsage(auth.userId, auth.keyId, '/api/generate', 'POST', prompt);

        const openai = new OpenAI({
            apiKey: OPENAI_API_TOKEN,
        });

        let effectiveSystemPrompt = systemPrompt;
        let messages = [];

        if (questionOnly) {
            // Just answering a question about the schema
            effectiveSystemPrompt = `

You are helping the user understand their 3D scene schema. When answering questions:

1. Structure your responses clearly with headers and bullet points
2. Use **bold** for important terms and concepts
3. Use \`inline code\` for parameter names, values, and JSON properties
4. Use code blocks for JSON examples:
   \`\`\`
   {
     "example": "value"
   }
   \`\`\`
5. Break complex explanations into numbered steps
6. Use bullet points for lists of features or properties

Be helpful and educational while maintaining clear structure.`;
            
            messages = [
                {
                    "role": "system",
                    "content": effectiveSystemPrompt
                }
            ];

            // Add chat history if available
            if (chatHistory && chatHistory.length > 0) {
                chatHistory.forEach(msg => {
                    messages.push({
                        "role": msg.role,
                        "content": msg.content
                    });
                });
            }

            // Add current schema context and user question
            const contextualPrompt = `Current schema:\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\`\n\nUser question: ${prompt}`;
            messages.push({
                "role": "user",
                "content": contextualPrompt
            });

            const response = await openai.responses.create({
                model: "gpt-5-mini",
                input: messages,
                text: { "format": { "type": "text" } },
                reasoning: {},
                tools: [],
                temperature: 1,
                max_output_tokens: 4096,
                top_p: 1,
                store: true
            });

            return new Response(JSON.stringify({ 
                response: response.output_text,
                isTextResponse: true 
            }), {
                status: 200,
                headers: {
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });
        }

        // Schema generation/modification logic
        if (regenerateFromPrompt || !schema) {
            // Full generation from prompt - don't reference existing schema
            effectiveSystemPrompt += "\n\nGenerate a complete 3D scene schema from scratch based on the user's description.";
            messages = [
                {
                    "role": "system",
                    "content": effectiveSystemPrompt
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ];
        } else {
            // Modification of existing schema
            effectiveSystemPrompt += "\n\nModify the existing schema based on the user's request. Preserve the existing structure and parameters where possible, only changing what the user specifically requests.";
            const userContent = `${prompt}\n\nCurrent schema (JSON):\n${JSON.stringify(schema)}`;
            messages = [
                {
                    "role": "system",
                    "content": effectiveSystemPrompt
                },
                {
                    "role": "user",
                    "content": userContent
                }
            ];
        }

        const response = await openai.responses.create({
            model: "gpt-5-mini",
            input: messages,
            text: {
                "format": {
                    "type": "json_object"
                }
            },
            reasoning: {},
            tools: [],
            temperature: 1,
            max_output_tokens: 16384,
            top_p: 1,
            store: true
        });

        // After the OpenAI call, before JSON.parse:
        const rawOutput = response.output_text;

        let generatedSchema;
        try {
            // First try direct parsing
            generatedSchema = JSON.parse(rawOutput);
        } catch (parseError) {
            // If that fails, try extracting JSON from the text
            const jsonMatch = rawOutput.match(/(\{[\s\S]*\})|([\s\S]*])/);
            if (!jsonMatch) {
                throw new Error("No JSON found in AI response");
            }
            
            try {
                generatedSchema = JSON.parse(jsonMatch[0]);
            } catch (extractError) {
                console.error('Raw AI output:', rawOutput);
                throw new Error(`Failed to parse JSON: ${parseError.message}`);
            }
        }

        // Validate that we got a proper schema
        if (!generatedSchema || typeof generatedSchema !== 'object') {
            throw new Error("AI response is not a valid object");
        }

        let result = new Response(JSON.stringify(generatedSchema), {
            status: 200,
            headers: {
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });

        return addCORSHeaders(result);

    } catch (err) {
        console.error('Generate JSON error:', err);
    
        // More specific error messages
        let errorMessage = 'Failed to generate schema';
        if (err.message.includes('JSON')) {
            errorMessage = 'Failed to parse AI response as valid JSON';
        } else if (err.message.includes('token')) {
            errorMessage = 'Request too large or API quota exceeded';
        }
        
        return new Response(JSON.stringify({ 
            error: errorMessage,
            details: err.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: {
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }
}
