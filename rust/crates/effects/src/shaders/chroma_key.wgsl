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

// Helper: RGB to luminance (relative luminance, BT.709)
fn rgb_to_luminance(c: vec3f) -> f32 {
    return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

// Squared Euclidean distance in RGB space
fn color_distance_squared(a: vec3f, b: vec3f) -> f32 {
    let d = a - b;
    return dot(d, d);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.tex_coord;
    let color = textureSample(input_texture, input_sampler, uv);

    // Read uniforms
    let key_color = uniforms.params0.xyz;
    let similarity = uniforms.params1.x / 100.0;        // 0..1
    let smoothness = uniforms.params1.y / 100.0;         // 0..1
    let spill_reduction = uniforms.params1.z / 100.0;    // 0..1

    // Compute distance from key color (use squared distance to avoid sqrt)
    let dist_sq = color_distance_squared(color.rgb, key_color);
    // Scale for reasonable threshold values: max distance^2 in RGB = 3.0
    let dist = sqrt(dist_sq) / 1.732;  // normalize so max is ~1.0

    // Threshold: similarity controls how far from key color is "transparent"
    // similarity=0 → threshold=1 (key nothing), similarity=100 → threshold=0 (key everything)
    let threshold = 1.0 - similarity;

    // Apply smoothstep for alpha with feathering
    let edge_width = max(0.001, smoothness * 0.5);
    let alpha = 1.0 - smoothstep(
        max(0.0, threshold - edge_width),
        min(1.0, threshold + edge_width),
        dist
    );

    // Clamp alpha to original alpha
    let out_alpha = min(color.a, alpha);

    // --- Spill reduction ---
    if (spill_reduction > 0.01 && dist < threshold + edge_width) {
        let spill_factor = smoothstep(threshold + edge_width, threshold * 0.5, dist);
        let spill_amount = spill_reduction * spill_factor;
        let luminance = rgb_to_luminance(color.rgb);

        // Mix toward gray
        var corrected = mix(color.rgb, vec3f(luminance), spill_amount);

        // Reduce the dominant key color channel more aggressively
        if (key_color.r > key_color.g && key_color.r > key_color.b) {
            corrected.r = mix(corrected.r, luminance, spill_amount * 0.5);
        } else if (key_color.g > key_color.r && key_color.g > key_color.b) {
            corrected.g = mix(corrected.g, luminance, spill_amount * 0.5);
        } else {
            corrected.b = mix(corrected.b, luminance, spill_amount * 0.5);
        }

        return vec4f(corrected, out_alpha);
    }

    return vec4f(color.rgb, out_alpha);
}
