"use client";

import React, { useState, useEffect, useRef } from "react";
import Marquee from "react-fast-marquee";
import { motion } from "framer-motion";

// Isolated Evil Character Component - completely self-contained
const EvilCharacter = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const hasAnimated = useRef(false);

  // Check for lg+ screen size (1024px and up)
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    // Check on mount
    checkScreenSize();

    // Listen for resize
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    // Only run once
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Slide up after mount
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Slide down after 10 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Don't render on smaller screens
  if (!isLargeScreen) return null;

  return (
    <>
      {/* Red overlay that fades in/out with the character */}
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
        transition={{
          type: "tween",
          ease: "easeInOut",
          duration: 1,
        }}
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
          // Scale down to 80% (20% smaller)
          transform: "scale(0.8)",
          transformOrigin: "bottom left",
        }}
        animate={{ y: isVisible ? 0 : 600 }}
        initial={{ y: 600 }}
        transition={{
          type: "tween",
          ease: "easeInOut",
          duration: 1,
        }}
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
          I am Dr. Kitty. I have rigged this insanely cute and innocent kitty with c4. The only way to save him is to pump $c4t to $1 Million in 24 hours. But I know the trenches can't do that. MWEWEWEWEWEW
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
          style={{
            width: "300px",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </motion.div>
    </>
  );
};

