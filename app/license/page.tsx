import type { Metadata } from "next";
import { SectionHead } from "@/components/kiban/section-head";

export const metadata: Metadata = {
  title: "License and credits — kiban",
  description:
    "kiban is MIT licensed. The license text, and credits for the fonts, icons and libraries this site uses.",
  alternates: { canonical: "/license" },
};

// The engine's LICENSE file at v0.1.0, verbatim.
const MIT = `MIT License

Copyright (c) 2026 aetos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const credits = [
  ["Mona Sans", "The Mona Sans Project Authors", "SIL Open Font License 1.1"],
  ["Departure Mono", "Helena Zhang", "SIL Open Font License 1.1"],
  ["Commit Mono", "Eigil Nikolajsen", "SIL Open Font License 1.1"],
  ["Pixelarticons", "Gerrit Halfmann", "MIT"],
  ["LobeHub Icons", "LobeHub", "MIT"],
  ["Radix UI", "the Radix authors", "MIT"],
  ["Cuelume", "Daniel Belyi", "MIT"],
  ["Rare UI", "Swami Malode", "MIT + Commons Clause + Attribution"],
  ["dithercn", "Leo", "MIT"],
  ["Scritto", "the Scritto authors", "MIT"],
] as const;

export default function LicensePage() {
  return (
    <main id="main-content">
      <section className="section" aria-labelledby="license-title">
        <SectionHead
          index="§"
          label="License"
          id="license-title"
          title={
            <>
              free to use, <span className="px">MIT.</span>
            </>
          }
        >
          Use kiban in anything, commercial or not. Keep the copyright notice
          with it. It comes with no warranty.
        </SectionHead>
        <pre className="section-body license-text">{MIT}</pre>
      </section>
      <section id="credits" className="section" aria-labelledby="credits-title">
        <SectionHead
          index="§"
          label="Credits"
          id="credits-title"
          title={
            <>
              built <span className="px">with.</span>
            </>
          }
        >
          This site bundles these fonts and libraries. The assistant marks in
          the hero are trademarks of their owners.
        </SectionHead>
        <dl className="section-body credit-list">
          {credits.map(([name, by, license]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>
                {by}
                <span>{license}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
