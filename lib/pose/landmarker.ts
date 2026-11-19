import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const create = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_full.task", delegate },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  try {
    return await create("GPU");
  } catch {
    // No WebGL (blocked GPU, some VMs and older laptops): the CPU is slower but works.
    return create("CPU");
  }
}
