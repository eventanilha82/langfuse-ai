"use client";

import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Menu as MenuIcon, SquarePen } from "lucide-react";
import { useEffect, useState } from "react";

export default function Header({
  onNewConversation,
  isMobile = false,
  onMenuToggle,
  showLabChip = true,
  appTitle = "",
  labLabel = "LANGFUSE LABS",
  minimal = false,
  isDarkBg = false,
}: any) {
  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    const key = "header-animated";
    if (sessionStorage.getItem(key)) setHasAnimated(true);
    else sessionStorage.setItem(key, "1");
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 1.5, md: 3 },
        py: 1.5,
        zIndex: 100,
        backgroundColor: isDarkBg ? "rgba(26, 26, 26, 0.85)" : "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Left side: hamburger (mobile) + Title */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {isMobile && onMenuToggle && (
          <IconButton
            onClick={onMenuToggle}
            sx={{
              color: isDarkBg ? "rgba(255,255,255,0.6)" : "rgba(0, 0, 0, 0.5)",
              p: 1,
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <MenuIcon size={22} />
          </IconButton>
        )}
        <motion.div
          initial={hasAnimated ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <Box
            onClick={onNewConversation}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              "&:hover": {
                opacity: 0.7,
              },
            }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                fontWeight: 300,
                color: isDarkBg ? "#e5e5e5" : "#1a1a1a",
                letterSpacing: "0.02em",
                fontFamily: "var(--font-oracle-sans), sans-serif",
                userSelect: "none",
                lineHeight: 1.3,
              }}
            >
              {appTitle || (<><Box component="span" sx={{ fontWeight: 600 }}>OCI</Box>{" "}Enterprise AI</>)}
            </Typography>
            {showLabChip && (
              <Chip
                label={String(labLabel || "LANGFUSE LABS").toUpperCase()}
                size="small"
                variant="outlined"
                sx={{
                  display: { xs: "none", md: "flex" },
                  fontSize: "0.55rem",
                  height: 18,
                  borderRadius: "4px",
                  borderColor: "rgba(0, 0, 0, 0.2)",
                  color: isDarkBg ? "rgba(255,255,255,0.6)" : "rgba(0, 0, 0, 0.5)",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  userSelect: "none",
                  "& .MuiChip-label": {
                    userSelect: "none",
                  },
                }}
              />
            )}
          </Box>
        </motion.div>
      </Box>

      {/* Right controls */}
      {!minimal && <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip title="Nova conversa" placement="bottom">
          <IconButton
            onClick={onNewConversation}
            sx={{
              color: isDarkBg ? "rgba(255,255,255,0.5)" : "rgba(0, 0, 0, 0.4)",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: isDarkBg ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                color: isDarkBg ? "rgba(255,255,255,0.7)" : "rgba(0, 0, 0, 0.6)",
              },
            }}
          >
            <SquarePen size={20} />
          </IconButton>
        </Tooltip>
      </Box>}
    </Box>
  );
}
