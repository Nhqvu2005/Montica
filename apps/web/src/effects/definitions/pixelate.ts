import type { EffectDefinition } from "@/effects/types";

export const PIXELATE_SHADER = "pixelate";

export const pixelateEffectDefinition: EffectDefinition = {
	type: "pixelate",
	name: "Pixelate",
	keywords: ["pixel", "pixelate", "mosaic", "block", "8bit", "retro"],
	params: [
		{
			key: "blockSize",
			label: "Block Size",
			type: "number",
			default: 10,
			min: 2,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: PIXELATE_SHADER,
				uniforms: ({ effectParams }) => ({
					u_blockSize: Number(effectParams.blockSize) || 10,
				}),
			},
		],
	},
};
