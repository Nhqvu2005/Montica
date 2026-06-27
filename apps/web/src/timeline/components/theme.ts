import type { TrackType } from "@/timeline";

export const TIMELINE_AUDIO_WAVEFORM_COLOR = "rgba(0, 229, 255, 0.6)";

export const TIMELINE_TRACK_THEME: Record<
	TrackType,
	{
		elementClassName: string;
		waveformColor?: string;
	}
> = {
	video: { elementClassName: "transparent" },
	text: { elementClassName: "bg-[#26C6DA]" },
	audio: {
		elementClassName: "bg-[#00BCD4]",
		waveformColor: TIMELINE_AUDIO_WAVEFORM_COLOR,
	},
	graphic: { elementClassName: "bg-[#80DEEA]" },
	effect: { elementClassName: "bg-[#00ACC1]" },
} as const;

export const SELECTED_TRACK_ROW_CLASS = "bg-accent/60";
export const DEFAULT_TIMELINE_BOOKMARK_COLOR = "#00E5FF";

export function getTimelineElementClassName({
	type,
}: {
	type: TrackType;
}): string {
	return TIMELINE_TRACK_THEME[type].elementClassName.trim();
}
