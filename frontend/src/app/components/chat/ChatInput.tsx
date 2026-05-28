"use client";

import { KeyboardReturn } from "@mui/icons-material";
import { Box, IconButton, Menu, MenuItem, TextField, Tooltip, Typography, Dialog, DialogContent } from "@mui/material";
import { Paperclip, ImagePlus, FileText, X, FileText as TextIcon, Copy, Check, CircleStop } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, memo, useCallback, useImperativeHandle, forwardRef, useRef } from "react";
import { withBase } from "../../../lib/withBase";

export const TEXT_EXTENSIONS = [
  '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.html',
  '.xml', '.csv', '.log', '.py', '.java', '.c', '.cpp', '.h', '.sql',
  '.yaml', '.yml', '.toml', '.ini', '.sh', '.bat', '.env',
];
const LONG_TEXT_THRESHOLD = 500;
const MAX_IMAGES = 4;
const MAX_TEXT_ATTACHMENTS = 4;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_TEXT_CHARS = 20000;

function CopyButton({ content }: any) {
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

const ChatInput = memo(forwardRef(function ChatInput({
  onSubmit,
  onStop,
  placeholder,
  fontSize,
  disabled = false,
  isLoading = false,
  compact = false,
  accentColor,
  isDarkBg = false,
  onAttachmentsChange,
}: any, ref) {
  const iconColor = accentColor || (isDarkBg ? "rgba(255,255,255,0.5)" : "rgba(0, 0, 0, 0.4)");
  const [value, setValue] = useState("");
  const [attachMenuAnchor, setAttachMenuAnchor] = useState(null);
  const [attachedImages, setAttachedImages] = useState([]);
  const [attachedTexts, setAttachedTexts] = useState([]);

  useEffect(() => {
    onAttachmentsChange?.(attachedImages.length + attachedTexts.length);
  }, [attachedImages.length, attachedTexts.length, onAttachmentsChange]);
  const [textDialogOpen, setTextDialogOpen] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(null);
  const localInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get file extension from name
  const getFileExtension = (name) => {
    if (!name) return null;
    const match = name.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : null;
  };

  // Add text attachment helper
  const addTextAttachment = useCallback((content, name = null) => {
    setAttachedTexts(prev => {
      if (prev.length >= MAX_TEXT_ATTACHMENTS) return prev;
      const text = String(content || "");
      const truncated = text.length > MAX_ATTACHMENT_TEXT_CHARS;
      const storedContent = truncated
        ? `${text.slice(0, MAX_ATTACHMENT_TEXT_CHARS)}\n\n[conteúdo truncado para envio]`
        : text;
      return [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        name,
        ext: getFileExtension(name),
        content: storedContent,
        size: new Blob([storedContent]).size,
        preview: storedContent.slice(0, 200).replace(/\n/g, ' ') + (storedContent.length > 200 ? '...' : ''),
      }];
    });
  }, []);

  // Process image files
  const processImageFile = useCallback((file) => {
    if (file.size > MAX_IMAGE_BYTES) {
      addTextAttachment(`[Imagem ignorada: ${file.name} excede 6 MB]`, file.name);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImages(prev => {
        if (prev.length >= MAX_IMAGES) return prev;
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            base64: event.target.result,
            preview: event.target.result,
          },
        ];
      });
    };
    reader.readAsDataURL(file);
  }, [addTextAttachment]);

  // Process text files
  const processTextFile = useCallback((file) => {
    if (file.size > MAX_FILE_BYTES) {
      addTextAttachment(`[Arquivo ignorado: ${file.name} excede 10 MB]`, file.name);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      addTextAttachment(event.target.result, file.name);
    };
    reader.readAsText(file);
  }, [addTextAttachment]);

  // Process PDF files - extract text content
  const processPdfFile = useCallback(async (file) => {
    try {
      if (file.size > MAX_FILE_BYTES) {
        addTextAttachment(`[PDF ignorado: ${file.name} excede 10 MB]`, file.name);
        return;
      }
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = withBase('/pdf.worker.min.mjs');

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const textParts = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str || '').join(' ');
        if (pageText.trim()) textParts.push(pageText);
      }

      const fullText = textParts.join('\n\n');
      if (fullText.trim()) {
        addTextAttachment(fullText, file.name);
      } else {
        // Fallback: no extractable text (scanned PDF)
        const sizeKB = (file.size / 1024).toFixed(1);
        addTextAttachment(`[PDF sem texto extraível - ${sizeKB} KB, ${pdf.numPages} páginas]`, file.name);
      }
    } catch (err) {
      console.error('PDF extraction error:', err);
      const sizeKB = (file.size / 1024).toFixed(1);
      addTextAttachment(`[Erro ao ler PDF - ${sizeKB} KB]`, file.name);
    }
  }, [addTextAttachment]);

  // Check if file is a text file
  const isTextFile = useCallback((file) => {
    return file.type.startsWith('text/') ||
      TEXT_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
  }, []);

  // Check if file is a PDF
  const isPdfFile = useCallback((file) => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }, []);

  // Process files (images, text and PDFs)
  const processFiles = useCallback((files) => {
    if (!files) return;

    Array.from(files as Iterable<File>).forEach((file) => {
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      } else if (isPdfFile(file)) {
        processPdfFile(file);
      } else if (isTextFile(file)) {
        processTextFile(file);
      }
    });
  }, [processImageFile, processPdfFile, processTextFile, isPdfFile, isTextFile]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => localInputRef.current?.focus(),
    clear: () => {
      setValue("");
      setAttachedImages([]);
      setAttachedTexts([]);
    },
    getValue: () => value,
    getAttachedImages: () => attachedImages,
    getAttachedTexts: () => attachedTexts,
    addFiles: (files) => processFiles(files),
  }));

  const handleChange = useCallback((e) => setValue(e.target.value), []);

  const handleImageSelect = useCallback((e) => {
    processFiles(e.target.files);
    e.target.value = '';
  }, [processFiles]);

  const handleRemoveImage = useCallback((imageId) => {
    setAttachedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const handleRemoveText = useCallback((textId) => {
    setAttachedTexts(prev => prev.filter(t => t.id !== textId));
  }, []);

  // Paste handler - images, files, and long text
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    const files = e.clipboardData?.files;

    // If there are actual files (from drag or file paste), process them with filenames
    if (files?.length > 0) {
      e.preventDefault();
      processFiles(files);
      return;
    }

    // Check for image or text file items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processImageFile(file);
          return;
        }
        // Check for text files (e.g., .csv, .txt pasted from file manager)
        if (item.kind === 'file' && isTextFile({ type: item.type, name: '' })) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processTextFile(file);
          return;
        }
      }
    }

    // Only treat as plain text paste if no files involved
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.length >= LONG_TEXT_THRESHOLD) {
      e.preventDefault();
      addTextAttachment(pastedText);
    }
  }, [processImageFile, processFiles, processTextFile, isTextFile, addTextAttachment]);

  const canSubmit = !disabled && (value.length > 0 || attachedImages.length > 0 || attachedTexts.length > 0);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) {
        onSubmit(value.trim(), attachedImages, attachedTexts);
        setValue("");
        setAttachedImages([]);
        setAttachedTexts([]);
      }
    }
  }, [value, attachedImages, attachedTexts, canSubmit, onSubmit]);

  const handleSubmitClick = useCallback(() => {
    if (canSubmit) {
      onSubmit(value.trim(), attachedImages, attachedTexts);
      setValue("");
      setAttachedImages([]);
      setAttachedTexts([]);
    }
  }, [value, attachedImages, attachedTexts, canSubmit, onSubmit]);

  const handleAddPhotos = useCallback(() => {
    setAttachMenuAnchor(null);
    imageInputRef.current?.click();
  }, []);

  return (
    <Box
      sx={{
        mt: compact ? 0 : 1,
        mb: compact ? 0 : 4,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        ...(compact ? {} : { minHeight: "16rem" }),
      }}
    >
      {/* Attachments preview */}
      <AnimatePresence>
        {(attachedImages.length > 0 || attachedTexts.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflowY: "clip", overflowX: "visible" }}
          >
            <Box sx={{
              display: "flex",
              gap: 1.5,
              mb: 1,
              pt: 1,
              pb: 0.5,
              overflowX: "auto",
              overflowY: "hidden",
              flexWrap: "nowrap",
              ml: -4,
              pl: 4,
              marginRight: "-36.5px",
              paddingRight: "36.5px",
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}>
              {/* Images */}
              {attachedImages.length > 0 && (
                <Box sx={{ display: "contents" }}>
                  {attachedImages.map(img => (
                    <Box
                      key={img.id}
                      onClick={() => setImageDialogOpen(img)}
                      sx={{
                        position: "relative",
                        width: 80,
                        height: 80,
                        flexShrink: 0,
                        cursor: "pointer",
                        "&:hover .remove-btn": { opacity: 1 },
                      }}
                    >
                      <Box sx={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 1,
                        overflow: "hidden",
                        border: "1px solid rgba(0,0,0,0.1)",
                        "&:hover": { border: "1px solid rgba(0,0,0,0.25)" },
                      }}>
                        <img
                          src={img.preview}
                          alt={img.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </Box>
                      <IconButton
                        className="remove-btn"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(img.id); }}
                        sx={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "white",
                          padding: "2px",
                          opacity: 0,
                          transition: "opacity 0.15s",
                          "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
                        }}
                      >
                        <X size={12} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Text files */}
              {attachedTexts.length > 0 && (
                <Box sx={{ display: "contents" }}>
                  {attachedTexts.map(txt => {
                    // File type styles
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
                      key={txt.id}
                      onClick={() => setTextDialogOpen(txt)}
                      sx={{
                        position: "relative",
                        cursor: "pointer",
                        width: 120,
                        flexShrink: 0,
                        mb: "4px",
                        "&:hover .remove-btn": { opacity: 1 },
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
                          <TextIcon size={12} style={{ color: style.border, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: style.chipText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {txt.name || "Conteúdo colado"}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, overflow: "hidden" }}>
                          <Typography sx={{
                            fontSize: "0.6rem",
                            color: "rgba(0,0,0,0.45)",
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
                      <IconButton
                        className="remove-btn"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleRemoveText(txt.id); }}
                        sx={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          zIndex: 2,
                          backgroundColor: style.border,
                          color: "white",
                          padding: "2px",
                          opacity: 0,
                          transition: "opacity 0.15s",
                          "&:hover": { backgroundColor: style.chipText },
                        }}
                      >
                        <X size={12} />
                      </IconButton>
                    </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flex: 1 }}>
        <TextField
          inputRef={localInputRef}
          autoFocus
          variant="standard"
          placeholder={placeholder}
          multiline
          maxRows={8}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          fullWidth
          sx={{
            "& input, & textarea, & .MuiInput-input": {
              fontSize,
              fontWeight: "100 !important",
              color: isDarkBg ? "rgba(255,255,255,0.7)" : "rgba(0, 0, 0, 0.6)",
              paddingTop: "4px",
              lineHeight: 1.3,
            },
            "& .MuiInput-underline:before, & .MuiInput-underline:hover:not(.Mui-disabled):before, & .MuiInput-underline:after": {
              borderBottom: "none",
            },
          }}
        />
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="Anexar" placement="left">
            <IconButton
              onClick={(e) => setAttachMenuAnchor(e.currentTarget)}
              sx={{
                color: iconColor,
                opacity: 1,
                marginTop: "4px",
                "&:hover": { backgroundColor: isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0, 0, 0, 0.04)" },
              }}
              size="medium"
            >
              <Paperclip style={{ fontSize: "1.5rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={isLoading ? "Parar geração" : "Enviar mensagem"} placement="left" disableHoverListener={!isLoading && !canSubmit}>
            <IconButton
              sx={isLoading ? {
                color: iconColor,
                opacity: 1,
                pointerEvents: "auto",
                "&:hover": { backgroundColor: isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0, 0, 0, 0.04)" },
              } : {
                color: iconColor,
                opacity: canSubmit ? 1 : 0,
                pointerEvents: canSubmit ? "auto" : "none",
                transition: "opacity 0.3s ease-in-out",
                "&:hover": { backgroundColor: isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0, 0, 0, 0.04)" },
              }}
              size="medium"
              onClick={isLoading ? onStop : handleSubmitClick}
            >
              {isLoading ? (
                <CircleStop size={20} />
              ) : (
                <KeyboardReturn sx={{ fontSize }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.h,.yml,.yaml,.toml,.ini,.log,.sql,.sh,.bat"
            multiple
            onChange={(e) => { processFiles(e.target.files); e.target.value = ''; }}
            style={{ display: "none" }}
          />

          {/* Attach menu */}
          <Menu
            anchorEl={attachMenuAnchor}
            open={Boolean(attachMenuAnchor)}
            onClose={() => setAttachMenuAnchor(null)}
          >
            <MenuItem onClick={handleAddPhotos} sx={{ fontSize: "0.9rem", gap: 1 }}>
              <ImagePlus size={16} />
              Adicionar fotos
            </MenuItem>
            <MenuItem onClick={() => { setAttachMenuAnchor(null); fileInputRef.current?.click(); }} sx={{ fontSize: "0.9rem", gap: 1 }}>
              <FileText size={16} />
              Adicionar arquivos
            </MenuItem>
          </Menu>

        </Box>
      </Box>

      {/* Text preview dialog */}
      <Dialog
        open={Boolean(textDialogOpen)}
        onClose={() => setTextDialogOpen(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 2, maxHeight: "80vh" } }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            p: 2,
            pb: 1,
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}>
            <Box>
              <Typography sx={{ fontWeight: 500, fontSize: "0.95rem", color: "rgba(0,0,0,0.8)" }}>
                {textDialogOpen?.name || "Conteúdo colado"}
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.5)", mt: 0.25 }}>
                {textDialogOpen?.content && (
                  <>
                    {(new Blob([textDialogOpen.content]).size / 1024).toFixed(2)} KB • {textDialogOpen.content.split('\n').length.toLocaleString()} linhas
                  </>
                )}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, mt: -0.5, mr: -0.5 }}>
              <CopyButton content={textDialogOpen?.content} />
              <IconButton size="small" onClick={() => setTextDialogOpen(null)}>
                <X size={18} />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ p: 2, maxHeight: "60vh", overflow: "auto" }}>
            <Box sx={{ backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 1.5, p: 2 }}>
              <Typography
                component="pre"
                sx={{
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  color: "rgba(0,0,0,0.7)",
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
        maxWidth="lg"
        slotProps={{
          paper: { sx: { borderRadius: 2, backgroundColor: "rgba(0,0,0,0.9)" } }
        }}
      >
        <DialogContent sx={{ p: 0, position: "relative" }}>
          <IconButton
            size="small"
            onClick={() => setImageDialogOpen(null)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "white",
              zIndex: 1,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
            }}
          >
            <X size={18} />
          </IconButton>
          {imageDialogOpen && (
            <img
              src={imageDialogOpen.preview}
              alt={imageDialogOpen.name}
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}));

export default ChatInput;
