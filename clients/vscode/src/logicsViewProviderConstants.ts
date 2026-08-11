export const ROOT_OVERRIDE_STATE_KEY = "logics.projectRootOverride";
export const ACTIVE_AGENT_STATE_KEY = "logics.activeAgentId";
export const ONBOARDING_LAST_VERSION_KEY = "logics.onboardingLastVersion";
// Keyed on what the page says, not on the release that shipped it: the version key
// reopened an identical page on every release, and this extension ships often.
// A new key, because the stored value is a version string and there is no way to
// know retroactively whether a user has seen the current content -- so everyone
// sees the page one last time, then never again until it changes.
export const ONBOARDING_LAST_CONTENT_KEY = "logics.onboardingLastContent";
export const MIN_LOGICS_KIT_MAJOR = 1;
export const MIN_LOGICS_KIT_MINOR = 7;
