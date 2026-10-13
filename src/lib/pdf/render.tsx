import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificateDocument, type CertificateData } from "./certificate-template";

/**
 * Render a certificate to PDF bytes.
 *
 * Only ever imported by the worker / job code, never by a Next.js route or
 * component — react-pdf is heavy and does not belong in the app bundle.
 */
export async function renderCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<CertificateDocument data={data} />);
  return new Uint8Array(buffer);
}
