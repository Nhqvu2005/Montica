import { effectsRegistry } from "../registry";
import { blurEffectDefinition } from "./blur";
import { glitchEffectDefinition } from "./glitch";
import { chromaKeyEffectDefinition } from "./chroma-key";
import { colorGradeEffectDefinition } from "./color-grade";

const defaultEffects = [
	blurEffectDefinition,
	glitchEffectDefinition,
	chromaKeyEffectDefinition,
	colorGradeEffectDefinition,
];

export function registerDefaultEffects(): void {
	for (const definition of defaultEffects) {
		if (effectsRegistry.has(definition.type)) {
			continue;
		}
		effectsRegistry.register({
			key: definition.type,
			definition,
		});
	}
}
