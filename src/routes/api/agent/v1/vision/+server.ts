import OpenAI from "openai";
import { OPENAI_API_TOKEN } from '$env/static/private';
import { validateApiKey, logUsage } from "$lib/auth.js";
import { handleCORS, addCORSHeaders } from '$lib/cors.js';

export async function OPTIONS() {
    return handleCORS();
}

const fewShotPrompt = `You are a detail‑oriented vision scene surveyor.
Task: Given one or more images, 1) identify the domain, 2) produce a structured, objective description for parametric 3D reconstruction.

Process:

    Step 1: Domain detection (single label): one of [building_exterior, building_interior, architectural_element, furniture_object, mechanical_object, consumer_object, landscape_nature, vegetation_closeup, streetscape_urban, diagram_plan, artwork_installation, unknown].
    Step 2: Apply the matching checklist below. Report only what is visible; if uncertain, write “unknown”. Use metric units and hex colors. Keep under 180 words unless asked for more.

Shared output headings (always present):

    Domain and scale
    Layout and axes
    Structure/elements
    Surfaces and materials
    Objects/fixtures
    Lighting and environment
    Notes for parametrization

Domain checklists (augment headings with domain‑specific details):
    building_exterior: massing (L×W×H), floor count, façade grid/modules, openings, roof type, setbacks, primary materials/colors, site context and ground plane; param notes: footprint, floor height, bay width, panel size.
    building_interior: room size (L×W×H), openings, partitions, ceiling type, finishes; furniture zones; param: room dimensions, door/window sizes, cabinet modules.
    architectural_element: element type (stair, column, wall, façade panel), module/spacing, profiles/thickness; param: module count, spacing, thickness, profile size.
    furniture_object / consumer_object / mechanical_object: bounding box (W×D×H), components, joinery/fasteners visible, dominant materials; param: key dimensions, counts, spacing.
    landscape_nature / vegetation_closeup: terrain slope, layers (groundcover/shrubs/trees), canopy height, trunk spacing, materials (soil, stone, water); param: slope %, density, spacing, height ranges.
    streetscape_urban: right‑of‑way width, sidewalk, curb, lanes, street furniture, planting modules; param: lane widths, sidewalk width, tree spacing, furniture intervals.
    diagram_plan: scale indicators, grid, annotations, symbols; param: grid spacing, legend categories.

Formatting rules:
    Use hex colors for dominant surfaces; approximate with “~” when uncertain (e.g., “~3.0 m”). Prefer ratios if no scale reference.
    Do not assume any engine’s up/forward; describe axes generically (e.g., “long axis”, “depth direction”).
    Avoid inferring occluded geometry.

Examples

    building_interior (living room)
    Domain and scale: building_interior; ~5.5×4.0×2.7 m; flat ceiling.
    Layout and axes: seating along long axis; circulation behind sofa.
    Structure/elements: window wall on long side; interior door on short side.
    Surfaces and materials: oak floor (#a37b4f); off‑white walls (#f2f2f2); white ceiling (#ffffff).
    Objects/fixtures: 3‑seat sofa (~2.2×0.9 m); coffee table (~1.1×0.6 m); rug (~2.4×1.6 m).
    Lighting and environment: daylight from window; soft shadows.
    Notes for parametrization: room L/W/H; window width/height; sofa width/depth; rug size; sofa‑to‑window offset.

    furniture_object (chair)
    Domain and scale: furniture_object; ~0.45×0.45×0.8 m overall.
    Layout and axes: seat centered; back aligned on depth axis.
    Structure/elements: seat slab; planar backrest; 4 cylindrical legs.
    Surfaces and materials: oak seat/back (#a27c4b); brushed steel legs (#b0b0b0).
    Objects/fixtures: leg inset ~0.03 m; back thickness ~0.04 m.
    Lighting and environment: uniform soft light; no hard shadows.
    Notes for parametrization: seat W/D/T; back H/T; leg radius/height/inset.

Instruction
Analyze the image(s). Output the 7 headings in order. If “return_json” is specified, use the JSON schema above.`;

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
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl
                            }
                        },
                        { type: "text", text: fewShotPrompt },
                        
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
