export const choices = ["A", "B", "C"] as const;
export type Choice = typeof choices[number];

export const questions = [
  {
    prompt: "Which sounds like you when the music starts?",
    options: [
      "I’ve paid for dance lessons or an online program, and I still sit out because I don’t know how to start.",
      "I’ve paid for dance lessons or an online program, and I can start, but I lose the beat or run out of moves.",
      "Neither describes me.",
    ],
    exit: "This pilot is for adults who’ve already paid for dance instruction and still get stuck dancing socially.",
  },
  {
    prompt: "Could you fit a few two-minute practice drills into your day?",
    options: [
      "Yes. I can already think of times that would work.",
      "I’m willing to try, and I’d like help finding those moments.",
      "I can’t commit to that right now.",
    ],
    exit: "Short, regular practice is part of this pilot. You’re welcome to apply when those practice breaks fit your day.",
  },
  {
    prompt: "Can you set aside about five minutes each week to film a short clip and send it privately to Ceech?",
    options: [
      "Yes. I can do that each week.",
      "I’m nervous about filming, and I’m willing to send a clip each week with guidance.",
      "I can’t send a weekly clip right now.",
    ],
    exit: "Weekly clips are how I give you personal feedback. You’re welcome to apply when filming fits your schedule.",
  },
  {
    prompt: "Are you willing to watch your own clip, use Ceech’s feedback, and try the move again?",
    options: [
      "Yes. I’m ready to do that.",
      "Watching myself feels awkward, and I’m willing to try with guidance.",
      "I’m unwilling to watch my own clips right now.",
    ],
    exit: "Watching your clip with guidance is how you’ll see and apply the correction. You’re welcome to apply when you’re ready to try it.",
  },
] as const;

export function firstIneligibleAnswer(answers: readonly (Choice | undefined)[]) {
  return answers.indexOf("C");
}

export function validateSampleApplication(input: unknown): boolean {
  if (typeof input !== "object" || input === null) return false;

  const { answers, firstName, email } = input as Record<string, unknown>;
  return Array.isArray(answers)
    && answers.length === questions.length
    && answers.every(answer => answer === "A" || answer === "B")
    && typeof firstName === "string"
    && firstName.trim().length > 0
    && firstName.length <= 80
    && typeof email === "string"
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
