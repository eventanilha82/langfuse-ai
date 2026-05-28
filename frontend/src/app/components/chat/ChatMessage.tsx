"use client";

import { memo, useMemo, useState, useEffect, useRef } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, ChevronDown, Copy, FileText, Mail, RotateCcw, X } from "lucide-react";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

import DotMatrixLoader from "../ui/DotMatrixLoader";
import DustReveal from "../ui/DustReveal";
import { groupMessages } from "../../utils/messageUtils";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("diff", diff);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("python", python);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);

const getChipLabel = (chip) => {
  return chip.server || chip.label || chip.tool || "DeepWiki MCP";
};

// Copy to clipboard button with check feedback
function CopyTextButton({ content }: any) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <IconButton size="small" onClick={handleCopy} title="Copiar para a área de transferência">
      {copied ? <Check size={16} style={{ color: "#10B981" }} /> : <Copy size={16} />}
    </IconButton>
  );
}

// Collapsible user message component
function CollapsibleUserMessage({ text, fontSize, isLatest }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const isLongMessage = text.length > 150;

  const textStyles = {
    color: "inherit",
    fontSize: fontSize,
    fontWeight: "100",
    lineHeight: isLatest ? 2 : 1.6,
  };

  // Mark animation as complete after initial render
  useEffect(() => {
    if (isLatest && !hasAnimated) {
      const timer = setTimeout(() => setHasAnimated(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLatest, hasAnimated]);

  if (!isLongMessage) {
    return isLatest ? (
      <DustReveal text={text} duration={8} delay={0} sx={textStyles} />
    ) : (
      <Typography sx={textStyles}>{text}</Typography>
    );
  }

  const clampStyles = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  return (
    <Box
      onClick={() => setIsExpanded(!isExpanded)}
      sx={{ cursor: "pointer" }}
    >
      {isLatest && !hasAnimated ? (
        <DustReveal
          text={text}
          duration={8}
          delay={0}
          sx={{ ...textStyles, ...(!isExpanded && clampStyles) }}
        />
      ) : (
        <Typography sx={{ ...textStyles, ...(!isExpanded && clampStyles) }}>
          {text}
        </Typography>
      )}
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ display: "inline-flex", alignItems: "center", marginTop: "4px" }}
      >
        <ChevronDown
          size={16}
          style={{ color: "rgba(0, 0, 0, 0.5)" }}
        />
      </motion.div>
    </Box>
  );
}

// Component to render mailto links as buttons
function MailtoButton({ href, children }: any) {
  const handleClick = () => {
    window.location.href = href;
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        backgroundColor: "#C74634",
        color: "white",
        border: "none",
        borderRadius: "6px",
        fontSize: "0.9rem",
        fontWeight: 500,
        cursor: "pointer",
        marginTop: "8px",
        marginBottom: "8px",
      }}
    >
      <Mail size={16} />
      {children || "Abrir email"}
    </button>
  );
}

const getPlainText = (children: any): string => {
  if (children == null) return "";
  if (Array.isArray(children)) return children.map(getPlainText).join("");
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (children?.props?.children) return getPlainText(children.props.children);
  return "";
};

const languageAliases = {
  bash: "bash",
  shell: "bash",
  sh: "bash",
  zsh: "bash",
  js: "javascript",
  jsx: "javascript",
  javascript: "javascript",
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  py: "python",
  python: "python",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  markdown: "markdown",
  html: "xml",
  xml: "xml",
  css: "css",
  sql: "sql",
  diff: "diff",
  dockerfile: "dockerfile",
};

const markdownRemarkPlugins = [remarkGfm, remarkMath];
const markdownRehypePlugins = [[rehypeKatex, { throwOnError: false, strict: false }]];
const MATH_LINE_MAX_LENGTH = 260;

