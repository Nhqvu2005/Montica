import type { EffectDefinition } from "@/effects/types";

export const VHS_SCANLINES_SHADER = "vhs_scanlines";

export const vhsScanlinesEffectDefinition: EffectDefinition = {
	type: "vhs_scanlines",
	name: "VHS Scanlines",
	keywords: ["vhs", "scanlines", "retro", "tv", "crt", "analog", "tracking"],
	params: [
		{
			key: "lineThickness",
			label: "Line Thickness",
			type: "number",
			default: 3,
			min: 1,
			max: 10,
			step: 1,
		},
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
			key: "jitter",
			label: "Tracking Jitter",
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
				shader: VHS_SCANLINES_SHADER,
				uniforms: ({ effectParams }) => ({
					u_lineThickness: Number(effectParams.lineThickness) || 3,
					u_intensity: Number(effectParams.intensity) || 50,
					u_jitter: Number(effectParams.jitter) || 30,
				}),
			},
		],
	},
};
