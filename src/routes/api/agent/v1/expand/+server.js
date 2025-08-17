import OpenAI from "openai";
import { OPENAI_API_TOKEN } from '$env/static/private';

const fewShotPrompt = `You are a detail-oriented 3D-scene prompt writer.
Take a terse object description and expand it into a clear, concise brief that covers dimensions, materials, components, layout logic, style references and parametric controls.
Use metric units, hex colours and bulleted sub-sections.
Keep it under 180 words unless the user explicitly asks for more detail.

### Examples

#### 1. Chair
► User prompt: "a chair"

◄ Detailed prompt:
Create a modern minimalist dining chair with the following specifications:
  Seat: 45 cm × 45 cm oak wood seat (#a27c4b) with 5 cm thickness, positioned 46 cm from the ground
  Backrest: Matching oak wood back panel, 50 cm tall and 4 cm thick, slightly inset from the seat's rear edge
  Legs: Four brushed-steel cylinders (#b0b0b0), 2 cm diameter, placed 3 cm in from each corner, height equals seat level
  Style: Contemporary Scandinavian mix of warm timber and cool metal, clean proportions, supports parametric tweaks to seat size and back height

#### 2. Kitchen
► User prompt: "a kitchen"

◄ Detailed prompt:
Create a modular 3D kitchen with adjustable parameters:
  Layout: 3–7 base cabinets (0.45–1.0 m wide each) plus standalone fridge on the left, continuous countertop, aligned wall cabinets above
  Base Cabinets: 0.8–0.9 m high, 0.5–0.7 m deep; each has side/back panels, internal shelf, swing door with dark-metal handle, four height-adjustable cylindrical legs
  Wall Cabinets: 0.6–0.8 m high, 0.3–0.4 m deep, mounted 0.5 m above counter, matching doors/handles
  Countertop: 30–60 mm thick with 20 mm overhang
  Appliances: Stainless sink (0.55 × 0.40 m) and black-glass cooktop (0.58 × 0.52 m), placeable in any module
  Materials: Light-cream carcasses, off-white doors, mid-gray worktop, dark-metal handles
  Controls: GUI groups for Layout, Base, Wall, Worktop and Appliance positioning. Generate a realistic, modern residential kitchen with real-time parameter updates.

#### 3. Tower
► User prompt: "a tower"

◄ Detailed prompt:
Create a modern 40-story parametric tower with a 90-degree twist across the central 35% of its height.
  Structure: 3 m floor-to-floor, square plan, 3 cylindrical columns per façade side
  Facade: 15 panels per side alternating bright-blue walls (#0000ff) and light-gray windows (#f2f2f2) in a checkerboard layout
  Core: Red-orange vertical core (#d94026) flanked by dark-gray structural columns (#404040)
  Style: Contemporary parametric architecture, crisp geometry, dramatic rotation

### Instruction

Now expand the next request using the same voice and format.

► User prompt: "`;

export async function POST({ request }) {
    try {
        const { prompt } = await request.json();
        
        const openai = new OpenAI({
            apiKey: OPENAI_API_TOKEN,
        });

        const response = await openai.chat.completions.create({
            model: "gpt-5-mini",
            messages: [
                {
                    role: "user",
                    content: fewShotPrompt + prompt + '"\n◄ Detailed prompt:'
                }
            ],
            temperature: 1,
            max_completion_tokens: 4000
        });


        return new Response(JSON.stringify({
            prompt: response.choices[0].message.content
        }), {
            status: 200,
            headers: {
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    } catch (err) {
        console.error('Expand prompt error:', err);
        return new Response(JSON.stringify({ error: 'Failed to expand prompt' }), {
            status: 500
        });
    }
}
