"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Marquee from "react-fast-marquee";
import { motion } from "framer-motion";
import { useBackendTimer } from "@/hooks/useBackendTimer";

// Isolated Evil Character Component - completely self-contained
const EvilCharacter = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isLargeScreen) return null;

  return (
    <>
      <motion.div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "red",
          pointerEvents: "none",
          zIndex: 499,
        }}
        animate={{ opacity: isVisible ? 0.3 : 0 }}
        initial={{ opacity: 0 }}
        transition={{ type: "tween", ease: "easeInOut", duration: 1 }}
      />
      <motion.div
        style={{
          position: "fixed",
          left: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          zIndex: 500,
          transform: "scale(0.8)",
          transformOrigin: "bottom left",
        }}
        animate={{ y: isVisible ? 0 : 600 }}
        initial={{ y: 600 }}
        transition={{ type: "tween", ease: "easeInOut", duration: 1 }}
      >
        <div
          style={{
            background: "#c0c0c0",
            border: "2px solid",
            borderColor: "#ffffff #808080 #808080 #ffffff",
            boxShadow: "2px 2px 0px #000000",
            padding: "18px 24px",
            marginLeft: "30px",
            marginBottom: "12px",
            maxWidth: "420px",
            fontSize: "19px",
            fontFamily: '"MS Sans Serif", sans-serif',
            position: "relative",
          }}
        >
          I am Dr. Kitty. I have rigged this insanely cute and innocent kitty
          with c4. The only way to save him is to pump $c4t to $1 Million in 24
          hours. But I know the trenches can&apos;t do that. MWEWEWEWEWEW
          <div
            style={{
              position: "absolute",
              bottom: "-15px",
              left: "45px",
              width: 0,
              height: 0,
              borderLeft: "15px solid transparent",
              borderRight: "15px solid transparent",
              borderTop: "15px solid #c0c0c0",
            }}
          />
        </div>
        <img
          src="/evil.png"
          alt="Evil character"
          style={{ width: "300px", height: "auto", objectFit: "contain" }}
        />
      </motion.div>
    </>
  );
};

