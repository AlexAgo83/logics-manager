import { describe, expect, it } from "vitest";
import { buildMissingPythonMessage, getPythonCommandCandidates, isMissingPythonFailureDetail } from "../src/pythonRuntime";

describe("pythonRuntime", () => {
  it("includes Windows launcher fallbacks", () => {
    expect(getPythonCommandCandidates("win32")).toEqual([
      { command: "python3", argsPrefix: [], displayLabel: "python3" },
      { command: "python", argsPrefix: [], displayLabel: "python" },
      { command: "py", argsPrefix: ["-3"], displayLabel: "py -3" },
      { command: "py", argsPrefix: [], displayLabel: "py" }
    ]);
  });

  it("recognizes common missing-python launcher errors", () => {
    expect(
      isMissingPythonFailureDetail(
        "Python was not found; run without arguments to install from the Microsoft Store, or disable this shortcut."
      )
    ).toBe(true);
    expect(isMissingPythonFailureDetail("'python3' is not recognized as an internal or external command")).toBe(true);
  });

  it("builds a platform-specific guidance message", () => {
    expect(buildMissingPythonMessage("win32")).toContain("`py`");
    expect(buildMissingPythonMessage("linux")).toContain("`python3` or `python`");
  });
});
