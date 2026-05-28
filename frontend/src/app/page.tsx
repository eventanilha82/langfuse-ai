"use client";

import {
  Alert,
  Box,
  Divider,
  Drawer,
  Skeleton,
  Snackbar,
  Typography,
  useMediaQuery,
  useTheme,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import Header from "./components/ui/Header";
import ChatMessage from "./components/chat/ChatMessage";
import ChatSidebar from "./components/chat/ChatSidebar";
import ChatInput from "./components/chat/ChatInput";
import ScrollableList from "./components/ui/ScrollableList";
import OracleLogo from "./components/ui/OracleLogo";
import useChat from "./hooks/useChat";
import { darkModeOverrides, darkCssVars, lightCssVars, DARK_BG } from "./config/darkMode";

const contentFontSizes = { xs: "1.2rem", sm: "1.4rem", md: "1.6rem" };
const mobileInputFontSizes = { xs: "1rem", sm: "1.1rem", md: "1.3rem" };
const defaultUiSettings = {
  appTitle: "OCI Enterprise AI",
  labLabel: "LANGFUSE LABS",
  appLogo: "",
  welcomeMessage: "Bem-vindo de volta!",
  inputPlaceholder: "Digite qualquer coisa...",
};

function normalizeUiSettings(settings: any = {}) {
  const next = { ...defaultUiSettings, ...settings };

  if (next.welcomeMessage === "Welcome back!") {
    next.welcomeMessage = defaultUiSettings.welcomeMessage;
  }

  if (next.inputPlaceholder === "Type anything...") {
    next.inputPlaceholder = defaultUiSettings.inputPlaceholder;
  }

  if (typeof next.labLabel !== "string" || !next.labLabel.trim()) {
    next.labLabel = defaultUiSettings.labLabel;
  } else {
    next.labLabel = next.labLabel.trim().toUpperCase();
  }

  return next;
}

function mixWithWhite(hex, amount) {
  const c = (hex || "#000000").replace("#", "");
  const r = Math.min(255, Math.round(parseInt(c.substring(0, 2), 16) + (255 - parseInt(c.substring(0, 2), 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(c.substring(2, 4), 16) + (255 - parseInt(c.substring(2, 4), 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(c.substring(4, 6), 16) + (255 - parseInt(c.substring(4, 6), 16)) * amount));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

export default function Home({ initialConversationId = null }: any) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // UI Settings from localStorage
  const [uiSettings, setUiSettings] = useState<any>(defaultUiSettings);

  const accentColor = uiSettings.accentColor || "#C74634";
  const hasCustomAccent = !!uiSettings.accentColor && uiSettings.accentColor.toLowerCase() !== "#c74634";
  const leafColor = hasCustomAccent ? mixWithWhite(accentColor, 0.45) : "#C9B9A0";
  const groundColor = hasCustomAccent ? mixWithWhite(accentColor, 0.65) : "#2D5F5D";
  const iconTint = hasCustomAccent ? accentColor : null;
  const isDarkBg = uiSettings.darkMode === true;
  const accentForDark = (() => {
    if (!isDarkBg) return accentColor;
    const c = (accentColor || "#C74634").replace("#", "");
    const lum = (parseInt(c.substring(0,2),16)*0.299 + parseInt(c.substring(2,4),16)*0.587 + parseInt(c.substring(4,6),16)*0.114) / 255;
    return lum < 0.3 ? mixWithWhite(accentColor, 0.15) : accentColor;
  })();
  const darkTheme = isDarkBg ? createTheme({
    ...theme,
    palette: {
      ...theme.palette,
      mode: "dark",
      background: { default: DARK_BG, paper: "#242424" },
      text: { primary: "#e5e5e5", secondary: "rgba(255,255,255,0.5)" },
      divider: "rgba(255,255,255,0.08)",
    },
  }) : theme;

  const [showTextField, setShowTextField] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(30); // percentage
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    // Clamp between 20% and 50%
    setSidebarWidth(Math.min(50, Math.max(20, newWidth)));
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, []);

  // Add/remove global mouse listeners (only once)
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Error snackbar state
  const [errorSnackbar, setErrorSnackbar] = useState({
    open: false,
    message: "",
  });

  const handleError = (message) => {
    setErrorSnackbar({ open: true, message });
  };

  // Use the chat hook
  const {
    isLoading,
    isLoadingConversation,
    chatHistory,
    copiedId,
    spacerHeight,
    recentConversations,
    loadingConversations,
    hasMoreConversations,
    isLoadingMoreConversations,
    loadMoreConversations,
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
    refreshRecentConversations,
  } = useChat({
    initialConversationId,
    onError: handleError,
  });

  const handleCloseSnackbar = (_event: unknown, reason?: string) => {
    if (reason === "clickaway") return;
    setErrorSnackbar({ ...errorSnackbar, open: false });
  };

  const handleToggleDarkMode = useCallback(() => {
    setUiSettings((current: any) => {
      const next = { ...current, darkMode: current.darkMode !== true };
      try {
        window.localStorage?.setItem("uiSettings", JSON.stringify(next));
      } catch {
        // The visual toggle should still work if storage is unavailable.
      }
      return next;
    });
  }, []);

  // Wrap conversation click to also close drawer on mobile
  const handleConversationClickMobile = useCallback((item) => {
    if (item && item.id) {
      handleConversationClick(item);
      setMobileDrawerOpen(false);
    }
  }, [handleConversationClick]);

  useEffect(() => {
    // Load UI settings from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("uiSettings");
      if (stored) {
        try {
          const parsedSettings = normalizeUiSettings(JSON.parse(stored));
          setUiSettings(parsedSettings);
          localStorage.setItem("uiSettings", JSON.stringify(parsedSettings));
          document.title = parsedSettings.appTitle || "OCI Enterprise AI";
        } catch (e) {
          console.error("Erro ao ler as configurações da interface:", e);
        }
      }
    }

    const handleUiSettingsChanged = (e) => {
      const nextSettings = normalizeUiSettings(e.detail);
      setUiSettings(nextSettings);
      document.title = nextSettings.appTitle || "OCI Enterprise AI";
    };
    window.addEventListener('uiSettingsChanged', handleUiSettingsChanged);

    // Show text field after welcome animation completes
    const timer = setTimeout(() => {
      setShowTextField(true);
    }, 200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('uiSettingsChanged', handleUiSettingsChanged);
    };
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        backgroundColor: isDarkBg ? DARK_BG : "#ffffff",
        display: "flex",
        flexDirection: "column",
        ...(isDarkBg ? { ...darkCssVars, ...darkModeOverrides } : lightCssVars),
      }}
    >
      {/* Oracle Redwood — Layered canopy with textured leaf forms */}
      {showTextField && <svg
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: "75vw",
          height: "65vh",
          pointerEvents: "none",
          zIndex: 0,
        }}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMaxYMax slice"
        fill="none"
      >
        <defs>
          {/* Flowing curves — organic wave grain */}
          <pattern id="tx-fiber" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
            <path d="M0 10 Q10 5 20 12 Q30 20 40 14" stroke="white" strokeOpacity="0.25" strokeWidth="1.8" fill="none" />
            <path d="M0 22 Q12 16 22 24 Q32 30 40 26" stroke="white" strokeOpacity="0.30" strokeWidth="2" fill="none" />
            <path d="M0 34 Q8 28 18 35 Q28 40 40 36" stroke="white" strokeOpacity="0.20" strokeWidth="1.4" fill="none" />
          </pattern>
          {/* Topographic contours — nested organic curves */}
          <pattern id="tx-wave" width="50" height="50" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
            <path d="M0 25 Q12 10 25 15 Q38 20 50 10" stroke="white" strokeOpacity="0.28" strokeWidth="1.8" fill="none" />
            <path d="M0 35 Q15 25 25 28 Q40 32 50 22" stroke="white" strokeOpacity="0.20" strokeWidth="1.4" fill="none" />
            <path d="M0 45 Q10 38 25 40 Q38 42 50 35" stroke="white" strokeOpacity="0.14" strokeWidth="1" fill="none" />
          </pattern>
          {/* Weathered erosion — scattered small marks like worn wood */}
          <pattern id="tx-cross" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(2)">
            <rect x="2" y="3" width="6" height="2.5" rx="0.8" fill="white" fillOpacity="0.25" />
            <rect x="18" y="8" width="8" height="2" rx="0.8" fill="white" fillOpacity="0.18" />
            <rect x="8" y="15" width="5" height="2.5" rx="0.8" fill="white" fillOpacity="0.22" />
            <rect x="22" y="20" width="7" height="2" rx="0.8" fill="white" fillOpacity="0.16" />
            <rect x="5" y="25" width="9" height="2" rx="0.8" fill="white" fillOpacity="0.20" />
            <rect x="15" y="2" width="3" height="5" rx="0.8" fill="white" fillOpacity="0.14" />
            <rect x="26" y="14" width="3" height="4" rx="0.8" fill="white" fillOpacity="0.16" />
            <rect x="12" y="22" width="5" height="2" rx="0.8" fill="white" fillOpacity="0.18" />
          </pattern>
          {/* Stipple — larger dots */}
          <pattern id="tx-stipple" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="white" fillOpacity="0.30" />
            <circle cx="6" cy="6" r="0.9" fill="white" fillOpacity="0.22" />
          </pattern>
          {/* Noise displacement for organic edges */}
          <filter id="rw-organic">
            <feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="3" seed="2" />
            <feDisplacementMap in="SourceGraphic" scale="6" />
          </filter>
        </defs>

        <style>{`
          @keyframes rw-rise {
            from { transform: translate(80px, 120px); opacity: 0; }
            to { transform: translate(0, 0); opacity: 1; }
          }
          .rw-layer { animation: rw-rise 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
          .rw-d0 { animation-delay: 0.1s; }
          .rw-d1 { animation-delay: 0.2s; }
          .rw-d2 { animation-delay: 0.05s; }
          .rw-d3 { animation-delay: 0.15s; }
        `}</style>

        <g filter="url(#rw-organic)" transform="translate(120, 110)">
          {/* ══ LAYER 1a: Leaf — rotated left, behind everything ══ */}
          <g className="rw-layer rw-d0">
            <g transform="rotate(-40, 1100, 800)">
              <path
                d="M1150 800 C1130 680 1100 540 1070 460 C1050 400 1035 370 1030 360 C1015 380 1000 420 990 480 C980 560 990 680 1000 800 Z"
                fill={leafColor}
              />
              <path
                d="M1150 800 C1130 680 1100 540 1070 460 C1050 400 1035 370 1030 360 C1015 380 1000 420 990 480 C980 560 990 680 1000 800 Z"
                fill="url(#tx-wave)"
              />
            </g>
          </g>

          {/* ══ LAYER 1b: Second leaf — slightly rotated right ══ */}
          <g className="rw-layer rw-d1">
            <g transform="rotate(-20, 980, 800)">
              <path
                d="M1080 800 C1070 720 1050 620 1030 550 C1015 500 1005 475 1000 465 C990 485 980 520 975 570 C965 640 970 720 980 800 Z"
                fill={leafColor}
              />
              <path
                d="M1080 800 C1070 720 1050 620 1030 550 C1015 500 1005 475 1000 465 C990 485 980 520 975 570 C965 640 970 720 980 800 Z"
                fill="url(#tx-stipple)"
              />
            </g>
          </g>

          {/* ══ LAYER 2: Right — darkest, accent color ══ */}
          <g className="rw-layer rw-d2">
            <path
              d="M1400 800 C1360 620 1280 500 1180 460 C1060 420 980 470 930 560 C890 640 900 730 920 800 Z"
              fill={accentColor}
            />
            <path
              d="M1400 800 C1360 620 1280 500 1180 460 C1060 420 980 470 930 560 C890 640 900 730 920 800 Z"
              fill="url(#tx-fiber)"
            />
          </g>

          {/* ══ LAYER 3: Left sweep — lightest, on top ══ */}
          <g className="rw-layer rw-d3">
            <path
              d="M1400 800 C1350 720 1150 650 950 640 C750 630 600 680 450 760 L350 800 Z"
              fill={groundColor}
            />
            <path
              d="M1400 800 C1350 720 1150 650 950 640 C750 630 600 680 450 760 L350 800 Z"
              fill="url(#tx-cross)"
            />
          </g>
        </g>

      </svg>}

      {/* Header */}
      <Header
        onNewConversation={handleNewConversation}
        isMobile={isMobile}
        onMenuToggle={() => setMobileDrawerOpen(true)}
        showLabChip={uiSettings.showLabChip !== false}
        appTitle={uiSettings.appTitle}
        labLabel={uiSettings.labLabel}
        isDarkBg={isDarkBg}
      />

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: 280,
              pt: 3,
              px: 2,
              display: "flex",
              flexDirection: "column",
              backgroundColor: isDarkBg ? DARK_BG : "#ffffff",
              color: isDarkBg ? "#e5e5e5" : "inherit",
              ...(isDarkBg ? { ...darkCssVars, ...darkModeOverrides } : {}),
            },
          }}
        >
          {/* Logo */}
          <Box sx={{ mb: 2, ml: "-20px" }}>
            {uiSettings.appLogo ? (
              <img
                src={uiSettings.appLogo}
                alt="Logo do aplicativo"
                style={{
                  maxHeight: "40px",
                  width: "auto",
                  objectFit: "contain",
                  ...(isDarkBg && { filter: "brightness(0) invert(1)", opacity: 0.85 }),
                }}
              />
            ) : (
              <OracleLogo accentColor={accentForDark} isDarkBg={isDarkBg} maxHeight={100} />
            )}
          </Box>

          {/* Recent conversations */}
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <ScrollableList
              title="Conversas recentes"
              items={recentConversations}
              activeId={genaiService?.getConversationId()}
              onItemClick={handleConversationClickMobile}
              onItemDelete={handleConversationDelete}
              onRefresh={refreshRecentConversations}
              titleDelay={0}
            />
          </Box>

          {/* Bottom section: theme + user */}
          <Box sx={{ pb: 3 }}>
            <Divider sx={{ mb: 1.5, borderColor: isDarkBg ? "rgba(255,255,255,0.08)" : undefined }} />

            {/* Theme row */}
            <Box
              onClick={() => {
                setMobileDrawerOpen(false);
                handleToggleDarkMode();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setMobileDrawerOpen(false);
                  handleToggleDarkMode();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={isDarkBg ? "Alternar para modo claro" : "Alternar para modo escuro"}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1,
                py: 1,
                cursor: "pointer",
                borderRadius: 1,
                "&:hover": { backgroundColor: isDarkBg ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)" },
              }}
            >
              {isDarkBg ? (
                <Sun size={18} style={{ color: "rgba(255,255,255,0.5)" }} />
              ) : (
                <Moon size={18} style={{ color: "rgba(0, 0, 0, 0.4)" }} />
              )}
              <Typography sx={{ fontSize: "0.85rem", color: isDarkBg ? "rgba(255,255,255,0.7)" : "rgba(0, 0, 0, 0.6)", fontWeight: 400 }}>
                {isDarkBg ? "Modo claro" : "Modo escuro"}
              </Typography>
            </Box>

          </Box>
        </Drawer>
      )}

      {/* Main container */}
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          width: "100%",
          paddingTop: "60px",
          height: "100vh",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Left column - Chat sidebar (desktop only) */}
        {!isMobile && (
          <>
            <ChatSidebar
              uiSettings={uiSettings}
              showTextField={showTextField}
              chatHistoryLength={chatHistory.length}
              inputRef={inputRef}
              onSubmit={handleSubmit}
              onStop={stopGeneration}
              recentConversations={recentConversations}
              loadingConversations={loadingConversations}
              hasMoreConversations={hasMoreConversations}
              isLoadingMoreConversations={isLoadingMoreConversations}
              onLoadMoreConversations={loadMoreConversations}
              activeConversationId={genaiService?.getConversationId()}
              onConversationClick={handleConversationClick}
              onConversationDelete={handleConversationDelete}
              onRefreshConversations={refreshRecentConversations}
              isLoading={isLoading}
              width={sidebarWidth}
              accentColor={accentForDark}
              iconTint={iconTint}
              isDarkBg={isDarkBg}
              onToggleDarkMode={handleToggleDarkMode}
            />

            {/* Draggable divider */}
            <Box
              onMouseDown={handleMouseDown}
              sx={{
                width: "9px",
                cursor: "col-resize",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                // Vertical line
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "1px",
                  backgroundColor: isDarkBg ? "rgba(255,255,255,0.10)" : "rgba(0, 0, 0, 0.08)",
                  transition: "background-color 0.15s",
                },
                "&:hover::before": {
                  backgroundColor: isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0, 0, 0, 0.25)",
                },
                "&:hover .drag-handle": {
                  borderColor: isDarkBg ? "rgba(255,255,255,0.25)" : "rgba(0, 0, 0, 0.25)",
                  height: "32px",
                },
              }}
            >
              <Box
                className="drag-handle"
                sx={{
                  width: "8px",
                  height: "28px",
                  borderRadius: "4px",
                  backgroundColor: isDarkBg ? DARK_BG : "#fff",
                  border: `1px solid ${isDarkBg ? "rgba(255,255,255,0.10)" : "rgba(0, 0, 0, 0.08)"}`,
                  opacity: 1,
                  transition: "all 0.15s",
                  zIndex: 11,
                }}
              />
            </Box>
          </>
        )}

        {/* Right column - Chat History (or full width on mobile) */}
        <Box
          ref={chatContainerRef}
          sx={{
            flex: 1,
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            paddingTop: 2,
            paddingBottom: isMobile ? "100px" : 4,
            minWidth: 0,
            position: "relative",
            color: isDarkBg ? "#e5e5e5" : "inherit",
            "&::before": {
              content: '""',
              position: "fixed",
              top: "60px",
              right: 0,
              width: isMobile ? "100%" : "70%",
              height: "40px",
              background: `linear-gradient(to bottom, ${isDarkBg ? DARK_BG : "white"} 0%, transparent 100%)`,
              pointerEvents: "none",
              zIndex: 5,
            },
          }}
        >
          <Box sx={{
            maxWidth: 900,
            px: { xs: 2, sm: 3, md: 4 },
            mx: isMobile ? "auto" : 0,
          }}>
            {/* Mobile welcome message */}
            {isMobile && chatHistory.length === 0 && !isLoadingConversation && (
              <Box sx={{ pt: 4, pb: 2 }}>
                <Box sx={{ mb: 1, ml: "-20px" }}>
                  {uiSettings.appLogo ? (
                    <img
                      src={uiSettings.appLogo}
                      alt="Logo do aplicativo"
                      style={{
                        maxHeight: "40px",
                        width: "auto",
                        objectFit: "contain",
                        ...(isDarkBg && { filter: "brightness(0) invert(1)", opacity: 0.85 }),
                      }}
                    />
                  ) : (
                    <OracleLogo accentColor={accentForDark} isDarkBg={isDarkBg} maxHeight={100} />
                  )}
                </Box>
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Typography
                      variant="h3"
                      sx={{
                        fontSize: { xs: "1.5rem", sm: "1.8rem" },
                        fontWeight: 300,
                        color: isDarkBg ? "#e5e5e5" : "#000000",
                        lineHeight: 1.4,
                      }}
                    >
                      Oi,
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        fontSize: { xs: "1.5rem", sm: "1.8rem" },
                        fontWeight: 300,
                        color: isDarkBg ? "#e5e5e5" : "#000000",
                        lineHeight: 1.4,
                      }}
                    >
                      {uiSettings.welcomeMessage}
                    </Typography>
                  </motion.div>
                </AnimatePresence>
              </Box>
            )}

            {/* Skeleton loading while conversation loads */}
            {isLoadingConversation && chatHistory.length === 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
                {[0, 1, 2].map((i) => {
                  const bubbleBg = isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0, 0, 0, 0.06)";
                  const lineBg = isDarkBg ? "rgba(255,255,255,0.05)" : "rgba(0, 0, 0, 0.04)";
                  return (
                    <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      {/* User message skeleton */}
                      <Skeleton
                        variant="rounded"
                        width={i === 0 ? "60%" : i === 1 ? "45%" : "55%"}
                        height={40}
                        sx={{ borderRadius: "16px", bgcolor: bubbleBg }}
                      />
                      {/* Assistant message skeleton */}
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                        <Skeleton variant="text" width="90%" sx={{ fontSize: "1rem", bgcolor: lineBg }} />
                        <Skeleton variant="text" width="75%" sx={{ fontSize: "1rem", bgcolor: lineBg }} />
                        <Skeleton variant="text" width={i === 1 ? "40%" : "60%"} sx={{ fontSize: "1rem", bgcolor: lineBg }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}

            {chatHistory.map((exchange) => (
              <ChatMessage
                key={exchange.id}
                exchange={exchange}
                latestMessageRef={latestMessageRef}
                contentFontSizes={contentFontSizes}
                copiedId={copiedId}
                onCopy={handleCopy}
                getCopyContent={getExchangeCopyContent}
                onRetry={handleRetry}
                isLoading={isLoading}
                isDarkBg={isDarkBg}
              />
            ))}

            {/* Dynamic spacer to allow scrolling latest message to top */}
            {chatHistory.length > 0 && spacerHeight > 0 && (
              <Box sx={{ height: spacerHeight }} />
            )}
          </Box>
        </Box>
      </Box>

      {/* Mobile bottom input */}
      {isMobile && showTextField && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: isDarkBg ? "rgba(26, 26, 26, 0.95)" : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderTop: `1px solid ${isDarkBg ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
            px: 2,
            py: 1,
            zIndex: 50,
          }}
        >
          <ChatInput
            ref={inputRef}
            onSubmit={handleSubmit}
            onStop={stopGeneration}
            placeholder={uiSettings.inputPlaceholder}
            fontSize={mobileInputFontSizes}
            disabled={isLoading || isLoadingConversation}
            isLoading={isLoading}
            compact
            accentColor={iconTint}
            isDarkBg={isDarkBg}
          />
        </Box>
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={8000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="error"
          variant="filled"
          sx={{
            width: "100%",
            fontSize: "1rem",
            "& .MuiAlert-icon": {
              fontSize: "1.5rem",
            },
          }}
        >
          {errorSnackbar.message}
        </Alert>
      </Snackbar>

    </Box>
    </ThemeProvider>
  );
}
