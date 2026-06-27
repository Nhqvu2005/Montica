import type { EffectDefinition } from "@/effects/types";

export const FILM_GRAIN_SHADER = "film_grain";

export const filmGrainEffectDefinition: EffectDefinition = {
	type: "film_grain",
	name: "Film Grain",
	keywords: ["grain", "noise", "film", "texture", "analog", "dust", "retro"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 20,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "size",
			label: "Grain Size",
			type: "number",
			default: 500,
			min: 50,
			max: 2000,
			step: 50,
		},
	],
	renderer: {
		passes: [
			{
				shader: FILM_GRAIN_SHADER,
				uniforms: ({ effectParams }) => ({
					u_intensity: Number(effectParams.intensity) || 0,
					u_scale: Number(effectParams.size) || 500,
				}),
			},
		],
	},
};
