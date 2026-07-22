'use client';

import { forwardRef } from 'react';
import { Certificate, CERT_W, CERT_H, type CertificateData } from './Certificate';

/**
 * Scales the fixed-size certificate to fit `width` while forwarding a ref to the
 * full-size inner node - so a scaled-down preview still exports to PDF at native
 * resolution (html-to-image neutralises the transform during capture).
 */
export const CertificatePreview = forwardRef<HTMLDivElement, CertificateData & { width: number }>(
  function CertificatePreview({ width, ...data }, ref) {
    const scale = width / CERT_W;
    return (
      <div style={{ width, height: CERT_H * scale, overflow: 'hidden' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CERT_W, height: CERT_H }}>
          <Certificate ref={ref} {...data} />
        </div>
      </div>
    );
  },
);