// Windows 95 styled bomb defusal page with PumpPortal + CoinGecko integration
export default function BombDefusal() {
  const TARGET_TIME = 10 * 60; // 10 minutes in seconds

  // TARGET in USD
  const TARGET_MARKET_CAP_USD = 1000000; // $100K market cap to defuse (change as you like)

  const [timeLeft, setTimeLeft] = useState(TARGET_TIME);
  const [isDefused, setIsDefused] = useState(false);
  const [isExploded, setIsExploded] = useState(false);

  // SOL + USD market caps
  const [currentMarketCapSol, setCurrentMarketCapSol] = useState<number | null>(null);
  const [currentMarketCapUsd, setCurrentMarketCapUsd] = useState<number | null>(null);

  // Prices
  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const [tokenPriceSol, setTokenPriceSol] = useState<number | null>(null);

  const [tokenSymbol, setTokenSymbol] = useState("$c4t");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const [copied, setCopied] = useState(false);

  const TOKEN_MINT = "FohpGCNk3BkRu9hwEEKs7aVfSVe7yZvyrekVLQptpump";

  // Standard pump.fun supply (adjust if needed)
  const TOTAL_SUPPLY = 1_000_000_000;

  // Side images configuration - g1-g10.webp (g7 is .gif)
  const leftImages = [1, 2, 3, 4, 5].map(n => n === 7 ? `/g${n}.gif` : `/g${n}.webp`);
  const rightImages = [6, 7, 8, 9, 10].map(n => n === 7 ? `/g${n}.gif` : `/g${n}.webp`);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
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

  const getTimerColor = () => {
    if (timeLeft > 300) return "#00ff00";
    if (timeLeft > 120) return "#ffff00";
    if (timeLeft > 60) return "#ff8800";
    return "#ff0000";
  };

  const getMarketCapColor = () => {
    const progress = getProgress();
    if (progress >= 75) return "#00ff00";
    if (progress >= 50) return "#ffff00";
    if (progress >= 25) return "#ff8800";
    return "#ff0000";
  };

  // ---------------- TIMER ----------------

  useEffect(() => {
    if (isDefused || isExploded) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExploded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDefused, isExploded]);

  // -------- PUMPPORTAL REAL-TIME MARKET CAP (SOL) --------

  useEffect(() => {
    if (isDefused || isExploded) return;

    let ws: WebSocket | null = null;

    const connect = () => {
      try {
        ws = new WebSocket("wss://pumpportal.fun/api/data");

        ws.onopen = () => {
          setIsLiveConnected(true);
          setApiError(null);

          // Subscribe to trades for our specific token
          const payload = {
            method: "subscribeTokenTrade",
            keys: [TOKEN_MINT],
          };

          ws?.send(JSON.stringify(payload));
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            const msg = Array.isArray(raw) ? raw[0] : raw;
            if (!msg) return;

            if (msg.mint && msg.mint !== TOKEN_MINT) return;

            const marketCapSol = msg.marketCapSol as number | undefined;
            const vTokensInBondingCurve =
              msg.vTokensInBondingCurve as number | undefined;

            if (typeof marketCapSol === "number") {
              setCurrentMarketCapSol(marketCapSol);
              setLastUpdated(new Date());
              setIsLoading(false);
              setApiError(null);

              const supply =
                vTokensInBondingCurve && vTokensInBondingCurve > 0
                  ? vTokensInBondingCurve
                  : TOTAL_SUPPLY;

              if (supply > 0) {
                const priceSol = marketCapSol / supply;
                setTokenPriceSol(priceSol);
              }
            }
          } catch (err) {
            console.error("Error parsing PumpPortal message:", err);
            setApiError("Error parsing real-time data");
            setIsLoading(false);
          }
        };

        ws.onerror = (err) => {
          console.error("PumpPortal websocket error:", err);
          setApiError("Real-time connection error");
          setIsLiveConnected(false);
          setIsLoading(false);
        };

        ws.onclose = () => {
          setIsLiveConnected(false);
        };
      } catch (err) {
        console.error("Error connecting PumpPortal websocket:", err);
        setApiError("Failed to connect to real-time data");
        setIsLoading(false);
      }
    };

    connect();

    return () => {
      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                method: "unsubscribeTokenTrade",
                keys: [TOKEN_MINT],
              })
            );
          }
          ws.close();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isDefused, isExploded, TOKEN_MINT, TOTAL_SUPPLY]);

  // -------- COINGECKO: SOL PRICE (USD) EVERY 2 MIN --------

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
    const interval = setInterval(fetchSolPrice, 120000); // 2 minutes

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // -------- DERIVE USD MARKET CAP --------

  useEffect(() => {
    if (currentMarketCapSol != null && solPriceUsd != null) {
      setCurrentMarketCapUsd(currentMarketCapSol * solPriceUsd);
    }
  }, [currentMarketCapSol, solPriceUsd]);

  // -------- DEFUSE WHEN USD MCAP HITS TARGET --------

  useEffect(() => {
    if (!isDefused && !isExploded && currentMarketCapUsd != null) {
      if (currentMarketCapUsd >= TARGET_MARKET_CAP_USD) {
        setIsDefused(true);
      }
    }
  }, [currentMarketCapUsd, isDefused, isExploded, TARGET_MARKET_CAP_USD]);

  // ---------------- STYLES ----------------

  const styles: { [key: string]: React.CSSProperties } = {
    pageWrapper: {
      minHeight: "100vh",
      background: "#000",
      fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, sans-serif',
      padding: "20px",
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
    },
    sideColumn: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      alignItems: "center",
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
    menuBar: {
      background: "#c0c0c0",
      borderBottom: "1px solid #808080",
      padding: "2px 4px",
      display: "flex",
      gap: "8px",
      fontSize: "12px",
    },
    menuItem: {
      padding: "2px 6px",
      cursor: "pointer",
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
      animation: isExploded
        ? "none"
        : timeLeft <= 60
        ? "shake 0.1s infinite"
        : "none",
    },
    timerDisplay: {
      background: "#000000",
      border: "2px solid",
      borderColor: "#808080 #ffffff #ffffff #808080",
      padding: "12px 24px",
      fontFamily: '"Courier New", monospace',
      fontSize: "48px",
      fontWeight: "bold",
      color: getTimerColor(),
      letterSpacing: "4px",
      textShadow: `0 0 10px ${getTimerColor()}`,
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
      borderTop: "1px solid #808080",
      padding: "4px 8px",
      fontSize: "12px",
      display: "flex",
      gap: "8px",
    },
    statusItem: {
      border: "1px solid",
      borderColor: "#808080 #ffffff #ffffff #808080",
      padding: "2px 8px",
      flex: 1,
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
    aboutWindow: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 100,
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
      marginRight: "6px",
      opacity: isLiveConnected ? 1 : 0.6,
      animation: isLiveConnected ? "livePulse 1.4s ease-in-out infinite" : "none",
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
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes livePulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.35);
    }
    100% {
      transform: scale(1);
    }
  }
