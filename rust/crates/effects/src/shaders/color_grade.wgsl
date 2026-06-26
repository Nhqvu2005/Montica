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

// Helper: RGB to luminance (BT.709)
fn rgb_to_luminance(c: vec3f) -> f32 {
    return dot(c, vec3f(0.2126, 0.7152, 0.0722));
}

// Helper: mix/lerp
fn lerp_vec3(a: vec3f, b: vec3f, t: f32) -> vec3f {
    return a + (b - a) * t;
}

// Apply contrast using a parabolic S-curve
fn apply_contrast(c: f32, contrast: f32) -> f32 {
    // contrast: -1..1, positive = steepen, negative = flatten
    let factor = 1.0 + contrast * 2.0;
    return 0.5 + (c - 0.5) * max(0.0, factor);
}

// Teal & Orange look: teal shadows, orange highlights
fn apply_teal_orange(c: vec3f) -> vec3f {
    let luma = rgb_to_luminance(c);
    let teal = vec3f(0.1, 0.25, 0.40);
    let orange = vec3f(0.95, 0.55, 0.15);

    // Blend teal into shadows, orange into highlights
    let shadow_t = max(0.0, 1.0 - luma * 2.0);
    let highlight_t = max(0.0, (luma - 0.5) * 2.0);

    let graded = lerp_vec3(teal, vec3f(0.5), shadow_t);
    let graded2 = lerp_vec3(vec3f(0.5), orange, highlight_t);
    let tone = graded * (1.0 - highlight_t) + graded2 * highlight_t;

    return lerp_vec3(tone, c, 0.3 + 0.7 * luma);
}

// Vintage look: warm sepia tone
fn apply_vintage(c: vec3f) -> vec3f {
    let sepia = vec3f(
        dot(c, vec3f(0.393, 0.769, 0.189)),
        dot(c, vec3f(0.349, 0.686, 0.168)),
        dot(c, vec3f(0.272, 0.534, 0.131))
    );
    return lerp_vec3(sepia, c, 0.3);
}

// Mono: full desaturation with slight contrast boost
fn apply_mono(c: vec3f) -> vec3f {
    let luma = rgb_to_luminance(c);
    let contrasted = apply_contrast(luma, 0.15);
    return vec3f(contrasted, contrasted, contrasted);
}

// Neon: high contrast, boosted saturation, subtle cool shift
fn apply_neon(c: vec3f) -> vec3f {
    let luma = rgb_to_luminance(c);
    let saturated = lerp_vec3(vec3f(luma), c, 2.0);
    let contrasted = vec3f(
        apply_contrast(saturated.r, 0.3),
        apply_contrast(saturated.g, 0.3),
        apply_contrast(saturated.b, 0.3)
    );
    return vec3f(
        contrasted.r * 0.95,
        contrasted.g * 0.98,
        min(1.0, contrasted.b * 1.1)
    );
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let uv = input.tex_coord;
    let color = textureSample(input_texture, input_sampler, uv);

    // Read uniforms
    // params0: (saturation, contrast, brightness, warmth) — each -100..100
    // params1: (look, 0, 0, 0) — look is 0..4 integer encoded as float
    let saturation = uniforms.params0.x / 100.0;   // -1..1
    let contrast = uniforms.params0.y / 100.0;      // -1..1
    let brightness = uniforms.params0.z / 100.0;    // -1..1
    let warmth = uniforms.params0.w / 100.0;        // -1..1
    let look = uniforms.params1.x;                   // 0..4

    var result = color.rgb;

    // --- Step 1: Brightness (additive, applied first) ---
    result = result + vec3f(brightness);

    // --- Step 2: Contrast ---
    result = vec3f(
        apply_contrast(result.r, contrast),
        apply_contrast(result.g, contrast),
        apply_contrast(result.b, contrast)
    );

    // --- Step 3: Saturation ---
    if (abs(saturation) > 0.005) {
        let luma = rgb_to_luminance(result);
        let sat_factor = 1.0 + saturation;
        result = lerp_vec3(vec3f(luma), result, sat_factor);
        result = clamp(result, vec3f(0.0), vec3f(1.0));
    }

    // --- Step 4: Warmth (temperature shift) ---
    if (abs(warmth) > 0.005) {
        let warm_factor = warmth * 0.3;
        result.r = result.r * (1.0 + warm_factor);
        result.b = result.b * (1.0 - warm_factor);
        result = clamp(result, vec3f(0.0), vec3f(1.0));
    }

    // --- Step 5: Look presets ---
    if (look > 0.5 && look < 1.5) {
        result = apply_teal_orange(result);
    } else if (look > 1.5 && look < 2.5) {
        result = apply_vintage(result);
    } else if (look > 2.5 && look < 3.5) {
        result = apply_mono(result);
    } else if (look > 3.5) {
        result = apply_neon(result);
    }

    return vec4f(clamp(result, vec3f(0.0), vec3f(1.0)), color.a);
}
