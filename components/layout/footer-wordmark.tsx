"use client";

import { letters, turbulence } from "ascii.rest/kit";
import { Ascii } from "ascii.rest/react";

// The kiban wordmark, filled with slow ASCII turbulence in black-to-yellow.
const wordmark = turbulence({
  palette: ["#1a1600", "#5c4d00", "#c9ad2c", "#ffe24a", "#fff3a6"],
  speed: "slow",
  cols: 132,
  rows: 30,
}).mask(letters("kiban"));

export function FooterWordmark() {
  return <Ascii piece={wordmark} label="kiban" className="footer-wordmark" />;
}
