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

    let block_size = uniforms.params0.x;             // 2..100
    let num_blocks_h = max(1.0, uniforms.resolution.x / block_size);
    let num_blocks_v = max(1.0, uniforms.resolution.y / block_size);

    // Snap UV to center of each block
    let block_uv = floor(uv * vec2f(num_blocks_h, num_blocks_v)) / vec2f(num_blocks_h, num_blocks_v);
    let block_center = block_uv + vec2f(0.5 / num_blocks_h, 0.5 / num_blocks_v);

    let color = textureSample(input_texture, input_sampler, block_center);
    return vec4f(color.rgb, color.a);
}
