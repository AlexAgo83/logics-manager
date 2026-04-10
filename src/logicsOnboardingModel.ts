/**
 * Four-step onboarding model for Logics.
 *
 * Visible surface: Need → Framing → Orchestration Tasks → Execution
 * Internal mapping: request → backlog → task planning → task
 *
 * This module owns the naming, copy, and highlighted actions for the one-shot
 * onboarding screen. It does NOT own lifecycle or rendering — those live in
 * logicsOnboardingHtml.ts and logicsViewProvider.ts respectively.
 */

export type OnboardingStage = {
  id: "need" | "framing" | "orchestration" | "execution";
  label: string;
  tagline: string;
  description: string;
  promptExamples: string[];
  primaryActions: OnboardingAction[];
  workflowMapping: string;
};

export type OnboardingAction = {
  label: string;
  toolAction: string;
  description: string;
};

export type OnboardingFooterAction = {
  label: string;
  toolAction: string;
  description: string;
};

export type OnboardingDocGuide = {
  label: string;
  cue: string;
  destination: string;
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
    promptExamples: [
      "Draft a new request for this problem: <describe the need or pain point>.",
      "Ask me any clarifying questions and suggest options that would make the request stronger."
    ],
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
    promptExamples: [
      "Split the new request into backlog items and separate delivery slices.",
      "Ask me any questions that would improve your confidence or understanding before you finalize the backlog."
    ],
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
    id: "orchestration",
    label: "Orchestration Tasks",
    tagline: "Create the task plan before execution",
    description:
      "Before a task is executed, turn the backlog item into orchestration tasks. " +
      "Break the work into clear tasks, preserve dependencies, and keep the delivery sequence explicit so execution stays focused.",
    promptExamples: [
      "Create orchestration tasks from this backlog item and split the work into the smallest useful delivery slices.",
      "List the tasks needed to execute this backlog item in order, with brief context for each one."
    ],
    primaryActions: [],
    workflowMapping: "Maps to orchestration task planning in logics/tasks/."
  },
  {
    id: "execution",
    label: "Execution",
    tagline: "Deliver with context",
    description:
      "When a backlog item is ready, break it into an executable task. " +
      "The task carries the full history of decisions so delivery stays grounded — " +
      "whether you're working alone, with a team, or with an AI assistant.",
    promptExamples: [
      "Execute task <task id or title>. Commit after each wave and keep going until the work is done.",
      "If needed, make brief assumptions and keep moving."
    ],
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

export const ONBOARDING_DOC_GUIDE: OnboardingDocGuide[] = [
  {
    label: "Request",
    cue: "If you think \"here is the problem and context...\"",
    destination: "-> request"
  },
  {
    label: "Item",
    cue: "If you think \"this needs a scoped delivery slice...\"",
    destination: "-> item"
  },
  {
    label: "Product brief",
    cue: "If you think \"we want...\"",
    destination: "-> product brief"
  },
  {
    label: "ADR",
    cue: "If you think \"we decided...\"",
    destination: "-> ADR"
  },
  {
    label: "Spec",
    cue: "If you think \"the system should...\"",
    destination: "-> spec"
  },
  {
    label: "Task",
    cue: "If you think \"let's do...\"",
    destination: "-> task"
  }
];

export const ONBOARDING_HEADLINE = "Logics in four steps";

export const ONBOARDING_INTRO =
  "Logics is a lightweight delivery workflow that keeps your project context in plain Markdown — " +
  "readable by humans, diffable in git, and usable by AI assistants without re-explaining history every time. " +
  "The flow moves from need to framing, orchestration, and execution.";

export const ONBOARDING_DOC_GUIDE_TITLE = "What each document is for";
export const ONBOARDING_DOC_GUIDE_INTRO =
  "A quick rule of thumb for choosing the right artifact before you start writing.";

export const ONBOARDING_FOOTER =
  "This screen appears once at first use and after significant updates. " +
  "You can reopen it from the Tools menu at any time.";

export const ONBOARDING_FOOTER_ACTIONS: OnboardingFooterAction[] = [
  {
    label: "Open Logics Insights",
    toolAction: "open-logics-insights",
    description: "Open the repository-level corpus stats and recent activity panel."
  },
  {
    label: "About",
    toolAction: "about",
    description: "Open the project repository information."
  }
];