// Windows 95 styled bomb defusal page with PumpPortal + PumpSwap + CoinGecko + backend timer
export default function BombDefusal() {
  const TARGET_MARKET_CAP_USD = 1_000_000;

  const { timeRemaining, isDefused, isExploded, triggerDefuse } = useBackendTimer({
    pollInterval: 5000,
    onDefused: (data) => console.log("Defused!", data),
  });

  const hasTriggeredDefuse = useRef(false);

  // Market cap state
  const [currentMarketCapSol, setCurrentMarketCapSol] = useState<number | null>(null);
  const [currentMarketCapUsd, setCurrentMarketCapUsd] = useState<number | null>(null);

  // Prices
  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const [tokenPriceSol, setTokenPriceSol] = useState<number | null>(null);

  const [tokenSymbol] = useState("$c4t");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Connection status for both websockets
  const [isBondingCurveConnected, setIsBondingCurveConnected] = useState(false);
  const [isPumpSwapConnected, setIsPumpSwapConnected] = useState(false);
  const [dataSource, setDataSource] = useState<"bonding" | "pumpswap" | null>(null);

  const [copied, setCopied] = useState(false);

  // ⚠️ SET YOUR ACTUAL TOKEN MINT ADDRESS HERE
  const TOKEN_MINT = "";

  // PumpPortal API key (optional - enables PumpSwap data after migration)
  const PUMPPORTAL_API_KEY = process.env.NEXT_PUBLIC_PUMPPORTAL_API_KEY || "";

  const TOTAL_SUPPLY = 1_000_000_000;

  const leftImages = [1, 2, 3, 4, 5].map((n) => (n === 7 ? `/g${n}.gif` : `/g${n}.webp`));
  const rightImages = [6, 7, 8, 9, 10].map((n) => (n === 7 ? `/g${n}.gif` : `/g${n}.webp`));

  // ---------------- HELPERS ----------------

  const truncateAddress = (address: string, chars = 4) => {
    if (!address) return "";
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
  };

  const handleCopyCA = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_MINT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy token address:", err);
    }
  };

  const formatTime = (seconds: number | null | undefined) => {
    if (seconds == null) return "--:--:--";
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatUsd = (val: number | null) => {
    if (val == null) return "Loading...";
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
    return `$${val.toFixed(2)}`;
  };

  const formatSol = (cap: number | null) => {
    if (cap == null) return "Loading...";
    if (cap >= 1_000_000) return `${(cap / 1_000_000).toFixed(2)}M SOL`;
    if (cap >= 1_000) return `${(cap / 1_000).toFixed(2)}K SOL`;
    return `${cap.toFixed(2)} SOL`;
  };

  const formatPriceSol = (price: number | null) => {
    if (price == null) return "--";
    if (price < 0.00000001) return `${price.toExponential(4)} SOL`;
    if (price < 0.01) return `${price.toFixed(8)} SOL`;
    return `${price.toFixed(6)} SOL`;
  };

  const getProgress = () => {
    if (currentMarketCapUsd == null) return 0;
    return Math.min((currentMarketCapUsd / TARGET_MARKET_CAP_USD) * 100, 100);
  };

  const getTimerColor = (seconds: number | null | undefined) => {
    if (seconds == null) return "#00ff00";
    const s = Math.max(0, seconds);
    if (s > 3600) return "#00ff00";  // >1 hour = green
    if (s > 1800) return "#ffff00";  // >30 min = yellow
    if (s > 600) return "#ff8800";   // >10 min = orange
    return "#ff0000";                 // <10 min = red
  };

  const getMarketCapColor = () => {
    const progress = getProgress();
    if (progress >= 75) return "#00ff00";
    if (progress >= 50) return "#ffff00";
    if (progress >= 25) return "#ff8800";
    return "#ff0000";
  };

  // Shared handler for websocket messages from both connections
  const handleWebSocketMessage = useCallback(
    (data: string, source: "bonding" | "pumpswap") => {
      try {
        const raw = JSON.parse(data);
        const msg = Array.isArray(raw) ? raw[0] : raw;
        if (!msg) return;

        // Ignore messages for other tokens
        if (msg.mint && msg.mint !== TOKEN_MINT) return;

        // Extract market cap - works for both bonding curve and PumpSwap data
        const marketCapSol = msg.marketCapSol as number | undefined;
        const vTokensInBondingCurve = msg.vTokensInBondingCurve as number | undefined;

        if (typeof marketCapSol === "number") {
          setCurrentMarketCapSol(marketCapSol);
          setLastUpdated(new Date());
          setIsLoading(false);
          setApiError(null);
          setDataSource(source);

          const supply =
            vTokensInBondingCurve && vTokensInBondingCurve > 0
              ? vTokensInBondingCurve
              : TOTAL_SUPPLY;

          if (supply > 0) {
            setTokenPriceSol(marketCapSol / supply);
          }
        }
      } catch (err) {
        console.error(`Error parsing ${source} message:`, err);
      }
    },
    [TOKEN_MINT, TOTAL_SUPPLY]
  );

  // ---------------- DUAL WEBSOCKET: BONDING CURVE (FREE) + PUMPSWAP (API KEY) ----------------

  useEffect(() => {
    if (isDefused || isExploded) return;
    if (!TOKEN_MINT) return;

    let bondingWs: WebSocket | null = null;
    let pumpSwapWs: WebSocket | null = null;
    let bondingReconnectTimeout: NodeJS.Timeout | null = null;
    let pumpSwapReconnectTimeout: NodeJS.Timeout | null = null;

    const RECONNECT_DELAY = 3000;

    // ========== BONDING CURVE WEBSOCKET (FREE - NO API KEY) ==========
    const connectBondingCurve = () => {
      try {
        bondingWs = new WebSocket("wss://pumpportal.fun/api/data");

        bondingWs.onopen = () => {
          console.log("🟢 Bonding curve WS connected");
          setIsBondingCurveConnected(true);

          const payload = {
            method: "subscribeTokenTrade",
            keys: [TOKEN_MINT],
          };
          bondingWs?.send(JSON.stringify(payload));
        };

        bondingWs.onmessage = (event) => {
          handleWebSocketMessage(event.data, "bonding");
        };

        bondingWs.onerror = (err) => {
          console.error("Bonding curve WS error:", err);
          setIsBondingCurveConnected(false);
        };

        bondingWs.onclose = () => {
          console.log("🔴 Bonding curve WS closed, reconnecting...");
          setIsBondingCurveConnected(false);

          // Auto-reconnect
          bondingReconnectTimeout = setTimeout(connectBondingCurve, RECONNECT_DELAY);
        };
      } catch (err) {
        console.error("Error connecting bonding curve WS:", err);
        setIsBondingCurveConnected(false);
        bondingReconnectTimeout = setTimeout(connectBondingCurve, RECONNECT_DELAY);
      }
    };

    // ========== PUMPSWAP WEBSOCKET (REQUIRES API KEY) ==========
    const connectPumpSwap = () => {
      // Only connect if we have an API key
      if (!PUMPPORTAL_API_KEY) {
        console.log("⚪ No PumpPortal API key - PumpSwap data disabled");
        return;
      }

      try {
        const wsUrl = `wss://pumpportal.fun/api/data?api-key=${PUMPPORTAL_API_KEY}`;
        pumpSwapWs = new WebSocket(wsUrl);

        pumpSwapWs.onopen = () => {
          console.log("🟢 PumpSwap WS connected (with API key)");
          setIsPumpSwapConnected(true);

          // Subscribe to token trades (will include PumpSwap data after migration)
          const payload = {
            method: "subscribeTokenTrade",
            keys: [TOKEN_MINT],
          };
          pumpSwapWs?.send(JSON.stringify(payload));
        };

        pumpSwapWs.onmessage = (event) => {
          handleWebSocketMessage(event.data, "pumpswap");
        };

        pumpSwapWs.onerror = (err) => {
          console.error("PumpSwap WS error:", err);
          setIsPumpSwapConnected(false);
        };

        pumpSwapWs.onclose = () => {
          console.log("🔴 PumpSwap WS closed, reconnecting...");
          setIsPumpSwapConnected(false);

          // Auto-reconnect
          pumpSwapReconnectTimeout = setTimeout(connectPumpSwap, RECONNECT_DELAY);
        };
      } catch (err) {
        console.error("Error connecting PumpSwap WS:", err);
        setIsPumpSwapConnected(false);
        pumpSwapReconnectTimeout = setTimeout(connectPumpSwap, RECONNECT_DELAY);
      }
    };

    // Connect both websockets
    connectBondingCurve();
    connectPumpSwap();

    // Cleanup
    return () => {
      if (bondingReconnectTimeout) clearTimeout(bondingReconnectTimeout);
      if (pumpSwapReconnectTimeout) clearTimeout(pumpSwapReconnectTimeout);

      if (bondingWs) {
        try {
          if (bondingWs.readyState === WebSocket.OPEN) {
            bondingWs.send(JSON.stringify({ method: "unsubscribeTokenTrade", keys: [TOKEN_MINT] }));
          }
          bondingWs.close();
        } catch (e) {
          /* ignore */
        }
      }

      if (pumpSwapWs) {
        try {
          if (pumpSwapWs.readyState === WebSocket.OPEN) {
            pumpSwapWs.send(JSON.stringify({ method: "unsubscribeTokenTrade", keys: [TOKEN_MINT] }));
          }
          pumpSwapWs.close();
        } catch (e) {
          /* ignore */
        }
      }
    };
  }, [isDefused, isExploded, TOKEN_MINT, PUMPPORTAL_API_KEY, handleWebSocketMessage]);

  // ---------------- COINGECKO: SOL PRICE (USD) EVERY 2 MIN ----------------

  useEffect(() => {
    let isMounted = true;

    const fetchSolPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await res.json();
        const price = data?.solana?.usd;
        if (isMounted && typeof price === "number") {
          setSolPriceUsd(price);
        }
      } catch (err) {
        console.error("Error fetching SOL price from CoinGecko:", err);
      }
    };

    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 120000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // ---------------- DERIVE USD MARKET CAP ----------------

  useEffect(() => {
    if (currentMarketCapSol != null && solPriceUsd != null) {
      setCurrentMarketCapUsd(currentMarketCapSol * solPriceUsd);
    }
  }, [currentMarketCapSol, solPriceUsd]);

  // ---------------- DEFUSE WHEN USD MCAP HITS TARGET ----------------

  useEffect(() => {
    if (!currentMarketCapUsd || isDefused || isExploded) return;
    if (hasTriggeredDefuse.current) return;

    if (currentMarketCapUsd >= TARGET_MARKET_CAP_USD) {
      hasTriggeredDefuse.current = true;
      triggerDefuse(
        currentMarketCapUsd,
        process.env.NEXT_PUBLIC_WEBHOOK_SECRET as string | undefined
      );
    }
  }, [currentMarketCapUsd, isDefused, isExploded, triggerDefuse, TARGET_MARKET_CAP_USD]);

  // ---------------- STYLES ----------------

  // Compute live status
  const isLiveConnected = isBondingCurveConnected || isPumpSwapConnected;

  const getConnectionStatus = () => {
    if (isBondingCurveConnected && isPumpSwapConnected) return "DUAL CONNECTED";
    if (isPumpSwapConnected) return "PUMPSWAP";
    if (isBondingCurveConnected) return "BONDING CURVE";
    return "DISCONNECTED";
  };

  const styles: { [key: string]: React.CSSProperties } = {
    pageWrapper: {
      minHeight: "100vh",
      background: "#000",
      fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, sans-serif',
      padding: "24px 12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: "auto",
    },
    mainLayout: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      gap: "16px",
      maxWidth: "1100px",
      width: "100%",
      position: "relative",
      margin: "16px 0",
    },
    sideColumn: {
      position: "absolute",
      top: 0,
    },
    sideColumnLeft: {
      left: 0,
    },
    sideColumnRight: {
      right: 0,
    },
    sideImage: {
      width: "210px",
      height: "210px",
      objectFit: "contain",
      imageRendering: "auto",
    },
    window: {
      background: "#c0c0c0",
      border: "2px solid",
      borderColor: "#ffffff #808080 #808080 #ffffff",
      boxShadow: "2px 2px 0px #000000",
      maxWidth: "500px",
      width: "100%",
      flexShrink: 0,
    },
    titleBar: {
      background: "linear-gradient(90deg, #000080 0%, #1084d0 100%)",
      color: "white",
      padding: "4px 6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontWeight: "bold",
      fontSize: "14px",
    },
    titleButtons: {
      display: "flex",
      gap: "2px",
    },
    titleButton: {
      width: "16px",
      height: "14px",
      background: "#c0c0c0",
      border: "1px solid",
      borderColor: "#ffffff #808080 #808080 #ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "10px",
      fontWeight: "bold",
      cursor: "pointer",
      fontFamily: "Marlett, sans-serif",
    },
    caBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "4px 8px",
      borderBottom: "1px solid #808080",
      background: "#c0c0c0",
      fontSize: "11px",
    },
    caLabel: {
      fontFamily: '"MS Sans Serif", sans-serif',
    },
    caAddressContainer: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: '"Courier New", monospace',
    },
    caAddressText: {
      maxWidth: "220px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    caCopyButton: {
      padding: "2px 8px",
      background: "#c0c0c0",
      border: "1px solid",
      borderColor: "#ffffff #808080 #808080 #ffffff",
      cursor: "pointer",
      fontSize: "10px",
      fontFamily: '"MS Sans Serif", sans-serif',
    },
    content: {
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
    },
    imageContainer: {
      background: "#000000",
      border: "2px solid",
      borderColor: "#808080 #ffffff #ffffff #808080",
      padding: "8px",
      position: "relative",
    },
    catImage: {
      width: "200px",
      height: "200px",
      objectFit: "contain",
      animation:
        isExploded || isDefused
          ? "none"
          : timeRemaining != null && timeRemaining <= 600
          ? "shake 0.1s infinite"
          : "none",
    },
    timerDisplay: {
      background: "#000000",
      border: "2px solid",
      borderColor: "#808080 #ffffff #ffffff #808080",
      padding: "12px 24px",
      fontFamily: '"Courier New", monospace',
      fontSize: "40px",
      fontWeight: "bold",
      color: getTimerColor(timeRemaining),
      letterSpacing: "2px",
      textShadow: `0 0 10px ${getTimerColor(timeRemaining)}`,
    },
    marqueeContainer: {
      width: "100%",
      background: "#c0c0c0",
      padding: "8px 0",
    },
    marqueeGif: {
      height: "50px",
      objectFit: "contain" as const,
      marginLeft: "8px",
      marginRight: "8px",
    },
    fieldset: {
      border: "2px solid",
      borderColor: "#808080 #ffffff #ffffff #808080",
      padding: "12px",
      width: "100%",
    },
    legend: {
      fontWeight: "bold",
      padding: "0 4px",
    },
    progressContainer: {
      width: "100%",
      background: "#ffffff",
      border: "2px solid",
      borderColor: "#808080 #ffffff #ffffff #808080",
      height: "24px",
      position: "relative",
    },
    progressBar: {
      height: "100%",
      background: getMarketCapColor(),
      transition: "width 0.5s ease, background 0.5s ease",
      width: `${getProgress()}%`,
    },
    marketCapDisplay: {
      background: "#000000",
      border: "2px solid",
      borderColor: "#808080 #ffffff #ffffff #808080",
      padding: "8px 16px",
      fontFamily: '"Courier New", monospace',
      fontSize: "24px",
      fontWeight: "bold",
      color: getMarketCapColor(),
      textAlign: "center",
      textShadow: `0 0 8px ${getMarketCapColor()}`,
    },
    button: {
      padding: "6px 20px",
      background: "#c0c0c0",
      border: "2px solid",
      borderColor: "#ffffff #808080 #808080 #ffffff",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "14px",
      fontFamily: '"MS Sans Serif", sans-serif',
    },
    statusBar: {
      background: "#c0c0c0",
      padding: "4px 8px",
      fontSize: "11px",
      display: "flex",
      gap: "8px",
    },
    statusItem: {
      border: "1px solid",
      borderColor: "#808080 #ffffff #ffffff #808080",
      padding: "2px 8px",
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: "6px",
      whiteSpace: "nowrap",
      overflow: "hidden",
    },
    explodedOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "#ff0000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "flash 0.2s infinite",
      zIndex: 1000,
    },
    explodedText: {
      fontFamily: '"Impact", sans-serif',
      fontSize: "72px",
      color: "#ffffff",
      textShadow: "4px 4px 0px #000000",
    },
    errorText: {
      color: "#ff0000",
      fontSize: "11px",
      textAlign: "center",
    },
    liveIndicator: {
      display: "inline-block",
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: isLiveConnected ? "#00ff4d" : "#777777",
      opacity: isLiveConnected ? 1 : 0.6,
      animation: isLiveConnected ? "livePulse 1.4s ease-in-out infinite" : "none",
      transformOrigin: "center",
      flexShrink: 0,
    },
    dualIndicator: {
      display: "inline-block",
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: isPumpSwapConnected ? "#00ffff" : "#777777",
      opacity: isPumpSwapConnected ? 1 : 0.4,
      marginLeft: "4px",
      flexShrink: 0,
    },
  };

  const keyframes = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px) rotate(-2deg); }
    75% { transform: translateX(5px) rotate(2deg); }
  }
  @keyframes flash {
    0%, 100% { background: #ff0000; }
    50% { background: #ff8800; }
  }
  @keyframes livePulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.35); }
    100% { transform: scale(1); }
  }
