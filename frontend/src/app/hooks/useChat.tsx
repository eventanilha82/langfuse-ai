"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cleanAssistantText, parseAssistantContent } from "../utils/messageUtils";

const STORAGE_KEY = "langfuse_ai_reference_port_conversations";
const SESSION_KEY = "langfuse_ai_reference_port_session";
const MAX_RECENT = 20;
const STORAGE_TEXT_LIMIT = 4000;

function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId() {
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = createId("session");
  window.localStorage.setItem(SESSION_KEY, next);
  return next;
}

function readConversations() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeConversations(conversations) {
  const ordered = conversations
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_RECENT);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ordered));
  } catch (error) {
    console.warn("Não foi possível salvar todo o histórico local:", error);
    const compact = ordered.slice(0, 5).map((conversation) => ({
      ...conversation,
      chatHistory: (conversation.chatHistory || []).slice(-4),
    }));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Storage cheio ou indisponível não deve bloquear o envio da mensagem.
    }
  }
}

function getTitle(userMessage) {
  const text = String(userMessage || "Nova conversa").replace(/\s+/g, " ").trim();
  return text.length > 42 ? `${text.slice(0, 39)}...` : text || "Nova conversa";
}

function getRawAssistantText(exchange) {
  return (exchange.responses || [])
    .filter((response) => response.type === "text")
    .map((response) => response.content || "")
    .join("\n")
    .trim();
}

function truncateForStorage(value) {
  if (typeof value !== "string") return value;
  if (value.length <= STORAGE_TEXT_LIMIT) return value;
  return `${value.slice(0, STORAGE_TEXT_LIMIT)}\n\n[conteúdo truncado no histórico local]`;
}

function serializeTextAttachment(item) {
  return {
    ...item,
    content: truncateForStorage(item.content || ""),
    preview: truncateForStorage(item.preview || item.content || ""),
  };
}

function buildUserContent(text, attachedImages, attachedTexts) {
  const pieces = [];
  if (text) pieces.push(text);
  if (attachedImages?.length) {
    pieces.push(`[${attachedImages.length} image${attachedImages.length === 1 ? "" : "s"}]`);
  }
  attachedTexts?.forEach((item, index) => {
    const name = item.name ? ` name="${String(item.name).replace(/"/g, "'")}"` : "";
    pieces.push(`<pasted_content index="${index + 1}"${name}>\n${item.content || ""}\n</pasted_content>`);
  });
  return pieces.join("\n\n").trim() || "Anexo enviado para análise";
}

function toBackendAttachment(item, kind) {
  if (kind === "image") {
    return {
      id: item.id,
      kind: "image",
      name: item.name || "image",
      dataUrl: item.base64,
      mediaType: item.type || "image/png",
      size: item.size || null,
    };
  }

  return {
    id: item.id,
    kind: "text",
    name: item.name || "pasted-content.txt",
    ext: item.ext || null,
    content: item.content || "",
    mediaType: "text/plain",
    size: item.size || null,
  };
}

function toBackendMessages(chatHistory) {
  return chatHistory.flatMap((exchange) => {
    const messages = [{ role: "user", content: exchange.fullUserContent || exchange.userMessage || "" }];
    const assistantText = getRawAssistantText(exchange);
    if (assistantText) messages.push({ role: "assistant", content: assistantText });
    return messages;
  });
}

function serializeExchange(exchange) {
  const imageCount = exchange.attachedImages?.length || exchange.imageCount || 0;
  return {
    ...exchange,
    fullUserContent: truncateForStorage(exchange.fullUserContent || ""),
    attachedImages: undefined,
    hasImageAttachment: imageCount > 0,
    imageCount,
    attachedTexts: (exchange.attachedTexts || []).map(serializeTextAttachment),
    rawAssistantText: getRawAssistantText(exchange)
  };
}

