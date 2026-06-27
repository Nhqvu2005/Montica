struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

struct EffectUniforms {
    resolution: vec4f,
    params0: vec4f,
    params1: vec4f,
    params2: vec4f,
    params3: vec4f,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

// Simple pseudo-random hash
fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.tex_coord;
    let color = textureSample(input_texture, input_sampler, uv);

    let intensity = uniforms.params0.x / 100.0;  // 0..1
    let scale = uniforms.params1.x;                // grain size scale

    // Grain position – scaled so grain size is controllable
    let grain_uv = uv * scale;

    // Two noise samples for a less structured look
    let noise1 = hash(grain_uv);
    let noise2 = hash(grain_uv + vec2f(3.7, 9.2));
    let noise = (noise1 + noise2) * 0.5;

    // Center around 0, scale by intensity
    let grain = (noise - 0.5) * intensity * 1.5;

    return vec4f(color.rgb + grain, color.a);
}
