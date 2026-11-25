import { questions } from "./application";

export const readinessQuestions = [
  questions[1],
  questions[2],
  {
    ...questions[3],
    prompt: "Are you willing to watch your own clip, try the correction, and show what changed in your next clip?",
  },
] as const;

export type FunnelState =
  | { stage: "story" | "fit" | "coaching" | "booking" }
  | { stage: "questions" | "exit"; question: number }
  | { stage: "drill"; from?: number };

export type FunnelAction = "continue" | "yes" | "no" | "ready" | "nervous" | "not-now" | "drill" | "back" | "restart";

export const initialFunnel: FunnelState = { stage: "story" };

export function advanceFunnel(state: FunnelState, action: FunnelAction): FunnelState {
  if (action === "restart") return initialFunnel;
  switch (state.stage) {
    case "story":
      return action === "continue" ? { stage: "fit" } : state;
    case "fit":
      if (action === "yes") return { stage: "coaching" };
      if (action === "no") return { stage: "drill" };
      return action === "back" ? initialFunnel : state;
    case "coaching":
      if (action === "continue") return { stage: "questions", question: 0 };
      return action === "back" ? { stage: "fit" } : state;
    case "questions":
      if (action === "not-now") return { stage: "exit", question: state.question };
      if (action === "back") return state.question > 0
        ? { stage: "questions", question: state.question - 1 }
        : { stage: "coaching" };
      if (action === "ready" || action === "nervous") return state.question + 1 === readinessQuestions.length
        ? { stage: "booking" }
        : { stage: "questions", question: state.question + 1 };
      return state;
    case "exit":
      if (action === "back") return { stage: "questions", question: state.question };
      return action === "drill" ? { stage: "drill", from: state.question } : state;
    case "drill":
      if (action !== "back") return state;
      return state.from === undefined ? { stage: "fit" } : { stage: "exit", question: state.from };
    case "booking":
      return action === "back" ? { stage: "questions", question: readinessQuestions.length - 1 } : state;
  }
}
