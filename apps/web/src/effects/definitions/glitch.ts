import type { EffectDefinition } from "@/effects/types";

export const GLITCH_SHADER = "glitch";

export const glitchEffectDefinition: EffectDefinition = {
	type: "glitch",
	name: "Glitch",
	keywords: ["glitch", "glitchy", "error", "digital", "corrupt", "cyberpunk", "hacker", "vhs", "static"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 30,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "frequency",
			label: "Frequency",
			type: "number",
			default: 20,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "distortion",
			label: "Distortion",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "blockSize",
			label: "Block Size",
			type: "number",
			default: 30,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: GLITCH_SHADER,
				uniforms: ({ effectParams }) => ({
					u_intensity: Number(effectParams.intensity) || 0,
					u_frequency: Number(effectParams.frequency) || 0,
					u_distortion: Number(effectParams.distortion) || 0,
					u_blockSize: Number(effectParams.blockSize) || 0,
				}),
			},
		],
	},
};
