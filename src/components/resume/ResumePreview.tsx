'use client';

import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import type { ResumeData, TemplateKey } from './types';
import { templateByKey } from './templates';

/** A4 at 96dpi. The page renders at natural size; a CSS transform scales it to
 *  fit the container, while the forwarded ref points at the FULL-SIZE node so
 *  PDF capture is crisp and unscaled. */
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

interface Props {
  data: ResumeData;
  templateKey: TemplateKey;
}

export const ResumePreview = forwardRef<HTMLDivElement, Props>(function ResumePreview(
  { data, templateKey },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [pageHeight, setPageHeight] = useState(A4_HEIGHT);

  // Fit the page to the container width; never upscale past 1×.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setScale(Math.min(w / A4_WIDTH, 1));
    });
    ro.observe(el);
    setScale(Math.min(el.clientWidth / A4_WIDTH, 1));
    return () => ro.disconnect();
  }, []);

  // Track the real content height so the scaled wrapper reserves correct space.
  useLayoutEffect(() => {
    if (pageRef.current) {
      setPageHeight(Math.max(pageRef.current.scrollHeight, A4_HEIGHT));
    }
  }, [data, templateKey, scale]);

  const Template = templateByKey(templateKey).component;

  const setRefs = (node: HTMLDivElement | null) => {
    pageRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return (
    <div ref={containerRef} className="w-full">
      <div style={{ height: pageHeight * scale }} className="mx-auto" >
        <div
          ref={setRefs}
          data-resume-page
          style={{
            width: A4_WIDTH,
            minHeight: A4_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="overflow-hidden bg-white shadow-lg ring-1 ring-slate-200"
        >
          <Template data={data} />
        </div>
      </div>
    </div>
  );
});
