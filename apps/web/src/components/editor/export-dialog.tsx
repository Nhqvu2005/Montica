"use client";

import { useState } from "react";
import { TransitionTopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/ui";
import {
	getExportMimeType,
	getExportFileExtension,
	downloadBuffer,
	type ExportFormat,
	type ExportQuality,
	type ExportResolution,
} from "@/export";
import { Check, Copy, Download, RotateCcw } from "lucide-react";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { useEditor } from "@/editor/use-editor";
import { DEFAULT_EXPORT_OPTIONS } from "@/export/defaults";

const EXPORT_FORMAT_VALUES = ["mp4", "webm"] as const;
const EXPORT_QUALITY_VALUES = ["low", "medium", "high", "very_high"] as const;

const RESOLUTION_PRESETS: ExportResolution[] = [
	{ width: 3840, height: 2160, label: "4K (2160p)", scale: 2 },
	{ width: 1920, height: 1080, label: "1080p", scale: 1 },
	{ width: 1280, height: 720, label: "720p", scale: 0.667 },
	{ width: 854, height: 480, label: "480p", scale: 0.444 },
	{ width: 640, height: 360, label: "360p", scale: 0.333 },
];

function isExportFormat(value: string): value is ExportFormat {
	return EXPORT_FORMAT_VALUES.some((f) => f === value);
}

function isExportQuality(value: string): value is ExportQuality {
	return EXPORT_QUALITY_VALUES.some((q) => q === value);
}

export function ExportDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const exportState = useEditor((e) => e.project.getExportState());
	const { isExporting, progress, result: exportResult } = exportState;

	const [format, setFormat] = useState<ExportFormat>(
		DEFAULT_EXPORT_OPTIONS.format,
	);
	const [quality, setQuality] = useState<ExportQuality>(
		DEFAULT_EXPORT_OPTIONS.quality,
	);
	const [shouldIncludeAudio, setShouldIncludeAudio] = useState<boolean>(
		DEFAULT_EXPORT_OPTIONS.includeAudio ?? true,
	);
	const [selectedResolution, setSelectedResolution] =
		useState<ExportResolution>(RESOLUTION_PRESETS[1]); // default 1080p

	const handleExport = async () => {
		if (!activeProject) return;

		const result = await editor.project.export({
			options: {
				format,
				quality,
				fps: activeProject.settings.fps,
				includeAudio: shouldIncludeAudio,
				resolution: selectedResolution,
			},
		});

		if (result.cancelled) {
			editor.project.clearExportState();
			return;
		}

		if (result.success && result.buffer) {
			downloadBuffer({
				buffer: result.buffer,
				filename: `${activeProject.metadata.name}${getExportFileExtension({ format })}`,
				mimeType: getExportMimeType({ format }),
			});

			editor.project.clearExportState();
			onOpenChange(false);
		}
	};

	const handleCancel = () => {
		editor.project.cancelExport();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			editor.project.cancelExport();
			editor.project.clearExportState();
		}
		onOpenChange(open);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Export project</DialogTitle>
				</DialogHeader>

				{exportResult && !exportResult.success ? (
					<ExportErrorContent
						error={exportResult.error || "Unknown error occurred"}
						onRetry={handleExport}
					/>
				) : (
					<>
						{!isExporting && (
							<DialogBody>
								{/* Format */}
								<Section collapsible defaultOpen={false} showTopBorder={false}>
									<SectionHeader>
										<SectionTitle>Format</SectionTitle>
									</SectionHeader>
									<SectionContent>
										<RadioGroup
											value={format}
											onValueChange={(value) => {
												if (isExportFormat(value)) setFormat(value);
											}}
										>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="mp4" id="dlg-mp4" />
												<Label htmlFor="dlg-mp4">
													MP4 (H.264) — Better compatibility
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="webm" id="dlg-webm" />
												<Label htmlFor="dlg-webm">
													WebM (VP9) — Smaller file size
												</Label>
											</div>
										</RadioGroup>
									</SectionContent>
								</Section>

								{/* Resolution */}
								<Section collapsible defaultOpen={false}>
									<SectionHeader>
										<SectionTitle>Resolution</SectionTitle>
									</SectionHeader>
									<SectionContent>
										<RadioGroup
											value={String(selectedResolution.scale)}
											onValueChange={(value) => {
												const preset = RESOLUTION_PRESETS.find(
													(r) => String(r.scale) === value,
												);
												if (preset) setSelectedResolution(preset);
											}}
										>
											{RESOLUTION_PRESETS.map((res) => (
												<div
													key={res.label}
													className="flex items-center space-x-2"
												>
													<RadioGroupItem
														value={String(res.scale)}
														id={`res-${res.label}`}
													/>
													<Label htmlFor={`res-${res.label}`}>
														{res.label}
													</Label>
												</div>
											))}
										</RadioGroup>
										{activeProject && (
											<p className="text-muted-foreground mt-2 text-xs">
												Project: {activeProject.settings.canvasSize.width} ×{" "}
												{activeProject.settings.canvasSize.height}
												{" → "}
												{Math.round(
													activeProject.settings.canvasSize.width *
														selectedResolution.scale,
												)}
												{" × "}
												{Math.round(
													activeProject.settings.canvasSize.height *
														selectedResolution.scale,
												)}
											</p>
										)}
									</SectionContent>
								</Section>

								{/* Quality */}
								<Section collapsible defaultOpen={false}>
									<SectionHeader>
										<SectionTitle>Quality</SectionTitle>
									</SectionHeader>
									<SectionContent>
										<RadioGroup
											value={quality}
											onValueChange={(value) => {
												if (isExportQuality(value)) setQuality(value);
											}}
										>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="low" id="dlg-low" />
												<Label htmlFor="dlg-low">
													Low — Smallest file size
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="medium" id="dlg-medium" />
												<Label htmlFor="dlg-medium">
													Medium — Balanced
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="high" id="dlg-high" />
												<Label htmlFor="dlg-high">
													High — Recommended
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<RadioGroupItem
													value="very_high"
													id="dlg-very-high"
												/>
												<Label htmlFor="dlg-very-high">
													Very high — Largest file size
												</Label>
											</div>
										</RadioGroup>
									</SectionContent>
								</Section>

								{/* Audio */}
								<Section collapsible defaultOpen={false}>
									<SectionHeader>
										<SectionTitle>Audio</SectionTitle>
									</SectionHeader>
									<SectionContent>
										<div className="flex items-center space-x-2">
											<Checkbox
												id="dlg-include-audio"
												checked={shouldIncludeAudio}
												onCheckedChange={(checked) =>
													setShouldIncludeAudio(!!checked)
												}
											/>
											<Label htmlFor="dlg-include-audio">
												Include audio in export
											</Label>
										</div>
									</SectionContent>
								</Section>
							</DialogBody>
						)}

						{isExporting && (
							<DialogBody>
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<p className="text-muted-foreground text-sm">
											{Math.round(progress * 100)}%
										</p>
										<p className="text-muted-foreground text-sm">100%</p>
									</div>
									<Progress value={progress * 100} className="w-full" />
									<p className="text-muted-foreground mt-1 text-center text-xs">
										Rendering video...
									</p>
								</div>
							</DialogBody>
						)}
					</>
				)}

				<DialogFooter className={cn(isExporting ? "pt-0 border-t-0" : "")}>
					{!isExporting && !(exportResult && !exportResult.success) && (
						<Button
							onClick={handleExport}
							className="w-full gap-2"
							disabled={!activeProject}
						>
							<Download className="size-4" />
							Export
						</Button>
					)}
					{isExporting && (
						<Button
							variant="outline"
							className="w-full rounded-md"
							onClick={handleCancel}
						>
							Cancel
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ExportErrorContent({
	error,
	onRetry,
}: {
	error: string;
	onRetry: () => void;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(error);
		setCopied(true);
		setTimeout(() => setCopied(false), 1000);
	};

	return (
		<DialogBody>
			<div className="space-y-4">
				<div className="flex flex-col gap-1.5">
					<p className="text-destructive text-sm font-medium">Export failed</p>
					<p className="text-muted-foreground text-xs">{error}</p>
				</div>

				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						className="h-8 flex-1 text-xs"
						onClick={handleCopy}
					>
						{copied ? (
							<Check className="text-constructive size-3.5" />
						) : (
							<Copy className="size-3.5" />
						)}
						Copy
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="h-8 flex-1 text-xs"
						onClick={onRetry}
					>
						<RotateCcw className="size-3.5" />
						Retry
					</Button>
				</div>
			</div>
		</DialogBody>
	);
}

/** Trigger button for the Export Dialog */
export function ExportButtonTrigger({
	onClick,
	hasProject,
}: {
	onClick: () => void;
	hasProject: boolean;
}) {
	return (
		<button
			type="button"
			className={cn(
				"flex items-center gap-1.5 rounded-md bg-[#38BDF8] px-[0.12rem] py-[0.12rem] text-white",
				hasProject ? "cursor-pointer" : "cursor-not-allowed opacity-50",
			)}
			onClick={hasProject ? onClick : undefined}
			disabled={!hasProject}
			onKeyDown={(event) => {
				if (hasProject && (event.key === "Enter" || event.key === " ")) {
					event.preventDefault();
					onClick();
				}
			}}
		>
			<div className="relative flex items-center gap-1.5 rounded-[0.6rem] bg-linear-270 from-[#2567EC] to-[#37B6F7] px-4 py-1 shadow-[0_1px_3px_0px_rgba(0,0,0,0.65)]">
				<HugeiconsIcon icon={TransitionTopIcon} className="z-50 size-3.5" />
				<span className="z-50 text-[0.875rem]">Export</span>
				<div className="absolute top-0 left-0 z-10 flex size-full items-center justify-center rounded-[0.6rem] bg-linear-to-t from-white/0 to-white/50">
					<div className="absolute top-[0.08rem] z-50 h-[calc(100%-2px)] w-[calc(100%-2px)] rounded-[0.6rem] bg-linear-270 from-[#2567EC] to-[#37B6F7]" />
				</div>
			</div>
		</button>
	);
}
