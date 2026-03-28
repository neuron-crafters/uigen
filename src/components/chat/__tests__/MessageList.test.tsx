import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageList } from "../MessageList";
import type { UIMessage } from "ai";

// Mock the MarkdownRenderer component
vi.mock("../MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

afterEach(() => {
  cleanup();
});

// Helper to create a UIMessage with text parts
function textMsg(id: string, role: "user" | "assistant", text: string): UIMessage {
  return { id, role, parts: [{ type: "text", text }] } as UIMessage;
}

test("MessageList shows empty state when no messages", () => {
  render(<MessageList messages={[]} />);

  expect(
    screen.getByText("Start a conversation to generate React components")
  ).toBeDefined();
  expect(
    screen.getByText("I can help you create buttons, forms, cards, and more")
  ).toBeDefined();
});

test("MessageList renders user messages", () => {
  const messages: UIMessage[] = [textMsg("1", "user", "Create a button component")];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Create a button component")).toBeDefined();
});

test("MessageList renders assistant messages", () => {
  const messages: UIMessage[] = [textMsg("1", "assistant", "I'll help you create a button component.")];

  render(<MessageList messages={messages} />);

  expect(
    screen.getByText("I'll help you create a button component.")
  ).toBeDefined();
});

test("MessageList renders messages with parts", () => {
  const messages: UIMessage[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Creating your component..." },
        {
          type: "dynamic-tool",
          toolName: "str_replace_editor",
          toolCallId: "asdf",
          state: "output-available",
          input: {},
          output: "Success",
        },
      ],
    } as UIMessage,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Creating your component...")).toBeDefined();
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("MessageList shows content for assistant message with content", () => {
  const messages: UIMessage[] = [
    textMsg("1", "assistant", "Generating your component..."),
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  // The component shows the content but not a loading indicator when content is present
  expect(screen.getByText("Generating your component...")).toBeDefined();
  expect(screen.queryByText("Generating...")).toBeNull();
});

test("MessageList shows loading state for last assistant message without content", () => {
  const messages: UIMessage[] = [
    { id: "1", role: "assistant", parts: [] } as UIMessage,
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  expect(screen.getByText("Generating...")).toBeDefined();
});

test("MessageList doesn't show loading state for non-last messages", () => {
  const messages: UIMessage[] = [
    textMsg("1", "assistant", "First response"),
    textMsg("2", "user", "Another request"),
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  // Loading state should not appear because the last message is from user, not assistant
  expect(screen.queryByText("Generating...")).toBeNull();
});

test("MessageList renders reasoning parts", () => {
  const messages: UIMessage[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Let me analyze this." },
        {
          type: "reasoning",
          text: "The user wants a button component with specific styling.",
        },
      ],
    } as UIMessage,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Reasoning")).toBeDefined();
  expect(
    screen.getByText("The user wants a button component with specific styling.")
  ).toBeDefined();
});

test("MessageList renders multiple messages in correct order", () => {
  const messages: UIMessage[] = [
    textMsg("1", "user", "First user message"),
    textMsg("2", "assistant", "First assistant response"),
    textMsg("3", "user", "Second user message"),
    textMsg("4", "assistant", "Second assistant response"),
  ];

  const { container } = render(<MessageList messages={messages} />);

  // Get all message containers in order
  const messageContainers = container.querySelectorAll(".rounded-xl");

  // Verify we have 4 messages
  expect(messageContainers).toHaveLength(4);

  // Check the content of each message in order
  expect(messageContainers[0].textContent).toContain("First user message");
  expect(messageContainers[1].textContent).toContain(
    "First assistant response"
  );
  expect(messageContainers[2].textContent).toContain("Second user message");
  expect(messageContainers[3].textContent).toContain(
    "Second assistant response"
  );
});

test("MessageList handles step-start parts", () => {
  const messages: UIMessage[] = [
    {
      id: "1",
      role: "assistant",
      parts: [
        { type: "text", text: "Step 1 content" },
        { type: "step-start" },
        { type: "text", text: "Step 2 content" },
      ],
    } as UIMessage,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Step 1 content")).toBeDefined();
  expect(screen.getByText("Step 2 content")).toBeDefined();
  // Check that a separator exists (hr element)
  const container = screen.getByText("Step 1 content").closest(".rounded-xl");
  expect(container?.querySelector("hr")).toBeDefined();
});

test("MessageList applies correct styling for user vs assistant messages", () => {
  const messages: UIMessage[] = [
    textMsg("1", "user", "User message"),
    textMsg("2", "assistant", "Assistant message"),
  ];

  render(<MessageList messages={messages} />);

  const userMessage = screen.getByText("User message").closest(".rounded-xl");
  const assistantMessage = screen
    .getByText("Assistant message")
    .closest(".rounded-xl");

  // User messages should have blue background
  expect(userMessage?.className).toContain("bg-blue-600");
  expect(userMessage?.className).toContain("text-white");

  // Assistant messages should have white background
  expect(assistantMessage?.className).toContain("bg-white");
  expect(assistantMessage?.className).toContain("text-neutral-900");
});

test("MessageList handles empty content with parts", () => {
  const messages: UIMessage[] = [
    {
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "This is from parts" }],
    } as UIMessage,
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("This is from parts")).toBeDefined();
});

test("MessageList shows loading for assistant message with empty parts", () => {
  const messages: UIMessage[] = [
    { id: "1", role: "assistant", parts: [] } as UIMessage,
  ];

  const { container } = render(
    <MessageList messages={messages} isLoading={true} />
  );

  // Check that exactly one "Generating..." text appears
  const loadingText = container.querySelectorAll(".text-neutral-500");
  const generatingElements = Array.from(loadingText).filter(
    (el) => el.textContent === "Generating..."
  );
  expect(generatingElements).toHaveLength(1);
});