`;

  const SideImages = ({ images, side }: { images: string[]; side: "left" | "right" }) => (
    <div
      className="hidden lg:flex lg:flex-col lg:items-center lg:gap-2"
      style={{
        ...styles.sideColumn,
        ...(side === "left" ? styles.sideColumnLeft : styles.sideColumnRight),
      }}
    >
      {images.map((src, index) => (
        <img
          key={`${side}-${index}`}
          src={src}
          alt={`Side decoration ${index + 1}`}
          style={styles.sideImage}
        />
      ))}
    </div>
  );

  // ---------------- EXPLODED SCREEN ----------------

  if (isExploded) {
    return (
      <>
        <style>{keyframes}</style>
        <div style={styles.explodedOverlay}>
          <div style={{ textAlign: "center" }}>
            <div style={styles.explodedText}>BOOM</div>
            <div style={{ ...styles.window, marginTop: "20px" }}>
              <div style={styles.titleBar}>
                <span>bomb.exe - Fatal Error</span>
              </div>
              <div style={{ padding: "20px", textAlign: "center" }}>
                <p style={{ fontSize: "16px", marginBottom: "16px" }}>
                  {tokenSymbol} did not reach {formatUsd(TARGET_MARKET_CAP_USD)} in time.
                </p>
                <p style={{ fontFamily: "monospace", color: "#808080" }}>
                  Final Market Cap: {formatUsd(currentMarketCapUsd)}
                </p>
                <p style={{ fontFamily: "monospace", color: "#808080", marginTop: "8px" }}>
                  The Trenches have failed.
                </p>
                <button
                  style={{ ...styles.button, marginTop: "16px" }}
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---------------- DEFUSED SCREEN ----------------

  if (isDefused) {
    return (
      <>
        <style>{keyframes}</style>
        <div style={{ ...styles.pageWrapper, background: "#008000" }}>
          <div style={styles.mainLayout}>
            <SideImages images={leftImages} side="left" />
            <div style={styles.window}>
              <div
                style={{
                  ...styles.titleBar,
                  background: "linear-gradient(90deg, #008000 0%, #00ff00 100%)",
                }}
              >
                <span>bomb.exe - DEFUSED</span>
                <div style={styles.titleButtons}>
                  <div style={styles.titleButton}>×</div>
                </div>
              </div>
              <div style={styles.content}>
                <h1 style={{ margin: 0, fontSize: "24px" }}>BOMB DEFUSED</h1>
                <p style={{ textAlign: "center", margin: "8px 0" }}>
                  {tokenSymbol} reached {formatUsd(TARGET_MARKET_CAP_USD)}. Cat status: safe.
                </p>
                <div style={styles.imageContainer}>
                  <img
                    src="/c4.png"
                    alt="Happy Cat"
                    style={{ ...styles.catImage, animation: "none", filter: "hue-rotate(90deg)" }}
                  />
                </div>
                <p style={{ fontFamily: "monospace", fontSize: "14px", color: "#008000" }}>
                  Final Market Cap: {formatUsd(currentMarketCapUsd)}
                </p>
                <p style={{ fontFamily: "monospace", fontSize: "12px", color: "#006600" }}>
                  Time remaining: {formatTime(timeRemaining)}
                </p>
                <button style={styles.button} onClick={() => window.location.reload()}>
                  Play Again
                </button>
              </div>
            </div>
            <SideImages images={rightImages} side="right" />
          </div>
        </div>
      </>
    );
  }

  // ---------------- MAIN GAME WINDOW ----------------

  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.pageWrapper}>
        <EvilCharacter />

        <div style={styles.mainLayout}>
          <SideImages images={leftImages} side="left" />

          <div style={styles.window}>
            <div style={styles.titleBar}>
              <span>bomb.exe</span>
              <div style={styles.titleButtons}>
                <div style={styles.titleButton}>_</div>
                <div style={styles.titleButton}>□</div>
                <div style={styles.titleButton}>×</div>
              </div>
            </div>

            <div style={styles.caBar}>
              <div style={styles.caLabel}>
                <strong>{tokenSymbol}</strong>
              </div>
              <div style={styles.caAddressContainer}>
                <span style={styles.caAddressText}>{truncateAddress(TOKEN_MINT)}</span>
                <button style={styles.caCopyButton} onClick={handleCopyCA}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div style={styles.content}>
              <div style={styles.imageContainer}>
                <img src="/c4.png" alt="Bomb Cat" style={styles.catImage} />
              </div>

              <div style={styles.timerDisplay}>{formatTime(timeRemaining)}</div>

              <div style={styles.marqueeContainer}>
                <Marquee speed={50} gradient={false} autoFill={true}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <img
                      key={num}
                      src={`/${num}.gif`}
                      alt={`gif-${num}`}
                      style={styles.marqueeGif}
                    />
                  ))}
                </Marquee>
              </div>

              <fieldset style={styles.fieldset}>
                <legend style={styles.legend}>Defuse Instructions</legend>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "13px", textAlign: "center" }}>
                    Pump <strong>{tokenSymbol}</strong> to{" "}
                    <strong>{formatUsd(TARGET_MARKET_CAP_USD)}</strong> market cap to defuse.
                  </p>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#808080", marginBottom: "4px" }}>
                      Market Cap:
                    </div>
                    <div style={styles.marketCapDisplay}>
                      {isLoading ? <span>updating...</span> : formatUsd(currentMarketCapUsd)}
                    </div>

                    {(solPriceUsd != null || currentMarketCapSol != null) && (
                      <div style={{ fontSize: "10px", color: "#808080", marginTop: "4px" }}>
                        {solPriceUsd != null && <div>SOL Price: ${solPriceUsd.toFixed(2)}</div>}
                        {currentMarketCapSol != null && (
                          <div>Market Cap (SOL): {formatSol(currentMarketCapSol)}</div>
                        )}
                        {tokenPriceSol != null && (
                          <div>Price per token: {formatPriceSol(tokenPriceSol)}</div>
                        )}
                      </div>
                    )}

                    {apiError && <div style={styles.errorText}>Error: {apiError}</div>}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        marginBottom: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Progress to {formatUsd(TARGET_MARKET_CAP_USD)}</span>
                      <span>{getProgress().toFixed(1)}%</span>
                    </div>
                    <div style={styles.progressContainer}>
                      <div style={styles.progressBar}></div>
                    </div>
                  </div>

                  <button
                    style={{ ...styles.button, width: "100%" }}
                    onClick={() => window.open(`https://pump.fun/coin/${TOKEN_MINT}`, "_blank")}
                  >
                    BUY {tokenSymbol} ON PUMP.FUN
                  </button>
                </div>
              </fieldset>

              <p style={{ fontSize: "10px", color: "#808080", textAlign: "center", margin: 0 }}>
                {dataSource && <span>Source: {dataSource === "pumpswap" ? "PumpSwap" : "Bonding Curve"}</span>}
                {lastUpdated && (
                  <>
                    <br />
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </>
                )}
              </p>
            </div>

            <div style={styles.statusBar}>
              <span style={styles.statusItem}>
                <span style={styles.liveIndicator} />
                {isPumpSwapConnected && <span style={styles.dualIndicator} title="PumpSwap" />}
                {getConnectionStatus()}
              </span>
              <span style={styles.statusItem}>
                {timeRemaining != null && timeRemaining > 600 ? "ARMED" : "CRITICAL"} ·{" "}
                {getProgress().toFixed(0)}%
              </span>
            </div>
          </div>

          <SideImages images={rightImages} side="right" />
        </div>
      </div>
    </>
  );
}