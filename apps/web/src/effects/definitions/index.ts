import { effectsRegistry } from "../registry";
import { blurEffectDefinition } from "./blur";
import { glitchEffectDefinition } from "./glitch";
import { chromaKeyEffectDefinition } from "./chroma-key";
import { colorGradeEffectDefinition } from "./color-grade";
import { cropEffectDefinition } from "./crop";

const defaultEffects = [
	blurEffectDefinition,
	glitchEffectDefinition,
	chromaKeyEffectDefinition,
	colorGradeEffectDefinition,
	cropEffectDefinition,
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
