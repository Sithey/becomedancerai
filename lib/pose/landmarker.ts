import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_full.task", delegate: "GPU" },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}
