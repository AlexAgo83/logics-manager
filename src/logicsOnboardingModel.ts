/**
 * Three-step onboarding model for Logics.
 *
 * Visible surface: Need → Framing → Execution
 * Internal mapping: request → backlog → task
 *
 * This module owns the naming, copy, and highlighted actions for the one-shot
 * onboarding screen. It does NOT own lifecycle or rendering — those live in
 * logicsOnboardingHtml.ts and logicsViewProvider.ts respectively.
 */

export type OnboardingStage = {
  id: "need" | "framing" | "execution";
  label: string;
  tagline: string;
  description: string;
  primaryActions: OnboardingAction[];
  workflowMapping: string;
};

export type OnboardingAction = {
  label: string;
  toolAction: string;
  description: string;
};

export const ONBOARDING_STAGES: OnboardingStage[] = [
  {
    id: "need",
    label: "Need",
    tagline: "Capture what matters",
    description:
      "Start by writing down what you need — a goal, a problem, or an idea. " +
      "You don't need to know the full solution yet. " +
      "Logics keeps this as a request so you can refine it and track where it goes.",
    primaryActions: [
      {
        label: "New Request",
        toolAction: "new-request",
        description: "Create a new request document and capture the need directly in the workflow."
      }
    ],
    workflowMapping: "Maps to a Logics request document in logics/request/."
  },
  {
    id: "framing",
    label: "Framing",
    tagline: "Understand before you act",
    description:
      "Once a need is clear, shape it into something actionable. " +
      "Add context, scope, and acceptance criteria so that anyone — including an AI assistant — " +
      "can pick it up without re-explaining the whole problem.",
    primaryActions: [
      {
        label: "Promote to Backlog",
        toolAction: "promote",
        description: "Turn a request into a scoped backlog item with context and criteria."
      },
      {
        label: "Triage Item",
        toolAction: "assist-triage",
        description: "Classify and prioritize a backlog item through the shared runtime."
      }
    ],
    workflowMapping: "Maps to a Logics backlog document in logics/backlog/."
  },
  {
    id: "execution",
    label: "Execution",
    tagline: "Deliver with context",
    description:
      "When a backlog item is ready, break it into an executable task. " +
      "The task carries the full history of decisions so delivery stays grounded — " +
      "whether you're working alone, with a team, or with an AI assistant.",
    primaryActions: [
      {
        label: "Suggest Next Step",
        toolAction: "assist-next-step",
        description: "Get a bounded next-action suggestion from the shared runtime."
      },
      {
        label: "Commit All Changes",
        toolAction: "assist-commit-all",
        description: "Generate and optionally execute a commit plan for current changes."
      }
    ],
    workflowMapping: "Maps to a Logics task document in logics/tasks/."
  }
];

export const ONBOARDING_HEADLINE = "Logics in three steps";

export const ONBOARDING_INTRO =
  "Logics is a lightweight delivery workflow that keeps your project context in plain Markdown — " +
  "readable by humans, diffable in git, and usable by AI assistants without re-explaining history every time.";

export const ONBOARDING_FOOTER =
  "This screen appears once at first use and after significant updates. " +
  "You can reopen it from the Tools menu at any time.";
