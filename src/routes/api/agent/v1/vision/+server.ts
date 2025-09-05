import OpenAI from "openai";
import { OPENAI_API_TOKEN } from '$env/static/private';
import { validateApiKey, logUsage } from "$lib/auth.js";
import { handleCORS, addCORSHeaders } from '$lib/cors.js';

export async function OPTIONS() {
    return handleCORS();
}

const fewShotPrompt = `You are a detail‑oriented vision scene surveyor.
Task: Given one or more images, 1) identify the domain, 2) produce a structured, objective description for parametric 3D reconstruction suitable for downstream schema generation. Keep under 180 words. Use metric units and hex colors. Report only what is visible; if uncertain, write “unknown”.

Process
Step 1: Domain detection (single label): [building_exterior, building_interior, architectural_element, furniture_object, mechanical_object, consumer_object, landscape_nature, vegetation_closeup, streetscape_urban, diagram_plan, artwork_installation, unknown].
Step 2: Describe using shared headings with domain focus. Do not assume any engine’s up/forward; describe axes generically (“long axis”, “depth direction”). Prefer ratios if no scale reference. Avoid inferring occluded geometry.

Output headings (always present)
    Domain and scale
    Layout and axes
    Structure/elements
    Surfaces and materials
    Objects/fixtures
    Notes for parametrization

Universal characteristics to capture
    Primitive forms: boxes, cylinders, spheres, planes, extrusions, tori; counts and approximate proportions/ratios.

Spatial organization: repetition (linear/grid/radial), symmetry (mirror/radial/rotational), stacking, alignment, offsets.
Proportions and spacing: aspect ratios, module size, spacing as fractions of observed extents when scale unknown.
Material cues: 2–4 dominant hex colors, finish (matte/glossy/metallic), opacity/translucency, texture regularity.
Parametric levers: counts, spacings, dimensions (W/D/H or radius/thickness), angles, offsets, repetition pattern, optional jitter/noise ranges for variability.

Formatting rules
    Use hex colors (#rrggbb). Use “~” for approximations or ratios when scale is unknown. Describe axes generically. Avoid assumptions about hidden parts. Keep objective and compact.

Instruction
Analyze the image(s). Output the 7 headings in order. If “return_json” is specified, use the project’s provided JSON schema externally; do not embed engine-specific keys here.`;

export async function POST({ request }) {
    // Validate API key first
    const auth = await validateApiKey(request);
    if (!auth.valid) {
        return auth.response!;
    }



    try {
        const { imageUrl } = await request.json();
        // Log the request
        logUsage(auth.userId, auth.keyId, '/api/vision', 'POST', imageUrl);

        //console.log(imageUrl)

        const openai = new OpenAI({
            apiKey: OPENAI_API_TOKEN,
        });

        const response = await openai.chat.completions.create({
            model: "gpt-5-mini",
            messages: [
                {
            role: "system", 
            content: fewShotPrompt
        },
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl
                            }
                        },
                        { type: "text", text: "" },
                        
                    ]
                }
            ],
            max_completion_tokens: 4000
        });

        console.log(response.choices[0].message.content)

        let result = new Response(JSON.stringify({
            prompt: response.choices[0].message.content
        }), {
            status: 200,
            headers: {
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
        return addCORSHeaders(result);
    } catch (err) {
        console.error('Expand prompt error:', err);
        return new Response(JSON.stringify({ error: 'Failed to expand prompt' }), {
            status: 500
        });
    }
}
