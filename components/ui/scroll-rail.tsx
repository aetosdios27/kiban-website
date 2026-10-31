"use client";

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Popover } from "radix-ui";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

// Adapted from Motif's Scroll Rail (https://motif.sweetretry.com, MIT): one tick
// per section, width carries distance from the reading line, colour carries
// focus. Focus is a continuous tick index, so the peak glides between sections.

const THICKNESS = 2;
const MIN_LENGTH = 10;
const MAX_LENGTH = 28;
const SPREAD = 1.35; // ticks the lengthening reaches
const HIGHLIGHT = 0.45; // ticks the brightening reaches
const MIN_OPACITY = 0.2;

const SPRING_LAYOUT = { damping: 32, mass: 0.6, stiffness: 360 };
const SPRING_SWAP = { damping: 30, mass: 0.55, stiffness: 460 };

// A tick has to be held before it previews, so a sweep down the rail opens
// nothing, and the preview lingers long enough to cross the gap into the card.
const OPEN_DELAY = 90;
const CLOSE_DELAY = 180;

const bell = (distance: number, spread: number) =>
  Math.exp(-((distance / spread) ** 2));

export type ScrollRailItem = { id: string; title: string; gist?: string };

const Tick = memo(function Tick({
  canHover,
  count,
  current,
  hovered,
  index,
  item,
  onHover,
  onRegister,
  tabIndex,
  track,
}: {
  canHover: boolean;
  count: number;
  current: boolean;
  hovered: boolean;
  index: number;
  item: ScrollRailItem;
  onHover: (index: number, over: boolean) => void;
  onRegister: (index: number, node: HTMLAnchorElement | null) => void;
  tabIndex: number;
  track: MotionValue<number>;
}) {
  const reduce = useReducedMotion() ?? false;
  const lift = useMotionValue(0);
  // A click focuses a link too; only keyboard focus should hold a preview open.
  const keyboard = useRef(false);

  useEffect(() => {
    if (reduce) {
      lift.set(hovered ? 1 : 0);
      return;
    }
    const controls = animate(lift, hovered ? 1 : 0, SPRING_SWAP);
    return () => controls.stop();
  }, [hovered, lift, reduce]);

  const scaleX = useTransform([track, lift], ([focus, lifted]: number[]) => {
    const length =
      MIN_LENGTH +
      (MAX_LENGTH - MIN_LENGTH) * bell(Math.abs(index - focus), SPREAD);
    return (length + (MAX_LENGTH - length) * lifted) / MAX_LENGTH;
  });
  const opacity = useTransform([track, lift], ([focus, lifted]: number[]) => {
    const rest =
      MIN_OPACITY +
      (1 - MIN_OPACITY) * bell(Math.abs(index - focus), HIGHLIGHT);
    return rest + (1 - rest) * lifted;
  });

  return (
    <li className="rail-tick">
      <Popover.Root
        open={canHover && hovered}
        onOpenChange={(open) => {
          if (!open) onHover(index, false);
        }}
      >
        <Popover.Trigger asChild>
          <a
            ref={(node) => onRegister(index, node)}
            href={`#${item.id}`}
            aria-label={`${index + 1} of ${count}: ${item.title}`}
            aria-current={current ? "location" : undefined}
            tabIndex={tabIndex}
            onFocus={(event) => {
              keyboard.current = event.currentTarget.matches(":focus-visible");
              if (keyboard.current) onHover(index, true);
            }}
            onBlur={() => {
              if (!keyboard.current) return;
              keyboard.current = false;
              onHover(index, false);
            }}
            onPointerEnter={canHover ? () => onHover(index, true) : undefined}
            onPointerLeave={canHover ? () => onHover(index, false) : undefined}
          >
            <motion.span
              aria-hidden="true"
              style={{
                height: THICKNESS,
                width: MAX_LENGTH,
                opacity,
                scaleX,
                transformOrigin: "left",
              }}
            />
          </a>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="rail-card"
            side="right"
            align="center"
            sideOffset={12}
            collisionPadding={16}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onPointerEnter={() => onHover(index, true)}
            onPointerLeave={() => onHover(index, false)}
          >
            <p className="rail-card-title">{item.title}</p>
            {item.gist && <p className="rail-card-gist">{item.gist}</p>}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </li>
  );
});

export function ScrollRail({
  items,
  focus,
  className,
  label = "On this page",
}: {
  items: ScrollRailItem[];
  focus: MotionValue<number>;
  className?: string;
  label?: string;
}) {
  const count = items.length;
  const reduce = useReducedMotion() ?? false;
  const spring = useSpring(focus, SPRING_LAYOUT);
  const track = reduce ? focus : spring;
  const nodes = useRef<(HTMLAnchorElement | null)[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [active, setActive] = useState(() => Math.round(track.get()));
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const query = matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useMotionValueEvent(track, "change", (value) => {
    setActive(Math.min(count - 1, Math.max(0, Math.round(value))));
  });

  const clear = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => clear, [clear]);

  // One hovered index for the whole rail, so two previews can never stack.
  const onHover = useCallback(
    (index: number, over: boolean) => {
      clear();
      timer.current = setTimeout(
        () =>
          setHovered((previous) =>
            over ? index : previous === index ? null : previous,
          ),
        over ? OPEN_DELAY : CLOSE_DELAY,
      );
    },
    [clear],
  );

  const onRegister = useCallback(
    (index: number, node: HTMLAnchorElement | null) => {
      nodes.current[index] = node;
    },
    [],
  );

  const moveTo = (next: number) => {
    const bounded = Math.min(count - 1, Math.max(0, next));
    setCursor(bounded);
    nodes.current[bounded]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const from = cursor ?? active;
    const next = {
      ArrowDown: from + 1,
      ArrowRight: from + 1,
      ArrowUp: from - 1,
      ArrowLeft: from - 1,
      Home: 0,
      End: count - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    moveTo(next);
  };

  const onBlur = (event: FocusEvent<HTMLOListElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setCursor(null);
  };

  return (
    <nav className={className} aria-label={label}>
      <ol onBlur={onBlur} onKeyDown={onKeyDown}>
        {items.map((item, index) => (
          <Tick
            key={item.id}
            canHover={canHover}
            count={count}
            current={index === active}
            hovered={hovered === index}
            index={index}
            item={item}
            onHover={onHover}
            onRegister={onRegister}
            tabIndex={index === (cursor ?? active) ? 0 : -1}
            track={track}
          />
        ))}
      </ol>
    </nav>
  );
}
