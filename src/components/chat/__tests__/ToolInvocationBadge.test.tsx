import { test, expect, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getToolLabel } from "../ToolInvocationBadge";

afterEach(() => cleanup());

describe("getToolLabel", () => {
  test("str_replace_editor create", () => {
    expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating /App.jsx");
  });

  test("str_replace_editor str_replace", () => {
    expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing /App.jsx");
  });

  test("str_replace_editor insert", () => {
    expect(getToolLabel("str_replace_editor", { command: "insert", path: "/components/Button.jsx" })).toBe("Editing /components/Button.jsx");
  });

  test("str_replace_editor view", () => {
    expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing /App.jsx");
  });

  test("file_manager rename", () => {
    expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx" })).toBe("Renaming /old.jsx");
  });

  test("file_manager delete", () => {
    expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting /App.jsx");
  });

  test("unknown tool falls back to toolName", () => {
    expect(getToolLabel("some_other_tool", { command: "run" })).toBe("some_other_tool");
  });

  test("missing path shows empty string in label", () => {
    expect(getToolLabel("str_replace_editor", { command: "create" })).toBe("Creating ");
  });
});

describe("ToolInvocationBadge", () => {
  test("shows friendly label for create command", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" }, state: "result", result: "ok" }}
      />
    );
    expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  });

  test("shows friendly label for str_replace command", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolName: "str_replace_editor", args: { command: "str_replace", path: "/components/Card.jsx" }, state: "result", result: "ok" }}
      />
    );
    expect(screen.getByText("Editing /components/Card.jsx")).toBeDefined();
  });

  test("shows friendly label for file_manager delete", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={{ toolName: "file_manager", args: { command: "delete", path: "/old.jsx" }, state: "result", result: "ok" }}
      />
    );
    expect(screen.getByText("Deleting /old.jsx")).toBeDefined();
  });

  test("shows green dot when done", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={{ toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" }, state: "result", result: "ok" }}
      />
    );
    expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
  });

  test("shows spinner when in progress", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={{ toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" }, state: "call" }}
      />
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  test("shows spinner when result is absent", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={{ toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" }, state: "result" }}
      />
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });
});
