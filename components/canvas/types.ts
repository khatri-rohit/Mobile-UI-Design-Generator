import { CanvasFrameSnapshot, FrameState } from "@/lib/canvas-state";
import { GenerationPlatform } from "@/lib/types";

export type FramePlatform = GenerationPlatform;
export type { FrameState };

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CanvasFrameData = CanvasFrameSnapshot;
