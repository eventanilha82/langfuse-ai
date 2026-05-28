import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import Home from "./app/page";
import theme from "./app/theme/theme";
import "./app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <Home />
    </ThemeProvider>
  </StrictMode>
);
