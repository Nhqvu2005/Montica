use std::collections::HashMap;

use bytemuck::{Pod, Zeroable};
use gpu::GpuContext;
use thiserror::Error;
use wgpu::util::DeviceExt;

use crate::{EffectPass, UniformValue};

const GAUSSIAN_BLUR_SHADER_ID: &str = "gaussian-blur";
const GAUSSIAN_BLUR_SHADER_SOURCE: &str = include_str!("shaders/gaussian_blur.wgsl");

const GLITCH_SHADER_ID: &str = "glitch";
const GLITCH_SHADER_SOURCE: &str = include_str!("shaders/glitch.wgsl");

const CHROMA_KEY_SHADER_ID: &str = "chroma_key";
const CHROMA_KEY_SHADER_SOURCE: &str = include_str!("shaders/chroma_key.wgsl");

const COLOR_GRADE_SHADER_ID: &str = "color_grade";
const COLOR_GRADE_SHADER_SOURCE: &str = include_str!("shaders/color_grade.wgsl");

const CROP_SHADER_ID: &str = "crop";
const CROP_SHADER_SOURCE: &str = include_str!("shaders/crop.wgsl");

pub struct ApplyEffectsOptions<'a> {
    pub source: &'a wgpu::Texture,
    pub width: u32,
    pub height: u32,
    pub passes: &'a [EffectPass],
}

pub struct EffectPipeline {
    uniform_bind_group_layout: wgpu::BindGroupLayout,
    pipelines: HashMap<String, wgpu::RenderPipeline>,
}

#[derive(Debug, Error)]
pub enum EffectsError {
    #[error("At least one effect pass is required")]
    MissingEffectPasses,
    #[error("Unknown effect shader '{shader}'")]
    UnknownEffectShader { shader: String },
    #[error("Missing uniform '{uniform}' for shader '{shader}'")]
    MissingUniform { shader: String, uniform: String },
    #[error("Uniform '{uniform}' for shader '{shader}' must be a number")]
    InvalidNumberUniform { shader: String, uniform: String },
    #[error(
        "Uniform '{uniform}' for shader '{shader}' must be a vector of length {expected_length}"
    )]
    InvalidVectorUniform {
        shader: String,
        uniform: String,
        expected_length: usize,
    },
    #[error("Shader '{shader}' does not support uniform '{uniform}'")]
    UnsupportedUniform { shader: String, uniform: String },
}

/// Generalized uniform buffer compatible with all WGSL effect shaders.
///
/// Layout (80 bytes):
///   resolution: vec4f     — (width, height, 0, 0)
///   params0..3: vec4f    — shader-specific parameters
///
/// Each shader defines its own WGSL `EffectUniforms` struct with the same
/// structure but interprets `params0..3` according to its own needs.
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct EffectUniformBuffer {
    resolution: [f32; 4],
    params0: [f32; 4],
    params1: [f32; 4],
    params2: [f32; 4],
    params3: [f32; 4],
}

