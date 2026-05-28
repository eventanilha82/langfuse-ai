const NON_FATAL_TOOL_ERROR_TEXT = "A consulta ao DeepWiki MCP excedeu o tempo limite; continuei com o que estava disponível.";
const NON_FATAL_TOOL_ERROR_PATTERN = /Error running tool \(non-fatal\):\s*\{[\s\S]*?\}/g;
const PARTIAL_NON_FATAL_TOOL_ERROR_PATTERN = /Error running tool \(non-fatal\):[\s\S]*$/;

export const cleanAssistantText = (content) => {
  if (typeof content !== "string") return content;

  return content
    .replace(NON_FATAL_TOOL_ERROR_PATTERN, NON_FATAL_TOOL_ERROR_TEXT)
    .replace(PARTIAL_NON_FATAL_TOOL_ERROR_PATTERN, "")
    .trim();
};

export const parseAssistantContent = (content) => {
  if (!content) return [];

  if (typeof content !== "string") {
    if (Array.isArray(content)) {
      const textPart = content.find((item) =>
        item.type === "input_text" || item.type === "output_text" || item.type === "text"
      );
      if (textPart?.text) return parseAssistantContent(textPart.text);
      return [{ type: "text", content: "[Conteúdo não textual]", isStreaming: false }];
    }
    return [{ type: "text", content: String(content), isStreaming: false }];
  }

  const text = cleanAssistantText(content);
  return text ? [{ type: "text", content: text, isStreaming: false }] : [];
};

export const groupMessages = (messages) => {
  const groups = [];
  let currentMcpChipGroup = [];

  const flushMcpChips = () => {
    if (currentMcpChipGroup.length > 0) {
      groups.push({ type: "mcp_chip_row", chips: currentMcpChipGroup });
      currentMcpChipGroup = [];
    }
  };

  messages.forEach((message, index) => {
    if (message.type === "mcp_chip") {
      currentMcpChipGroup.push({
        server: message.server,
        tool: message.tool,
        arguments: message.arguments,
        status: message.status,
        label: message.label,
        displayName: message.displayName,
        output: message.output,
        error: message.error,
        messageIndex: index,
      });
      return;
    }

    flushMcpChips();

    if (message.type === "text") {
      groups.push({
        type: "text",
        content: message.content,
        messageIndex: index,
      });
    }
  });

  flushMcpChips();
  return groups;
};
