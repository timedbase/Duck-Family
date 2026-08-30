import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, ColorType, CrosshairMode } from "lightweight-charts";
import { cs } from "./cs.js";

// Real TradingView charting (lightweight-charts, their open-source library)
// over real OHLC candles built from indexed on-chain trades — see
// adapters.js buildCandles(). No fake/demo data ever passed in here.
export default function PriceChart({ candles }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#74748A",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,.05)" },
        horzLines: { color: "rgba(255,255,255,.05)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255,255,255,.08)" },
      timeScale: { borderColor: "rgba(255,255,255,.08)", timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#6BE59A", downColor: "#FF6B81", borderVisible: false,
      wickUpColor: "#6BE59A", wickDownColor: "#FF6B81",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(candles || []);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div style={cs("position: relative; width: 100%; height: 260px;")}>
      <div ref={containerRef} style={cs("width: 100%; height: 100%;")} />
      {(!candles || candles.length < 1) && (
        <div style={cs("position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12.5px; color: #74748A; pointer-events: none;")}>
          Chart appears after the first trade.
        </div>
      )}
    </div>
  );
}
