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

// Pseudo-random hash for line jitter
fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.tex_coord;
    let color = textureSample(input_texture, input_sampler, uv);

    let line_thickness = uniforms.params0.x;          // pixel height of each scanline
    let intensity = uniforms.params0.y / 100.0;        // 0..1
    let jitter = uniforms.params0.z / 100.0;            // 0..1 horizontal jitter amount

    let row = uv.y * uniforms.resolution.y;
    let line_row = floor(row / line_thickness);

    // Every other line is a scanline
    let is_scanline = (i32(line_row) % 2) == 0;

    // Darken scanlines
    let darken_amount = select(0.0, intensity * 0.4, is_scanline);
    var result = color.rgb * (1.0 - darken_amount);

    // Horizontal jitter: shift every scanline slightly
    if (jitter > 0.01) {
        let jitter_offset = (hash(vec2f(line_row, 0.0)) - 0.5) * jitter * 0.1;
        let jittered_uv = vec2f(uv.x + jitter_offset, uv.y);
        let jittered_color = textureSample(input_texture, input_sampler, jittered_uv);
        // Only apply jitter to odd lines (gives that VHS tracking look)
        let jitter_amount = select(0.0, jitter * 0.5, is_scanline);
        result = mix(result, jittered_color.rgb, jitter_amount);
    }

    return vec4f(result, color.a);
}
