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

// Pseudo-random hash functions for deterministic glitch patterns
fn hash1(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn hash_range(p: vec2f, low: f32, high: f32) -> f32 {
    return low + hash1(p) * (high - low);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    // Normalize params from 0-100 to 0-1
    let intensity = uniforms.params0.x / 100.0;    // 0..1
    let frequency = uniforms.params0.y / 100.0;     // 0..1
    let distortion = uniforms.params0.z / 100.0;    // 0..1
    let block_size = uniforms.params0.w / 100.0;    // 0..1

    // If intensity is near zero, pass through
    if (intensity < 0.01) {
        return textureSample(input_texture, input_sampler, input.tex_coord);
    }

    let uv = input.tex_coord;
    let pixel_coord = uv * uniforms.resolution.xy;

    // Sample the original color
    var color = textureSample(input_texture, input_sampler, uv);

    // --- Strip shifting ---
    // Divide the image into horizontal strips based on frequency
    let strip_height = max(2.0, (1.0 - frequency) * 20.0 + 1.0);
    let strip_index = floor(pixel_coord.y / strip_height);
    let strip_seed = vec2f(strip_index, uniforms.params0.x);

    // Each strip independently decides whether to shift
    let shift_amount = hash_range(strip_seed, 0.0, distortion * 30.0 * intensity);

    if (shift_amount > 1.0 && hash1(strip_seed + 10.0) < intensity * 1.5) {
        let shifted_uv = vec2f(
            uv.x + shift_amount / uniforms.resolution.x * sign(hash1(strip_seed + 20.0) - 0.5),
            uv.y
        );
        color = textureSample(input_texture, input_sampler, shifted_uv);
    }

    // --- RGB split ---
    let split_amount = distortion * 8.0 * intensity / uniforms.resolution.x;
    if (split_amount > 0.5 / uniforms.resolution.x) {
        let r_uv = vec2f(uv.x + split_amount, uv.y);
        let b_uv = vec2f(uv.x - split_amount, uv.y);
        let r = textureSample(input_texture, input_sampler, r_uv).r;
        let b = textureSample(input_texture, input_sampler, b_uv).b;
        color = vec4f(r, color.g, b, color.a);
    }

    // --- Block corruption ---
    let block_coord = floor(pixel_coord / (block_size * 4.0 + 4.0));
    let block_seed = hash1(block_coord + uniforms.params0.y);

    if (block_seed < intensity * 0.3 && block_size > 0.05) {
        let block_type = hash1(block_coord * 7.1 + 50.0);

        if (block_type < 0.33) {
            // Solid color block from a shifted sample
            let sample_uv = vec2f(
                uv.x + hash1(block_coord) * 0.1,
                uv.y + hash1(block_coord + 5.0) * 0.1
            );
            color = textureSample(input_texture, input_sampler, sample_uv);
        } else if (block_type < 0.66) {
            // Noise block
            let noise_rgb = vec3f(
                hash1(block_coord + vec2f(0.0, 0.0)),
                hash1(block_coord + vec2f(10.0, 10.0)),
                hash1(block_coord + vec2f(20.0, 20.0))
            );
            color = vec4f(noise_rgb, color.a);
        } else {
            // Inverted color block
            color = vec4f(1.0 - color.rgb, color.a);
        }
    }

    return color;
}