impl EffectPipeline {
    pub fn new(context: &GpuContext) -> Self {
        let uniform_bind_group_layout =
            context
                .device()
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("effects-uniform-bind-group-layout"),
                    entries: &[wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    }],
                });

        // Create all shader modules (each contains both vertex and fragment entry points)
        let shader_modules: Vec<(&str, wgpu::ShaderModule)> = vec![
            (
                GAUSSIAN_BLUR_SHADER_ID,
                context
                    .device()
                    .create_shader_module(wgpu::ShaderModuleDescriptor {
                        label: Some("effects-gaussian-blur-shader"),
                        source: wgpu::ShaderSource::Wgsl(GAUSSIAN_BLUR_SHADER_SOURCE.into()),
                    }),
            ),
            (
                GLITCH_SHADER_ID,
                context
                    .device()
                    .create_shader_module(wgpu::ShaderModuleDescriptor {
                        label: Some("effects-glitch-shader"),
                        source: wgpu::ShaderSource::Wgsl(GLITCH_SHADER_SOURCE.into()),
                    }),
            ),
            (
                CHROMA_KEY_SHADER_ID,
                context
                    .device()
                    .create_shader_module(wgpu::ShaderModuleDescriptor {
                        label: Some("effects-chroma-key-shader"),
                        source: wgpu::ShaderSource::Wgsl(CHROMA_KEY_SHADER_SOURCE.into()),
                    }),
            ),
            (
                COLOR_GRADE_SHADER_ID,
                context
                    .device()
                    .create_shader_module(wgpu::ShaderModuleDescriptor {
                        label: Some("effects-color-grade-shader"),
                        source: wgpu::ShaderSource::Wgsl(COLOR_GRADE_SHADER_SOURCE.into()),
                    }),
            ),
            (
                CROP_SHADER_ID,
                context
                    .device()
                    .create_shader_module(wgpu::ShaderModuleDescriptor {
                        label: Some("effects-crop-shader"),
                        source: wgpu::ShaderSource::Wgsl(CROP_SHADER_SOURCE.into()),
                    }),
            ),
        ];

        // Build shared pipeline layout (all effects use the same bind group layout)
        let pipeline_layout =
            context
                .device()
                .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                    label: Some("effects-pipeline-layout"),
                    bind_group_layouts: &[
                        Some(context.texture_sampler_bind_group_layout()),
                        Some(&uniform_bind_group_layout),
                    ],
                    immediate_size: 0,
                });

        // Create a render pipeline for each shader module
        let pipelines: HashMap<String, wgpu::RenderPipeline> = shader_modules
            .into_iter()
            .map(|(id, module)| {
                let pipeline = create_effect_pipeline(context, &pipeline_layout, &module, id);
                (id.to_string(), pipeline)
            })
            .collect();

        Self {
            uniform_bind_group_layout,
            pipelines,
        }
    }

    pub fn apply(
        &self,
        context: &GpuContext,
        ApplyEffectsOptions {
            source,
            width,
            height,
            passes,
        }: ApplyEffectsOptions<'_>,
    ) -> Result<wgpu::Texture, EffectsError> {
        let mut encoder = context
            .device()
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("effects-command-encoder"),
            });
        let output = self.apply_with_encoder(
            context,
            &mut encoder,
            ApplyEffectsOptions {
                source,
                width,
                height,
                passes,
            },
        )?;
        context.queue().submit([encoder.finish()]);
        Ok(output)
    }

    pub fn apply_with_encoder(
        &self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        ApplyEffectsOptions {
            source,
            width,
            height,
            passes,
        }: ApplyEffectsOptions<'_>,
    ) -> Result<wgpu::Texture, EffectsError> {
        let mut current_texture: Option<wgpu::Texture> = None;

        for pass in passes {
            let input_texture = current_texture.as_ref().unwrap_or(source);
            let output_texture =
                context.create_render_texture(width, height, "effects-pass-output");
            let input_view = input_texture.create_view(&wgpu::TextureViewDescriptor::default());
            let output_view = output_texture.create_view(&wgpu::TextureViewDescriptor::default());
            let texture_bind_group =
                context
                    .device()
                    .create_bind_group(&wgpu::BindGroupDescriptor {
                        label: Some("effects-texture-bind-group"),
                        layout: context.texture_sampler_bind_group_layout(),
                        entries: &[
                            wgpu::BindGroupEntry {
                                binding: 0,
                                resource: wgpu::BindingResource::TextureView(&input_view),
                            },
                            wgpu::BindGroupEntry {
                                binding: 1,
                                resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                            },
                        ],
                    });
            let uniform_buffer =
                context
                    .device()
                    .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                        label: Some("effects-uniform-buffer"),
                        contents: bytemuck::bytes_of(&pack_effect_uniforms(pass, width, height)?),
                        usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                    });
            let uniform_bind_group =
                context
                    .device()
                    .create_bind_group(&wgpu::BindGroupDescriptor {
                        label: Some("effects-uniform-bind-group"),
                        layout: &self.uniform_bind_group_layout,
                        entries: &[wgpu::BindGroupEntry {
                            binding: 0,
                            resource: uniform_buffer.as_entire_binding(),
                        }],
                    });
            let pipeline = self.pipelines.get(&pass.shader).ok_or_else(|| {
                EffectsError::UnknownEffectShader {
                    shader: pass.shader.clone(),
                }
            })?;

            {
                let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                    label: Some("effects-render-pass"),
                    color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                        view: &output_view,
                        resolve_target: None,
                        depth_slice: None,
                        ops: wgpu::Operations {
                            load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                            store: wgpu::StoreOp::Store,
                        },
                    })],
                    depth_stencil_attachment: None,
                    occlusion_query_set: None,
                    timestamp_writes: None,
                    multiview_mask: None,
                });
                render_pass.set_pipeline(pipeline);
                render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
                render_pass.set_bind_group(0, &texture_bind_group, &[]);
                render_pass.set_bind_group(1, &uniform_bind_group, &[]);
                render_pass.draw(0..6, 0..1);
            }

            current_texture = Some(output_texture);
        }

        current_texture.ok_or(EffectsError::MissingEffectPasses)
    }
}