export default function useChat({ initialConversationId = null, onError }: any = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [recentConversations, setRecentConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [sessionId, setSessionId] = useState("");

  const latestMessageRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const refreshRecentConversations = useCallback(async () => {
    setRecentConversations(readConversations());
    setLoadingConversations(false);
  }, []);

  useEffect(() => {
    const id = initialConversationId || getSessionId();
    setSessionId(id);
    setRecentConversations(readConversations());
    setLoadingConversations(false);
  }, [initialConversationId]);

  const saveConversation = useCallback((id, history) => {
    if (!id || !history.length) return;
    const now = new Date().toISOString();
    const conversations = readConversations();
    const existing = conversations.find((conversation) => conversation.id === id);
    const firstUser = history.find((exchange) => exchange.userMessage)?.userMessage;
    const next = {
      id,
      urlId: id,
      title: existing?.title || getTitle(firstUser),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastMessage: firstUser || "",
      messageCount: history.length,
      chatHistory: history.map(serializeExchange)
    };
    writeConversations([next, ...conversations.filter((conversation) => conversation.id !== id)]);
    setRecentConversations(readConversations());
  }, []);

  const scrollToLatestMessage = useCallback(() => {
    setTimeout(() => {
      if (!latestMessageRef.current || !chatContainerRef.current) return;
      const container = chatContainerRef.current;
      const message = latestMessageRef.current;
      const containerRect = container.getBoundingClientRect();
      const messageRect = message.getBoundingClientRect();
      const scrollOffset = messageRect.top - containerRect.top + container.scrollTop - 60;
      container.scrollTo({ top: scrollOffset, behavior: "smooth" });
    }, 150);
  }, []);

  useEffect(() => {
    const updateSpacer = () => {
      if (!latestMessageRef.current || !chatContainerRef.current || chatHistory.length === 0) {
        setSpacerHeight(0);
        return;
      }
      const containerHeight = chatContainerRef.current.clientHeight;
      const messageHeight = latestMessageRef.current.offsetHeight;
      setSpacerHeight(Math.max(0, containerHeight - 80 - messageHeight));
    };

    updateSpacer();
    const observer = new ResizeObserver(updateSpacer);
    if (chatContainerRef.current) observer.observe(chatContainerRef.current);
    if (latestMessageRef.current) observer.observe(latestMessageRef.current);
    return () => observer.disconnect();
  }, [chatHistory]);

  useEffect(() => {
    if (chatHistory.length > 0) scrollToLatestMessage();
  }, [chatHistory.length, scrollToLatestMessage]);

  const setLatestExchange = useCallback((updater) => {
    setChatHistory((current) => {
      const next = current.map((exchange, index) =>
        index === current.length - 1 ? updater(exchange) : exchange
      );
      saveConversation(sessionId, next);
      return next;
    });
  }, [saveConversation, sessionId]);

  const submitToBackend = useCallback(async (text, attachedImages = [], attachedTexts = [], retryHistory = null) => {
    if (isLoading || !sessionId) return;

    const previousHistory = retryHistory || chatHistory;
    const fullUserContent = buildUserContent(text, attachedImages, attachedTexts);
    const exchange = {
      id: createId("exchange"),
      userMessage: text || (attachedTexts.length ? "[Conteúdo colado]" : fullUserContent),
      fullUserContent,
      attachedImages,
      attachedTexts,
      responses: [],
      isLatest: true,
      rawAssistantText: ""
    };
    const nextHistory = [
      ...previousHistory.map((item) => ({ ...item, isLatest: false })),
      exchange
    ];
    const requestAttachments = [
      ...attachedImages.map((item) => toBackendAttachment(item, "image")),
      ...attachedTexts.map((item) => toBackendAttachment(item, "text"))
    ];
    const controller = new AbortController();

    setChatHistory(nextHistory);
    saveConversation(sessionId, nextHistory);
    setIsLoading(true);
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [...toBackendMessages(previousHistory), { role: "user", content: fullUserContent }],
          attachments: requestAttachments
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "A chamada do chat falhou.");
      }
      if (!response.body) throw new Error("A resposta de streaming veio sem corpo.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      const applyText = (answer) => {
        const cleanAnswer = cleanAssistantText(answer);
        const parsed = parseAssistantContent(cleanAnswer);
        setLatestExchange((current) => ({
          ...current,
          responses: [
            ...current.responses.filter((item) => item.type !== "text"),
            ...parsed
          ],
          rawAssistantText: cleanAnswer
        }));
      };

      const applyTool = (event) => {
        setLatestExchange((current) => {
          const toolName = event.name || "DeepWiki MCP";
          const existingIndex = current.responses.findIndex(
            (item) => item.type === "mcp_chip" && item.tool === event.name
          );
          const chip = {
            type: "mcp_chip",
            server: toolName,
            tool: event.name,
            label: toolName,
            displayName: toolName,
            status: event.status === "calling" ? "calling" : "completed",
            arguments: event.arguments || null,
            output: event.output || null
          };
          const responses = [...current.responses];
          if (existingIndex >= 0) responses[existingIndex] = { ...responses[existingIndex], ...chip };
          else responses.push(chip);
          return { ...current, responses };
        });
      };

      const handlePayload = (raw) => {
        const dataLine = raw.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) return;
        const event = JSON.parse(dataLine.slice(5).trim());
        if (event.type === "delta") {
          accumulated += event.text || "";
          applyText(accumulated);
        } else if (event.type === "tool") {
          applyTool(event);
        } else if (event.type === "done") {
          accumulated = event.response?.answer || accumulated;
          applyText(accumulated);
        } else if (event.type === "error") {
          throw new Error(event.message || "Erro no streaming.");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        chunks.forEach(handlePayload);
      }
      if (buffer.trim()) handlePayload(buffer);
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      const message = aborted
        ? "Geração interrompida pelo participante."
        : `Tive um problema ao responder essa pergunta.\n\n${error instanceof Error ? error.message : "Erro desconhecido."}`;
      setLatestExchange((current) => ({
        ...current,
        responses: [{ type: "text", content: message, isStreaming: false }],
        rawAssistantText: message
      }));
      if (!aborted) onError?.(message);
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  }, [chatHistory, isLoading, onError, saveConversation, sessionId, setLatestExchange]);

  const handleSubmit = useCallback((text, attachedImages = [], attachedTexts = []) => {
    void submitToBackend(text, attachedImages, attachedTexts);
  }, [submitToBackend]);

  const handleRetry = useCallback(() => {
    const latest = chatHistory[chatHistory.length - 1];
    if (!latest || isLoading) return;
    const previous = chatHistory.slice(0, -1).map((item, index, array) => ({
      ...item,
      isLatest: index === array.length - 1
    }));
    setChatHistory(previous);
    void submitToBackend(latest.userMessage, latest.attachedImages || [], latest.attachedTexts || [], previous);
  }, [chatHistory, isLoading, submitToBackend]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleNewConversation = useCallback(() => {
    abortRef.current?.abort();
    const id = createId("session");
    window.localStorage.setItem(SESSION_KEY, id);
    setSessionId(id);
    setChatHistory([]);
    inputRef.current?.clear?.();
  }, []);

  const handleConversationClick = useCallback((item) => {
    if (!item?.id) return;
    setIsLoadingConversation(true);
    const stored = readConversations().find((conversation) => conversation.id === item.id);
    setSessionId(item.id);
    window.localStorage.setItem(SESSION_KEY, item.id);
    setChatHistory((stored?.chatHistory || []).map((exchange, index, array) => ({
      ...exchange,
      isLatest: index === array.length - 1
    })));
    setIsLoadingConversation(false);
  }, []);

  const handleConversationDelete = useCallback((item) => {
    if (!item?.id) return;
    const next = readConversations().filter((conversation) => conversation.id !== item.id);
    writeConversations(next);
    setRecentConversations(next);
    if (item.id === sessionId) handleNewConversation();
  }, [handleNewConversation, sessionId]);

  const handleCopy = useCallback((content, id = "copy") => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const getExchangeCopyContent = useCallback((exchange) => {
    return [exchange.userMessage, getRawAssistantText(exchange)].filter(Boolean).join("\n\n");
  }, []);

  const genaiService = useMemo(() => ({
    getConversationId: () => sessionId
  }), [sessionId]);

  return {
    isLoading,
    isLoadingConversation,
    chatHistory,
    copiedId,
    spacerHeight,
    recentConversations,
    loadingConversations,
    hasMoreConversations: false,
    isLoadingMoreConversations: false,
    loadMoreConversations: async () => {},
    genaiService,
    latestMessageRef,
    chatContainerRef,
    inputRef,
    handleSubmit,
    handleRetry,
    stopGeneration,
    handleCopy,
    handleNewConversation,
    handleConversationClick,
    handleConversationDelete,
    getExchangeCopyContent,
    refreshRecentConversations
  };
}
