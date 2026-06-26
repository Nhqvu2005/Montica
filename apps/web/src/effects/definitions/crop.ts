import type { EffectDefinition } from "@/effects/types";

export const CROP_SHADER = "crop";

export const cropEffectDefinition: EffectDefinition = {
	type: "crop",
	name: "Crop",
	keywords: ["crop", "cut", "trim", "crop", "clip"],
	params: [
		{
			key: "left",
			label: "Left",
			type: "number",
			default: 0,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "top",
			label: "Top",
			type: "number",
			default: 0,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "right",
			label: "Right",
			type: "number",
			default: 0,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "bottom",
			label: "Bottom",
			type: "number",
			default: 0,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: CROP_SHADER,
				uniforms: ({ effectParams }) => ({
					u_cropLeft: (Number(effectParams.left) || 0) / 100,
					u_cropTop: (Number(effectParams.top) || 0) / 100,
					u_cropRight: (Number(effectParams.right) || 0) / 100,
					u_cropBottom: (Number(effectParams.bottom) || 0) / 100,
				}),
			},
		],
	},
};
