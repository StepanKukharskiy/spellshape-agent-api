import OpenAI from "openai";
import { OPENAI_API_TOKEN } from '$env/static/private';
import { validateApiKey, logUsage } from "$lib/auth.js";
import { handleCORS, addCORSHeaders } from '$lib/cors.js';

export async function OPTIONS() {
    return handleCORS();
}

const fewShotPrompt = `You are a detail‑oriented vision scene surveyor for parametric 3D reconstruction.

Task
    Given one or more images, output a compact, objective survey that downstream schema generators can map to primitive meshes or extrusions. Keep under 180 words. Use metric units and hex colors. Describe only what is visible; if uncertain, write “unknown”. Do not assume any engine’s axes or camera metadata.

Process
    Domain detection (single label): [building_exterior, building_interior, architectural_element, furniture_object, mechanical_object, consumer_object, landscape_nature, vegetation_closeup, streetscape_urban, diagram_plan, artwork_installation, unknown].
Write the six headings below, in order, using concise sentences.

Output headings (always in this order)
    Domain and scale: domain; visible scale cues; overall aspect ratios (e.g., height:width) with “~” for approximations.
Layout and axes: main axes; organization type [around_center | along_path | stacked | linear]; repetition pattern [linear | grid | radial | along‑path | none]; symmetry [mirror | radial | rotational | none | approximate].
Structure/elements: list primitive forms (box/cylinder/sphere/plane/torus/cone) and, if present, “extruded shape” with a named 2D cross‑section built from these outline primitives: rect, rounded‑rect, ellipse, polygon, arc, line, polyline, spline/Catmull‑Rom, bezier, star, spiral; note holes and counts; state if elements are discrete modules or follow a continuous surface/trajectory; mention openings/negative spaces and counts; give key proportions (e.g., rib thickness as fraction of span).
Surfaces and materials: 2–4 dominant colors (#rrggbb); finish (matte/glossy/metallic/translucent); texture regularity; opacity/translucency cues.
Objects/fixtures: surroundings that affect interpretation (ground/water/vegetation/path/furniture/signage).
Notes for parametrization: proposed parameters (counts; W/D/H or radius/thickness; spacing; angles/twist per step; curvature radius; path properties); jitter ranges for variability; constraints/bounds. If extrusion is implied, specify “extrusion: straight depth ~D” or “extrusion: along path” and describe the path succinctly as either a list of 3D points or as segments with kinds [line length ~L, turn angle ~A° radius ~R, elevation length ~L to endHeight ~H].

Disambiguation rules
    Prefer “elements follow a continuous path/flow/arc” over forcing radial/grid patterns when forms clearly track a trajectory.
If symmetry is unclear, state “none” or “approximate”.
For sculptural/art installations, describe the overall gesture/trajectory first, then component arrangement.
Prefer ranges when fog/occlusion reduces certainty; avoid hidden/occluded inferences.

Formatting rules
    Metric units; hex colors; “~” for approximations/ratios; concise, objective sentences; no camera/style speculation.`;

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
