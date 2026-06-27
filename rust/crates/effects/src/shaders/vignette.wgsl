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

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.tex_coord;
    let color = textureSample(input_texture, input_sampler, uv);

    let intensity = uniforms.params0.x / 100.0;  // 0..1
    let softness = uniforms.params0.y / 100.0;    // 0..1
    let roundness = uniforms.params0.z / 100.0;   // 0..1

    // Distance from center (normalized so corners ≈ 1.0)
    let center = vec2f(0.5, 0.5);
    let radial_dist = length(uv - center) * 1.414;

    // Rectangular distance (aspect-aware)
    let dx = abs(uv.x - 0.5) * 2.0;
    let dy = abs(uv.y - 0.5) * 2.0;
    let rect_dist = max(dx, dy);

    // Mix between radial and rectangular based on roundness
    let final_dist = mix(rect_dist, radial_dist, roundness);

    // Vignette falloff: start fading at `softness`, fully dark at edge
    let falloff_start = softness * 0.3;
    let vignette_amount = smoothstep(falloff_start, 1.0, final_dist) * intensity;
    let factor = 1.0 - vignette_amount;

    return vec4f(color.rgb * factor, color.a);
}