/// Pack effect pass uniforms into the fixed-size uniform buffer.
///
/// Each shader type maps its named uniforms to the `params{0..3}` slots.
/// Unused slots remain zero.
fn pack_effect_uniforms(
    pass: &EffectPass,
    width: u32,
    height: u32,
) -> Result<EffectUniformBuffer, EffectsError> {
    let resolution = [width as f32, height as f32, 0.0, 0.0];

    match pass.shader.as_str() {
        "gaussian-blur" => {
            let sigma = read_number_uniform(pass, "u_sigma")?;
            let step = read_number_uniform(pass, "u_step")?;
            let direction = read_vec2_uniform(pass, "u_direction")?;
            Ok(EffectUniformBuffer {
                resolution,
                params0: [sigma, step, direction[0], direction[1]],
                params1: [0.0; 4],
                params2: [0.0; 4],
                params3: [0.0; 4],
            })
        }
        "glitch" => {
            let intensity = read_number_uniform(pass, "u_intensity")?;
            let frequency = read_number_uniform(pass, "u_frequency")?;
            let distortion = read_number_uniform(pass, "u_distortion")?;
            let block_size = read_number_uniform(pass, "u_blockSize")?;
            Ok(EffectUniformBuffer {
                resolution,
                params0: [intensity, frequency, distortion, block_size],
                params1: [0.0; 4],
                params2: [0.0; 4],
                params3: [0.0; 4],
            })
        }
        "chroma_key" => {
            let key_color = read_vec3_uniform(pass, "u_keyColor")?;
            let similarity = read_number_uniform(pass, "u_similarity")?;
            let smoothness = read_number_uniform(pass, "u_smoothness")?;
            let spill_reduction = read_number_uniform(pass, "u_spillReduction")?;
            Ok(EffectUniformBuffer {
                resolution,
                params0: [key_color[0], key_color[1], key_color[2], 0.0],
                params1: [similarity, smoothness, spill_reduction, 0.0],
                params2: [0.0; 4],
                params3: [0.0; 4],
            })
        }
        "color_grade" => {
            let saturation = read_number_uniform(pass, "u_saturation")?;
            let contrast = read_number_uniform(pass, "u_contrast")?;
            let brightness = read_number_uniform(pass, "u_brightness")?;
            let warmth = read_number_uniform(pass, "u_warmth")?;
            let look = read_number_uniform(pass, "u_look")?;
            Ok(EffectUniformBuffer {
                resolution,
                params0: [saturation, contrast, brightness, warmth],
                params1: [look, 0.0, 0.0, 0.0],
                params2: [0.0; 4],
                params3: [0.0; 4],
            })
        }
        "crop" => {
            let crop_left = read_number_uniform(pass, "u_cropLeft")?;
            let crop_top = read_number_uniform(pass, "u_cropTop")?;
            let crop_right = read_number_uniform(pass, "u_cropRight")?;
            let crop_bottom = read_number_uniform(pass, "u_cropBottom")?;
            Ok(EffectUniformBuffer {
                resolution,
                params0: [crop_left, crop_top, crop_right, crop_bottom],
                params1: [0.0; 4],
                params2: [0.0; 4],
                params3: [0.0; 4],
            })
        }
        _ => Err(EffectsError::UnsupportedUniform {
            shader: pass.shader.clone(),
            uniform: "(shader name)".to_string(),
        }),
    }
}

/// Read a scalar uniform value from the pass.
fn read_number_uniform(pass: &EffectPass, uniform: &str) -> Result<f32, EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Err(EffectsError::MissingUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        });
    };
    match value {
        UniformValue::Number(value) => Ok(*value),
        UniformValue::Vector(_) => Err(EffectsError::InvalidNumberUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        }),
    }
}

/// Read a 2-element vector uniform.
fn read_vec2_uniform(pass: &EffectPass, uniform: &str) -> Result<[f32; 2], EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Err(EffectsError::MissingUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        });
    };
    let UniformValue::Vector(values) = value else {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 2,
        });
    };
    if values.len() != 2 {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 2,
        });
    }
    Ok([values[0], values[1]])
}

/// Read a 3-element vector uniform.
fn read_vec3_uniform(pass: &EffectPass, uniform: &str) -> Result<[f32; 3], EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Err(EffectsError::MissingUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        });
    };
    let UniformValue::Vector(values) = value else {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 3,
        });
    };
    if values.len() != 3 {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 3,
        });
    }
    Ok([values[0], values[1], values[2]])
}

/// Create a render pipeline for an effect shader module.
fn create_effect_pipeline(
    context: &GpuContext,
    layout: &wgpu::PipelineLayout,
    module: &wgpu::ShaderModule,
    label: &str,
) -> wgpu::RenderPipeline {
    context
        .device()
        .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some(&format!("effects-{label}-pipeline")),
            layout: Some(layout),
            vertex: wgpu::VertexState {
                module,
                entry_point: Some("vertex_main"),
                buffers: &[wgpu::VertexBufferLayout {
                    array_stride: std::mem::size_of::<[f32; 2]>() as u64,
                    step_mode: wgpu::VertexStepMode::Vertex,
                    attributes: &[wgpu::VertexAttribute {
                        format: wgpu::VertexFormat::Float32x2,
                        offset: 0,
                        shader_location: 0,
                    }],
                }],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module,
                entry_point: Some("fragment_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: context.texture_format(),
                    blend: None,
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState::default(),
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview_mask: None,
            cache: None,
        })
}
