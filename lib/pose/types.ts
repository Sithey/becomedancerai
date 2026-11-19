export type Landmark = { x: number; y: number; v: number }; // normalized x,y; v = visibility
export type Pose = Landmark[]; // 33 entries, MediaPipe order
export type PoseFrame = { t: number; pose: Pose | null }; // t = ms from video start
export type Move = { startMs: number; endMs: number };
export type FrameSize = { width: number; height: number };
export type LimbName =
  | "leftUpperArm"
  | "leftForearm"
  | "rightUpperArm"
  | "rightForearm"
  | "leftThigh"
  | "leftShin"
  | "rightThigh"
  | "rightShin";
export type LimbScores = Partial<Record<LimbName, number>>; // only limbs that were scored
export type Vec = { x: number; y: number };

export type TrendData = {
  id: string;
  title: string;
  videoUrl: string;
  width: number;
  height: number;
  durationMs: number;
  sampleMs: number;
  poses: PoseFrame[];
  moves: Move[];
};

export type TrendSummary = {
  id: string;
  title: string;
  videoUrl: string;
  durationMs: number;
  moveCount: number;
};

export type NewTrend = {
  title: string;
  width: number;
  height: number;
  durationMs: number;
  sampleMs: number;
  poses: PoseFrame[];
  moves: Move[];
};
