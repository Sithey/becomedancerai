import { PASS_SCORE } from "./pose/config";

export type ResultSummary = { title: string; detail: string };

export function resultSummary(parts: (number | null)[]): ResultSummary {
  const scored = parts.filter((score): score is number => score !== null);
  if (scored.length === 0) {
    return {
      title: "No score this time.",
      detail: "We couldn't see you during the run. Check your framing and try again.",
    };
  }
  const weak = scored.filter((score) => score < PASS_SCORE).length;
  // An unscored part (learner out of frame) is not a pass either.
  if (weak === 0 && scored.length === parts.length) {
    return { title: "You've got this trend.", detail: "Every part passed. Time to film your version." };
  }
  if (weak === 0) {
    return { title: "Almost there.", detail: "Some parts couldn't be scored. Stay in frame and try again." };
  }
  return {
    title: "Almost there.",
    detail: `${weak} ${weak === 1 ? "part is" : "parts are"} still shaky. Practice ${weak === 1 ? "it" : "them"}, then try again.`,
  };
}
