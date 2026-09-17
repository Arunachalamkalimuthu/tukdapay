import type { CSSProperties } from 'react';
import { EXAMPLE_PARTS, stripModel, type StripModel } from '@/lib/strip';
import s from './TukdaStrip.module.css';

interface Common {
  /** Outer spacing only; the strip sizes itself to its container's width. */
  className?: string;
}

export type TukdaStripProps = Common &
  (
    | {
        /** Dashed hollow pieces of the ₹5,000 example, for the empty amount field. */
        variant: 'ghost';
      }
    | {
        /**
         * `preview`: solid pieces that re-cut live as the amount changes.
         * `slip`: the same pieces, static, for use cases.
         */
        variant: 'preview' | 'slip';
        parts: readonly number[];
        /** Figures under the pieces (three parts or fewer) or the one-line summary. Default true. */
        figures?: boolean;
      }
    | {
        /** Paid pieces green with a tick, the next piece magenta and taller, later pieces hollow. */
        variant: 'progress';
        parts: readonly number[];
        paid: readonly boolean[];
        /** Defaults to the first unpaid part. */
        nextIndex?: number;
        /** Play "the cut" once as the strip mounts. Pass it only for a plan just created, not a restored one. */
        animateCut?: boolean;
      }
    | {
        /** Three pieces with the middle one missing, for the 404 page. */
        variant: 'missing';
        /** Text inside the missing piece. Default "404". */
        label?: string;
      }
  );

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

function Tick({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path
        d="M2.2 6.4l2.5 2.5 5.1-5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const layoutVars = (m: StripModel) =>
  ({ '--gap': `${m.gapPx}px`, '--min': `${m.minPx}px`, '--count': m.segments.length }) as CSSProperties;

/**
 * The tukda strip: a bill drawn as a bar cut into its parts. Decorative (aria-hidden); the page
 * says the same thing in text. Layout decisions live in lib/strip.ts.
 */
export function TukdaStrip(props: TukdaStripProps) {
  if (props.variant === 'missing') {
    const m = stripModel(EXAMPLE_PARTS);
    return (
      <div aria-hidden="true" className={cx(s.strip, s.missing, props.className)} style={layoutVars(m)}>
        <div className={s.bar}>
          {m.segments.map((seg, i) => (
            <span key={seg.key} className={cx(s.piece, i === 1 && s.hole)} style={{ flexGrow: seg.weight }}>
              {i === 1 && (
                <span className={s.fit}>
                  <span className={s.label}>{props.label ?? '404'}</span>
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const { variant } = props;
  const progress = variant === 'progress';
  const m = progress
    ? stripModel(props.parts, { paid: props.paid, nextIndex: props.nextIndex })
    : stripModel(variant === 'ghost' ? EXAMPLE_PARTS : props.parts);
  const labels = progress && m.labelsInside;
  const figures = variant === 'ghost' || (!progress && props.figures !== false);

  return (
    <div
      aria-hidden="true"
      className={cx(s.strip, s[variant], progress && props.animateCut && s.cut, props.className)}
      data-mode={m.mode}
      data-labels={labels || undefined}
      style={layoutVars(m)}
    >
      <div className={s.bar}>
        {m.segments.map((seg) => (
          <span key={seg.key} className={cx(s.piece, progress && s[seg.state])} style={{ flexGrow: seg.weight }}>
            {progress && seg.state === 'paid' && <Tick className={s.tick} />}
            {labels && seg.label && (
              <span className={s.fit}>
                <span className={s.label}>
                  {seg.state === 'paid' && <Tick className={s.labelTick} />}
                  {seg.label}
                </span>
              </span>
            )}
          </span>
        ))}
      </div>
      {figures &&
        (m.figuresUnder ? (
          <div className={s.figures}>
            {m.segments.map((seg) => (
              <span key={seg.key} className={s.figure} style={{ flexGrow: seg.weight }}>
                {seg.label}
              </span>
            ))}
          </div>
        ) : (
          m.summary && <p className={s.summary}>{m.summary}</p>
        ))}
    </div>
  );
}