function normalizeLanguage(language?: string) {
  if (!language) return "";
  const value = String(language).trim().toLowerCase();
  return languageAliases[value] || value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function looksLikeMathExpression(value: string) {
  const text = value.trim();
  if (!text || text.length > MATH_LINE_MAX_LENGTH) return false;
  if (/https?:\/\//i.test(text)) return false;

  const hasMathSignal = /\\[a-zA-Z]+|[=^_]|\\frac|\\times|\\approx|\\text|[+\-*/]/.test(text);
  const hasToken = /[A-Za-z0-9\\]/.test(text);
  return hasMathSignal && hasToken;
}

function standaloneBracketMath(line: string) {
  const match = line.match(/^\s*\[\s*(.+?)\s*\]\s*$/);
  if (!match || /\]\s*\(/.test(line)) return null;
  return looksLikeMathExpression(match[1]) ? match[1].trim() : null;
}

function canonicalMath(value: string) {
  return value.replace(/\s+/g, "");
}

function normalizeMathLine(line: string) {
  let normalized = line
    .replace(/\\\[(.+?)\\\]/g, (_match, inner) => `$$${String(inner).trim()}$$`)
    .replace(/\\\((.+?)\\\)/g, (_match, inner) => `$${String(inner).trim()}$`);

  const bracketMath = standaloneBracketMath(normalized);
  if (bracketMath) {
    normalized = `$$\n${bracketMath}\n$$`;
  }

  return normalized;
}

function normalizeMathMarkdown(content: string) {
  const lines = String(content || "").split(/\r?\n/);
  const output: string[] = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    const trimmedLine = line.trim();
    if (trimmedLine === "\\[" || trimmedLine === "\\]") {
      output.push("$$");
      continue;
    }

    if (/^\s*latex\s*$/i.test(line)) {
      const mathLines: string[] = [];
      let cursor = index + 1;

      while (cursor < lines.length) {
        const candidate = lines[cursor].trim();
        if (!candidate || /^\s*```/.test(lines[cursor])) break;
        if (standaloneBracketMath(candidate)) break;
        if (!looksLikeMathExpression(candidate)) break;
        mathLines.push(candidate);
        cursor += 1;
      }

      if (mathLines.length > 0) {
        const nextBracketMath = cursor < lines.length ? standaloneBracketMath(lines[cursor]) : null;
        if (
          nextBracketMath &&
          mathLines.length === 1 &&
          canonicalMath(nextBracketMath) === canonicalMath(mathLines[0])
        ) {
          cursor += 1;
        }

        output.push("$$");
        output.push(mathLines.join("\n"));
        output.push("$$");
        index = cursor - 1;
        continue;
      }

      if (cursor < lines.length && standaloneBracketMath(lines[cursor])) {
        continue;
      }
    }

    output.push(normalizeMathLine(line));
  }

  return output.join("\n");
}

// Custom link component that opens in new tab
const MarkdownLink = ({ href, children }: any) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="markdown-link">
    {children}
  </a>
);

function CodeBlockFrame({ code, language, children, title = "Copiar código" }: any) {
  const [copied, setCopied] = useState(false);
  const label = language || "texto";

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box
      className="markdown-code-block"
      sx={{
        my: 2,
        overflow: "hidden",
        borderRadius: 1,
        border: "1px solid var(--dm-border, rgba(0,0,0,0.10))",
        backgroundColor: "var(--dm-subtle, rgba(0,0,0,0.035))",
        "& .hljs-keyword, & .hljs-selector-tag, & .hljs-built_in, & .hljs-name": { color: "#7C3AED" },
        "& .hljs-string, & .hljs-title, & .hljs-section, & .hljs-attribute": { color: "#047857" },
        "& .hljs-number, & .hljs-literal, & .hljs-symbol, & .hljs-bullet": { color: "#C2410C" },
        "& .hljs-comment, & .hljs-quote": { color: "var(--dm-muted, rgba(0,0,0,0.48))", fontStyle: "italic" },
        "& .hljs-variable, & .hljs-template-variable, & .hljs-regexp": { color: "#B45309" },
        "& .hljs-type, & .hljs-class .hljs-title": { color: "#0369A1" },
        "& .hljs-meta, & .hljs-doctag": { color: "#7C2D12" },
        "& .hljs-deletion": { color: "#B91C1C", backgroundColor: "rgba(185,28,28,0.08)" },
        "& .hljs-addition": { color: "#047857", backgroundColor: "rgba(4,120,87,0.08)" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          minHeight: 34,
          px: 1.5,
          borderBottom: "1px solid var(--dm-border, rgba(0,0,0,0.08))",
          color: "var(--dm-muted, rgba(0,0,0,0.48))",
          fontSize: "0.72rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0,
        }}
      >
        <span>{label}</span>
        <Tooltip title={copied ? "Copiado" : title} placement="left">
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              width: 26,
              height: 26,
              color: "var(--dm-muted, rgba(0,0,0,0.42))",
              "&:hover": {
                color: "var(--dm-text, rgba(0,0,0,0.72))",
                backgroundColor: "var(--dm-subtle, rgba(0,0,0,0.05))",
              },
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </IconButton>
        </Tooltip>
      </Box>
      {children}
    </Box>
  );
}

function HighlightedCode({ code, language }: any) {
  const highlighted = useMemo(() => {
    try {
      const normalizedLanguage = normalizeLanguage(language);
      if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
        return hljs.highlight(code, { language: normalizedLanguage, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return escapeHtml(code);
    }
  }, [code, language]);

  return <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

function CodeContent({ code, language }: any) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        overflowX: "auto",
        color: "var(--dm-text, rgba(0,0,0,0.78))",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: { xs: "0.78rem", sm: "0.82rem" },
        lineHeight: 1.55,
        whiteSpace: "pre",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <HighlightedCode code={code} language={language} />
    </Box>
  );
}

function MermaidBlock({ code, isDarkBg = false }: any) {
  const containerRef = useRef(null);
  const renderIdRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);
  const [state, setState] = useState({ svg: "", error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const { default: mermaid } = await import("mermaid");

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: isDarkBg ? "dark" : "default",
          fontFamily: "Oracle Sans, sans-serif",
        });

        const { svg } = await mermaid.render(`${renderIdRef.current}-${Date.now()}`, code);
        if (!cancelled) setState({ svg, error: null, loading: false });
      } catch (error) {
        if (!cancelled) setState({ svg: "", error, loading: false });
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code, isDarkBg]);

  if (state.error) {
    return (
      <CodeBlockFrame code={code} language="mermaid" title="Copiar Mermaid">
        <CodeContent code={code} language="mermaid" />
      </CodeBlockFrame>
    );
  }

  return (
    <CodeBlockFrame code={code} language="mermaid" title="Copiar Mermaid">
      <Box
        ref={containerRef}
        className="markdown-mermaid"
        sx={{
          p: 2,
          overflowX: "auto",
          minHeight: state.loading ? 72 : "auto",
          color: "var(--dm-text, rgba(0,0,0,0.78))",
          "& svg": {
            display: "block",
            maxWidth: "100%",
            height: "auto",
            mx: "auto",
          },
        }}
      >
        {state.loading ? (
          <Typography sx={{ fontSize: "0.85rem", color: "var(--dm-muted, rgba(0,0,0,0.48))" }}>
            Renderizando diagrama...
          </Typography>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: state.svg }} />
        )}
      </Box>
    </CodeBlockFrame>
  );
}

function MarkdownCodeBlock({ code, language, isDarkBg = false }: any) {
  if (normalizeLanguage(language) === "mermaid") {
    return <MermaidBlock code={code} isDarkBg={isDarkBg} />;
  }

  return (
    <CodeBlockFrame code={code} language={language}>
      <CodeContent code={code} language={language} />
    </CodeBlockFrame>
  );
}

function MarkdownCode({ className, children, isDarkBg = false }: any) {
  const rawCode = getPlainText(children);
  const language = /language-(\S+)/.exec(className || "")?.[1];
  const isBlock = Boolean(language) || rawCode.includes("\n");

  if (isBlock) {
    return <MarkdownCodeBlock code={rawCode.replace(/\n$/, "")} language={language} isDarkBg={isDarkBg} />;
  }

  return (
    <code className="markdown-inline-code">
      {children}
    </code>
  );
}

function MarkdownTable({ children }: any) {
  return (
    <Box sx={{ my: 2, maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <Box
        component="table"
        sx={{
          width: "100%",
          minWidth: 520,
          borderCollapse: "collapse",
          fontSize: "0.92em",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function MarkdownImage({ src, alt }: any) {
  return (
    <Box
      component="img"
      src={src}
      alt={alt || ""}
      loading="lazy"
      sx={{
        display: "block",
        maxWidth: "100%",
        maxHeight: 420,
        my: 2,
        borderRadius: 1,
        border: "1px solid var(--dm-border, rgba(0,0,0,0.08))",
        objectFit: "contain",
      }}
    />
  );
}

// Markdown components config - defined at module level for reuse
const createMarkdownComponents = (isDarkBg = false) => ({
  a: MarkdownLink,
  code: (props: any) => <MarkdownCode {...props} isDarkBg={isDarkBg} />,
  pre: ({ children }: any) => <>{children}</>,
  table: MarkdownTable,
  img: MarkdownImage,
});

// Preprocess text to extract mailto links and render them separately
function TextWithMailto({ content, isDarkBg = false }: any) {
  const markdownComponents = useMemo(() => createMarkdownComponents(isDarkBg), [isDarkBg]);
  const normalizedContent = useMemo(() => normalizeMathMarkdown(content || ""), [content]);

  // Check if content contains mailto: links
  const mailtoRegex = /(mailto:[^\s\]]+)/g;
  const matches = normalizedContent.match(mailtoRegex);

  if (!matches) {
    return (
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={markdownRemarkPlugins}
          rehypePlugins={markdownRehypePlugins as any}
          components={markdownComponents}
        >
          {normalizedContent}
        </ReactMarkdown>
      </div>
    );
  }

  // Split content by mailto links
  const parts = normalizedContent.split(mailtoRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("mailto:")) {
          return <MailtoButton key={index} href={part} />;
        }
        return part ? (
          <div key={index} className="markdown-content">
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              rehypePlugins={markdownRehypePlugins as any}
              components={markdownComponents}
            >
              {part}
            </ReactMarkdown>
          </div>
        ) : null;
      })}
    </>
  );
}

const MIN_DISPLAY_TIME = 1000; // Tempo minimo para evitar piscada no indicador.

const ChatMessage = memo(function ChatMessage({
  exchange,
  latestMessageRef,
  contentFontSizes,
  copiedId,
  onCopy,
  getCopyContent,
  onRetry,
  isLoading,
  isDarkBg = false,
}: any) {
  const [textDialogOpen, setTextDialogOpen] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(null);
  const [showIndicator, setShowIndicator] = useState(false);
  const indicatorStartRef = useRef(null);

  // Content is ready when indicator is not showing or content already exists
  const hasContent = exchange.responses.some(r => r.type === "text" && r.content);
  const contentReady = !showIndicator || hasContent;

  // Compute grouping at render time instead of storing in state
  const groupedResponses = useMemo(() => groupMessages(exchange.responses), [exchange.responses]);

  // Conditions from props/exchange
  const isInitialLoading = exchange.isLatest && isLoading && exchange.responses.length === 0;
  const hasCallingChips = exchange.isLatest && exchange.responses.some(r => r.type === "mcp_chip" && r.status === "calling");
  // Detect gap after tool completion: chips are done but no text has arrived yet
  const waitingAfterTools = exchange.isLatest && isLoading &&
    exchange.responses.some(r => r.type === "mcp_chip" && r.status === "completed") &&
    !exchange.responses.some(r => r.type === "text" && r.content);
  const shouldShowIndicator = (isInitialLoading || waitingAfterTools) && !hasCallingChips;

  useEffect(() => {
    if (shouldShowIndicator && !showIndicator) {
      indicatorStartRef.current = Date.now();
      setShowIndicator(true);
    } else if (!shouldShowIndicator && showIndicator) {
      // Calling chips skip MIN_DISPLAY_TIME — the chip IS the progress indicator
      if (hasCallingChips) {
        setShowIndicator(false);
        return;
      }
      const elapsed = Date.now() - (indicatorStartRef.current || 0);
      const remaining = MIN_DISPLAY_TIME - elapsed;
      if (remaining > 0) {
        const timer = setTimeout(() => setShowIndicator(false), remaining);
        return () => clearTimeout(timer);
      } else {
        setShowIndicator(false);
      }
    }
  }, [shouldShowIndicator, showIndicator, hasCallingChips]);

  return (
    <Box
      ref={exchange.isLatest ? latestMessageRef : null}
      sx={{
        width: "100%",
        overflow: "visible",
        mb: exchange.isLatest ? 0 : 6,
        "&:hover .copy-button": { opacity: 1 },
      }}
    >
      {/* User message */}
      <Box sx={{ marginBottom: "0.5rem", "&:hover .copy-button": { opacity: 1 } }}>
        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: exchange.isLatest ? 1 : 0.85 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: "left center" }}
        >
          <>
              {/* Attached images (current session) */}
              {exchange.attachedImages && exchange.attachedImages.length > 0 && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                  {exchange.attachedImages.map((img, idx) => (
                    <Box
                      key={idx}
                      onClick={() => setImageDialogOpen(img)}
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 1,
                        overflow: "hidden",
                        border: "1px solid rgba(0,0,0,0.1)",
                        cursor: "pointer",
                        "&:hover": { border: "1px solid rgba(0,0,0,0.25)" },
                      }}
                    >
                      <img
                        src={img.preview}
                        alt={img.name || `Imagem anexada ${idx + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
              {/* Image placeholder (loaded from history) */}
              {exchange.hasImageAttachment && !exchange.attachedImages && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                  {Array.from({ length: exchange.imageCount || 1 }).map((_, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0,0,0,0.05)",
                        border: "1px dashed rgba(0,0,0,0.15)",
                      }}
                    >
                      <Typography sx={{ fontSize: "1.5rem", opacity: 0.3 }}>🖼️</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {/* Attached texts */}
              {exchange.attachedTexts && exchange.attachedTexts.length > 0 && (
                <Box sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1.5,
                  mb: 1,
                }}>
                  {exchange.attachedTexts.map((txt, idx) => {
                    const fileStyles = {
                      csv: { border: "#4CAF50", chip: "rgba(76, 175, 80, 0.15)", chipText: "#2e7d32" },
                      json: { border: "#FF9800", chip: "rgba(255, 152, 0, 0.15)", chipText: "#e65100" },
                      pdf: { border: "#F44336", chip: "rgba(244, 67, 54, 0.15)", chipText: "#c62828" },
                      txt: { border: "#42A5F5", chip: "rgba(66, 165, 245, 0.15)", chipText: "#1976d2" },
                      md: { border: "#2196F3", chip: "rgba(33, 150, 243, 0.15)", chipText: "#1565c0" },
                      sql: { border: "#9C27B0", chip: "rgba(156, 39, 176, 0.15)", chipText: "#7b1fa2" },
                      py: { border: "#3776AB", chip: "rgba(55, 118, 171, 0.15)", chipText: "#2c5f8a" },
                      js: { border: "#F7DF1E", chip: "rgba(247, 223, 30, 0.2)", chipText: "#8a7800" },
                      ts: { border: "#3178C6", chip: "rgba(49, 120, 198, 0.15)", chipText: "#235a9e" },
                      default: { border: "#9E9E9E", chip: "rgba(0,0,0,0.1)", chipText: "rgba(0,0,0,0.5)" },
                    };
                    const style = fileStyles[txt.ext] || fileStyles.default;
                    const extLabel = txt.ext || "txt";
                    return (
                    <Box
                      key={txt.id || idx}
                      onClick={() => setTextDialogOpen(txt)}
                      sx={{
                        position: "relative",
                        cursor: "pointer",
                        width: 120,
                        mb: "4px",
                        mr: "4px",
                      }}
                    >
                      {/* Stacked back layer */}
                      <Box sx={{ position: "absolute", bottom: -4, left: 3, right: -3, top: 0, borderRadius: 0.75, backgroundColor: `${style.border}12`, border: `1px solid ${style.border}20` }} />
                      {/* Main card */}
                      <Box sx={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        p: 1.25,
                        height: 120,
                        borderRadius: 0.75,
                        backgroundColor: "var(--dm-surface, white)",
                        border: `1px solid ${style.border}30`,
                        boxShadow: `0 2px 8px ${style.border}12`,
                        overflow: "hidden",
                        transition: "all 0.2s",
                        "&:hover": { transform: "translateY(-2px)", boxShadow: `0 8px 20px ${style.border}20` },
                      }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
                          <FileText size={12} style={{ color: style.border, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: style.chipText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {txt.name || "Conteúdo colado"}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, overflow: "hidden" }}>
                          <Typography sx={{
                            fontSize: "0.6rem",
                            color: "rgba(0,0,0,1)",
                            lineHeight: 1.4,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            wordBreak: "break-all",
                          }}>
                            {txt.preview}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.75 }}>
                          <Box sx={{ display: "flex", gap: 0.25 }}>
                            {[0.3, 0.5, 0.8].map((o, i) => <Box key={i} sx={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: style.border, opacity: o }} />)}
                          </Box>
                          <Box sx={{ px: 0.5, py: 0.15, borderRadius: 0.5, backgroundColor: style.chip }}>
                            <Typography sx={{ fontSize: "0.55rem", fontWeight: 700, color: style.chipText }}>.{extLabel}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                    );
                  })}
                </Box>
              )}
              {/* Text message */}
              {exchange.userMessage &&
               !exchange.userMessage.match(/^\[[\d]+ images?\]$/) &&
               (!['[Pasted content]', '[Conteúdo colado]'].includes(exchange.userMessage) || !exchange.attachedTexts?.length) && (
                <CollapsibleUserMessage
                  text={exchange.userMessage.replace(/\s*\[\d+ images?\]$/, '')}
                  fontSize={contentFontSizes}
                  isLatest={exchange.isLatest}
                />
              )}
          </>
        </motion.div>
      </Box>

      {/* Response */}
      <Box sx={{ marginTop: exchange.isLatest ? 2 : 1 }}>
        <Box>
        {groupedResponses
          .filter(group => {
            if (!exchange.isLatest) return true;
            if (!contentReady) return group.type === "mcp_chip_row";
            return true;
          })
          .map((group, groupIndex) => (
          <Box key={group.messageIndex ?? `g-${groupIndex}`} sx={{ mb: 4 }}>
            {group.type === "text" && (
              <Box>
                <Box
                  sx={{
                    fontFamily: "var(--font-oracle-sans), sans-serif",
                    lineHeight: 1.6,
                    fontSize: exchange.isLatest ? "inherit" : { xs: "0.95rem", sm: "1rem", md: "1.05rem" },
                    color: "inherit",
                    opacity: exchange.isLatest ? 1 : 0.7,
                    "& .markdown-content": {
                      maxWidth: "100%",
                      lineHeight: "inherit",
                      color: "inherit",
                    },
                    "& .markdown-content > :first-of-type": { marginTop: 0 },
                    "& .markdown-content > :last-of-type": { marginBottom: 0 },
                    "& .markdown-content h1": { fontSize: "1.28em", fontWeight: 500, lineHeight: 1.35, margin: "0.9em 0 0.45em" },
                    "& .markdown-content h2": { fontSize: "1.16em", fontWeight: 500, lineHeight: 1.35, margin: "0.9em 0 0.45em" },
                    "& .markdown-content h3": { fontSize: "1.06em", fontWeight: 500, lineHeight: 1.35, margin: "0.85em 0 0.4em" },
                    "& .markdown-content h4, & .markdown-content h5, & .markdown-content h6": {
                      fontSize: "1em",
                      fontWeight: 500,
                      lineHeight: 1.35,
                      margin: "0.75em 0 0.35em",
                    },
                    "& .markdown-content p": { margin: "0.7em 0" },
                    "& .markdown-content ul, & .markdown-content ol": { margin: "0.75em 0", paddingLeft: "1.35em" },
                    "& .markdown-content li": { margin: "0.25em 0", paddingLeft: "0.1em" },
                    "& .markdown-content li > p": { margin: "0.25em 0" },
                    "& .markdown-content blockquote": {
                      margin: "1em 0",
                      padding: "0.15em 0 0.15em 1em",
                      borderLeft: "3px solid var(--dm-border, rgba(0,0,0,0.12))",
                      color: "var(--dm-muted, rgba(0,0,0,0.58))",
                    },
                    "& .markdown-content hr": {
                      border: 0,
                      borderTop: "1px solid var(--dm-border, rgba(0,0,0,0.10))",
                      margin: "1.25em 0",
                    },
                    "& .markdown-content .markdown-link": {
                      color: "inherit",
                      textDecoration: "underline",
                      textDecorationThickness: "0.06em",
                      textUnderlineOffset: "0.16em",
                    },
                    "& .markdown-content .markdown-inline-code": {
                      display: "inline",
                      px: 0.45,
                      py: 0.12,
                      borderRadius: 0.75,
                      backgroundColor: "var(--dm-subtle, rgba(0,0,0,0.055))",
                      border: "1px solid var(--dm-border, rgba(0,0,0,0.07))",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: "0.86em",
                      color: "inherit",
                      whiteSpace: "break-spaces",
                    },
                    "& .markdown-content th, & .markdown-content td": {
                      border: "1px solid var(--dm-border, rgba(0,0,0,0.10))",
                      padding: "8px 10px",
                      textAlign: "left",
                      verticalAlign: "top",
                    },
                    "& .markdown-content th": {
                      backgroundColor: "var(--dm-subtle, rgba(0,0,0,0.035))",
                      fontWeight: 600,
                    },
                    "& .markdown-content input[type='checkbox']": {
                      marginRight: "0.45em",
                    },
                    "& p": {
                      overflowX: "auto",
                      overflowY: "hidden",
                      maxWidth: "100%",
                    },
                  }}
                >
                  <TextWithMailto content={group.content} isLatest={exchange.isLatest} isDarkBg={isDarkBg} />
                </Box>
              </Box>
            )}

            {group.type === "mcp_chip_row" && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 1,
                  overflowX: "auto",
                  overflowY: "visible",
                  pt: 0.5,
                  pb: 0.5,
                  mx: -0.5,
                  px: 0.5,
                  "&::-webkit-scrollbar": { height: 4 },
                  "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                    borderRadius: 2,
                  },
                }}
              >
                {group.chips.map((chip, chipIdx) => (
                  <Box
                    key={chipIdx}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: "16px",
                      flexShrink: 0,
                      backgroundColor: chip.status === "completed"
                        ? "rgba(76, 175, 80, 0.08)"
                        : chip.status === "failed"
                        ? "rgba(211, 47, 47, 0.08)"
                        : "var(--dm-subtle, rgba(0, 0, 0, 0.04))",
                      border: chip.status === "completed"
                        ? "1px solid rgba(76, 175, 80, 0.3)"
                        : chip.status === "failed"
                        ? "1px solid rgba(211, 47, 47, 0.3)"
                        : "1px solid var(--dm-border, rgba(0, 0, 0, 0.1))",
                      fontFamily: "var(--font-oracle-sans), sans-serif",
                      fontSize: "0.8rem",
                      color: chip.status === "completed"
                        ? "#2e7d32"
                        : chip.status === "failed"
                        ? "#c62828"
                        : "var(--dm-muted, rgba(0, 0, 0, 0.6))",
                      userSelect: "none",
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {chip.status === "completed" ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <Check size={14} />
                        </motion.div>
                      ) : chip.status === "failed" ? (
                        <motion.div
                          key="error"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <AlertTriangle size={14} />
                        </motion.div>
                      ) : (
                        <motion.div key="loading" style={{ display: "flex", alignItems: "center" }}>
                          <CircularProgress size={14} sx={{ color: "var(--dm-muted, rgba(0, 0, 0, 0.4))" }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span>{getChipLabel(chip)}</span>
                  </Box>
                ))}
              </Box>
            )}

          </Box>
        ))}
        </Box>

        {/* Copy and retry buttons */}
        <AnimatePresence>
        {groupedResponses.length > 0 && (!isLoading || !exchange.isLatest) && contentReady && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.4 }}
          >
          <Box
            className="copy-button"
            sx={{
              mt: -2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              opacity: 0,
              transition: "opacity 0.2s ease",
            }}
          >
            <Tooltip title="Copiar" placement="bottom">
              <IconButton
                onClick={() => onCopy(getCopyContent(exchange), `exchange-${exchange.id}`)}
                size="small"
                sx={{
                  color: "var(--dm-muted, rgba(0, 0, 0, 0.3))",
                  padding: 0,
                  "&:hover": { color: "var(--dm-text, rgba(0, 0, 0, 0.6))", backgroundColor: "transparent" },
                }}
              >
                {copiedId === `exchange-${exchange.id}` ? <Check size={16} /> : <Copy size={16} />}
              </IconButton>
            </Tooltip>
            {exchange.isLatest && onRetry && (
              <Tooltip title="Tentar novamente" placement="bottom">
                <IconButton
                  onClick={() => onRetry()}
                  size="small"
                  sx={{
                    color: "var(--dm-muted, rgba(0, 0, 0, 0.3))",
                    padding: 0,
                    "&:hover": { color: "var(--dm-text, rgba(0, 0, 0, 0.6))", backgroundColor: "transparent" },
                  }}
                >
                  <RotateCcw size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Loading/Thinking indicator — single continuous element */}
        <AnimatePresence>
          {showIndicator && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minHeight: 24 }}>
                <DotMatrixLoader size="medium" delay={400} />
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Text preview dialog */}
      <Dialog
        open={Boolean(textDialogOpen)}
        onClose={() => setTextDialogOpen(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: "80vh",
            backgroundColor: "var(--dm-surface, #fff)",
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          {/* Header */}
          <Box sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            p: 2,
            pb: 1,
            borderBottom: "1px solid var(--dm-border, rgba(0,0,0,0.08))",
          }}>
            <Box>
              <Typography sx={{ fontWeight: 500, fontSize: "0.95rem", color: "var(--dm-text, rgba(0,0,0,0.8))" }}>
                Conteúdo colado
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "var(--dm-muted, rgba(0,0,0,0.5))", mt: 0.25 }}>
                {textDialogOpen?.content && (
                  <>
                    {(new Blob([textDialogOpen.content]).size / 1024).toFixed(2)} KB • {textDialogOpen.content.split('\n').length.toLocaleString()} linhas
                  </>
                )}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, mt: -0.5, mr: -0.5 }}>
              <CopyTextButton content={textDialogOpen?.content} />
              <IconButton size="small" onClick={() => setTextDialogOpen(null)} sx={{ color: "var(--dm-muted, inherit)" }}>
                <X size={18} />
              </IconButton>
            </Box>
          </Box>
          {/* Content */}
          <Box sx={{ p: 2, maxHeight: "60vh", overflow: "auto" }}>
            <Box
              sx={{
                backgroundColor: "var(--dm-subtle, rgba(0,0,0,0.04))",
                borderRadius: 1.5,
                p: 2,
              }}
            >
              <Typography
                component="pre"
                sx={{
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  color: "var(--dm-text, rgba(0,0,0,0.7))",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  m: 0,
                  lineHeight: 1.5,
                }}
              >
                {textDialogOpen?.content}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Image preview dialog */}
      <Dialog
        open={Boolean(imageDialogOpen)}
        onClose={() => setImageDialogOpen(null)}
        maxWidth="md"
      >
        <DialogContent sx={{ p: 1 }}>
          {imageDialogOpen && (
            <img
              src={imageDialogOpen.preview}
              alt={imageDialogOpen.name || "Imagem anexada"}
              style={{ maxWidth: "100%", maxHeight: "80vh", display: "block" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
});

export default ChatMessage;
