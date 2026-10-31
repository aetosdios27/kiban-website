"use client";

import { DitherShader } from "@/lib/dither";

// 基, the first character of kiban: foundation. Stone-grained, densest at its
// foot, with a low light raking slowly across the face.
const GLYPH =
  "M61 160 69 188H933C947 188 958 183 961 172C918 131 844 69 844 69L779 160ZM232 749 240 777H745C759 777 770 772 773 761C728 720 652 661 652 661L585 749ZM85 919 93 947H899C914 947 926 942 929 931C873 885 781 817 781 817L700 919ZM25 531 33 559H951C966 559 977 554 980 543C935 499 858 433 858 433L789 531ZM314 283V311H694V283ZM314 406V434H694V406ZM253 27V543H400V71C427 66 434 56 436 42ZM424 607V925H574V649C601 645 608 635 609 621ZM602 27V543H752V71C780 67 787 57 789 42ZM250 531C210 628 131 724 23 784L29 796C213 747 356 667 428 547V531ZM630 531 618 544C680 650 785 751 903 796C907 734 933 680 985 633L986 617C868 621 703 603 630 531Z";

const MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1000'><path d='${GLYPH}'/></svg>`,
)}") center / contain no-repeat`;

const STONE = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  float foot = mix(0.74, 0.22, smoothstep(0.08, 0.86, uv.y));
  float rake = exp(-pow((uv.x + uv.y * 0.6 - mod(t * 0.09, 2.6) + 0.3) / 0.26, 2.0));
  float grain = fbm(vec2(uv.x * aspect, uv.y) * 3.2) - 0.5;
  return clamp(foot + rake * 0.32 + grain * 0.24, 0.12, 0.86);
}`;

export function LibraryField() {
  return (
    <DitherShader
      className="lib-field"
      style={{ mask: MASK, WebkitMask: MASK }}
      field={STONE}
      cell={3}
      fps={24}
      stillTime={6}
    />
  );
}
