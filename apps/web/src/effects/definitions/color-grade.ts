import type { EffectDefinition } from "@/effects/types";

export const COLOR_GRADE_SHADER = "color_grade";

const LOOK_VALUES: Record<string, number> = {
	none: 0,
	teal_orange: 1,
	vintage: 2,
	mono: 3,
	neon: 4,
};

export const colorGradeEffectDefinition: EffectDefinition = {
	type: "color_grade",
	name: "Color Grade",
	keywords: ["color", "grade", "look", "lut", "color correction", "cc", "color grade", "color grading", "teal", "orange", "vintage", "mono", "neon"],
	params: [
		{
			key: "saturation",
			label: "Saturation",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "contrast",
			label: "Contrast",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "brightness",
			label: "Brightness",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "warmth",
			label: "Warmth",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "look",
			label: "Color Look",
			type: "select",
			default: "none",
			options: [
				{ value: "none", label: "None" },
				{ value: "teal_orange", label: "Teal & Orange" },
				{ value: "vintage", label: "Vintage" },
				{ value: "mono", label: "Mono" },
				{ value: "neon", label: "Neon" },
			],
		},
	],
	renderer: {
		passes: [
			{
				shader: COLOR_GRADE_SHADER,
				uniforms: ({ effectParams }) => ({
					u_saturation: Number(effectParams.saturation) || 0,
					u_contrast: Number(effectParams.contrast) || 0,
					u_brightness: Number(effectParams.brightness) || 0,
					u_warmth: Number(effectParams.warmth) || 0,
					u_look: LOOK_VALUES[String(effectParams.look)] ?? 0,
				}),
			},
		],
	},
};
