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
    // params0 = (cropLeft, cropTop, cropRight, cropBottom) — each 0..1
    let crop_left = uniforms.params0.x;
    let crop_top = uniforms.params0.y;
    let crop_right = uniforms.params0.z;
    let crop_bottom = uniforms.params0.w;

    // Remap UV: stretch the visible region to fill [0,1]
    let uv = vec2f(
        input.tex_coord.x * (1.0 - crop_left - crop_right) + crop_left,
        input.tex_coord.y * (1.0 - crop_top - crop_bottom) + crop_top
    );

    // Original UV in crop space — if outside visible rect, alpha = 0
    let orig_uv = input.tex_coord;
    if (orig_uv.x < crop_left || orig_uv.x > 1.0 - crop_right ||
        orig_uv.y < crop_top || orig_uv.y > 1.0 - crop_bottom) {
        return vec4f(0.0, 0.0, 0.0, 0.0);
    }

    let color = textureSample(input_texture, input_sampler, uv);
    return color;
}