`;

  // Side images component
  const SideImages = ({ images, side }: { images: string[], side: 'left' | 'right' }) => (
    <div style={{
      ...styles.sideColumn,
      ...(side === 'left' ? styles.sideColumnLeft : styles.sideColumnRight)
    }}>
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
                <p
                  style={{
                    fontFamily: "monospace",
                    color: "#808080",
                    marginTop: "8px",
                  }}
                >
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
                    style={{
                      ...styles.catImage,
                      animation: "none",
                      filter: "hue-rotate(90deg)",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: "14px",
                    color: "#008000",
                  }}
                >
                  Final Market Cap: {formatUsd(currentMarketCapUsd)}
                </p>
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#006600",
                  }}
                >
                  Time remaining: {formatTime(timeLeft)}
                </p>
                <button
                  style={styles.button}
                  onClick={() => window.location.reload()}
                >
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
        {/* Evil character */}
        <EvilCharacter />

        <div style={styles.mainLayout}>
          {/* Left side images - g1 to g5 */}
          <SideImages images={leftImages} side="left" />

          {/* Main window */}
          <div style={styles.window}>
            <div style={styles.titleBar}>
              <span>bomb.exe</span>
              <div style={styles.titleButtons}>
                <div style={styles.titleButton}>_</div>
                <div style={styles.titleButton}>□</div>
                <div style={styles.titleButton}>×</div>
              </div>
            </div>

            {/* Token CA bar with truncate + copy */}
            <div style={styles.caBar}>
              <div style={styles.caLabel}>
                <strong>{tokenSymbol}</strong>
              </div>
              <div style={styles.caAddressContainer}>
                <span style={styles.caAddressText}>
                  {truncateAddress(TOKEN_MINT)}
                </span>
                <button
                  style={styles.caCopyButton}
                  onClick={handleCopyCA}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div style={styles.content}>
              <div style={styles.imageContainer}>
                <img src="/c4.png" alt="Bomb Cat" style={styles.catImage} />
              </div>

              <div style={styles.timerDisplay}>{formatTime(timeLeft)}</div>

              {/* Infinite marquee with GIFs */}
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      textAlign: "center",
                    }}
                  >
                    Pump <strong>{tokenSymbol}</strong> to{" "}
                    <strong>{formatUsd(TARGET_MARKET_CAP_USD)}</strong> market cap
                    to defuse.
                  </p>

                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#808080",
                        marginBottom: "4px",
                      }}
                    >
                      Market Cap:
                    </div>
                    <div style={styles.marketCapDisplay}>
                      {isLoading ? (
                        <span>updating...</span>
                      ) : (
                        formatUsd(currentMarketCapUsd)
                      )}
                    </div>

                    {/* Extra info: SOL price + SOL mcap */}
                    {(solPriceUsd != null || currentMarketCapSol != null) && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#808080",
                          marginTop: "4px",
                        }}
                      >
                        {solPriceUsd != null && (
                          <div>SOL Price: ${solPriceUsd.toFixed(2)}</div>
                        )}
                        {currentMarketCapSol != null && (
                          <div>Market Cap (SOL): {formatSol(currentMarketCapSol)}</div>
                        )}
                        {tokenPriceSol != null && (
                          <div>Price per token: {formatPriceSol(tokenPriceSol)}</div>
                        )}
                      </div>
                    )}

                    {apiError && (
                      <div style={styles.errorText}>Error: {apiError}</div>
                    )}
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
                    onClick={() =>
                      window.open(`https://pump.fun/coin/${TOKEN_MINT}`, "_blank")
                    }
                  >
                    BUY {tokenSymbol} ON PUMP.FUN
                  </button>
                </div>
              </fieldset>

              <p
                style={{
                  fontSize: "10px",
                  color: "#808080",
                  textAlign: "center",
                  margin: 0,
                }}
              >
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
                Status: {timeLeft > 60 ? "ARMED" : "CRITICAL"}
              </span>
              <span style={styles.statusItem}>
                Pump Level: {getProgress().toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Right side images - g6 to g10 */}
          <SideImages images={rightImages} side="right" />
        </div>
      </div>
    </>
  );
}