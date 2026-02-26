import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, any>;
    state: string;
    result?: any;
  };
}

export function getToolLabel(toolName: string, args: Record<string, any>): string {
  const path = args?.path ?? "";

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":   return `Creating ${path}`;
      case "str_replace":
      case "insert":   return `Editing ${path}`;
      case "view":     return `Viewing ${path}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename": return `Renaming ${path}`;
      case "delete": return `Deleting ${path}`;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const { toolName, args, state, result } = toolInvocation;
  const label = getToolLabel(toolName, args);
  const isDone = state === "result" && result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
