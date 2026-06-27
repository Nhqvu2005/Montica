import type { EffectDefinition } from "@/effects/types";

export const VIGNETTE_SHADER = "vignette";

export const vignetteEffectDefinition: EffectDefinition = {
	type: "vignette",
	name: "Vignette",
	keywords: ["vignette", "darken", "edges", "shadow", "vintage", "film"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "softness",
			label: "Softness",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "roundness",
			label: "Roundness",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: VIGNETTE_SHADER,
				uniforms: ({ effectParams }) => ({
					u_intensity: Number(effectParams.intensity) || 0,
					u_softness: Number(effectParams.softness) || 0,
					u_roundness: Number(effectParams.roundness) || 0,
				}),
			},
		],
	},
};
