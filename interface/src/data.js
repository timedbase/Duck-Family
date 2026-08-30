// Pure display helpers used across the app. Real coin/trade/portfolio data
// comes from ../../backend's API (see api.js, adapters.js) — this file only
// holds presentation constants with no on-chain equivalent (color palette,
// number formatting).
const HUES = ["#D9D9D9", "#2A2A33", "#6600FF", "#4A4A57", "#8E8E9C"];
const INK = { "#D9D9D9": "rgba(6,6,10,.5)", "#2A2A33": "rgba(255,255,255,.5)", "#6600FF": "rgba(255,255,255,.64)", "#4A4A57": "rgba(255,255,255,.55)", "#8E8E9C": "rgba(6,6,10,.45)" };
export const UP = "#6BE59A", DOWN = "#FF6B81", INKD = "#12061F";
export const art = i => HUES[i % HUES.length];
export const ink = i => INK[HUES[i % HUES.length]];

export const money = n => n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? "$" + (n / 1e3).toFixed(2) + "K" : "$" + Math.round(n);
export const ageLabel = m => m < 1 ? "just now" : m < 60 ? m + "m" : Math.floor(m / 60) + "h";
