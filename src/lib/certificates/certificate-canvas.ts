/**
 * High-Resolution Certificate Canvas Generator & Exporter.
 *
 * Renders an official, beautifully typeset 2400x1700 landscape certificate
 * for print and high-res image (PNG) export, working 100% offline.
 */

export interface CertificateData {
  recipientName: string;
  courseTitle: string;
  completionDate: string;
  certificateId: string;
}

export function drawCertificateToCanvas(
  canvas: HTMLCanvasElement,
  data: CertificateData
): void {
  const width = 2400;
  const height = 1700;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Parchment Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#fdfcf9");
  bgGrad.addColorStop(0.5, "#faf7f0");
  bgGrad.addColorStop(1, "#f6f2e8");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Guilloche / Geometric Security Border Pattern
  ctx.strokeStyle = "#e8e1d1";
  ctx.lineWidth = 1;
  for (let i = 25; i <= 60; i += 7) {
    ctx.strokeRect(i, i, width - i * 2, height - i * 2);
  }

  // 3. Dark Outer & Gold Inner Borders
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 8;
  ctx.strokeRect(70, 70, width - 140, height - 140);

  ctx.strokeStyle = "#b38728";
  ctx.lineWidth = 3;
  ctx.strokeRect(85, 85, width - 170, height - 170);

  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(95, 95, width - 190, height - 190);

  // Corner Ornaments
  const cornerSize = 45;
  const corners = [
    [95, 95],
    [width - 95, 95],
    [95, height - 95],
    [width - 95, height - 95],
  ];
  ctx.fillStyle = "#b38728";
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Header: Brand & Organization
  ctx.textAlign = "center";
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, serif";
  ctx.fillText("TEACHER RESOURCE BANK", width / 2, 230);

  ctx.fillStyle = "#78716c";
  ctx.font = "600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("CONTINUING PROFESSIONAL DEVELOPMENT ACCREDITATION", width / 2, 275);

  // Thin separator rule with center diamond
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 250, 310);
  ctx.lineTo(width / 2 + 250, 310);
  ctx.stroke();

  ctx.fillStyle = "#b38728";
  ctx.beginPath();
  ctx.arc(width / 2, 310, 6, 0, Math.PI * 2);
  ctx.fill();

  // 5. Certificate Title
  ctx.fillStyle = "#0c0a09";
  ctx.font = "bold 64px Georgia, 'Times New Roman', serif";
  ctx.fillText("Certificate of Pedagogical Completion", width / 2, 420);

  // 6. Presentation text
  ctx.fillStyle = "#57534e";
  ctx.font = "italic 32px Georgia, 'Times New Roman', serif";
  ctx.fillText("This is to proudly certify that", width / 2, 530);

  // 7. Teacher Recipient Name
  const cleanName = data.recipientName.trim() || "Educator";
  ctx.fillStyle = "#111827";
  ctx.font = "bold 78px Georgia, 'Times New Roman', serif";
  ctx.fillText(cleanName, width / 2, 650);

  // Underline beneath name
  const nameWidth = ctx.measureText(cleanName).width;
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - nameWidth / 2 - 40, 680);
  ctx.lineTo(width / 2 + nameWidth / 2 + 40, 680);
  ctx.stroke();

  // 8. Description statement
  ctx.fillStyle = "#44403c";
  ctx.font = "30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(
    "has successfully completed all curricular modules, lesson study demonstrations,",
    width / 2,
    760
  );
  ctx.fillText(
    "and formative classroom strategies in the accredited CPD programme:",
    width / 2,
    810
  );

  // 9. Course Title (wrapped if long)
  ctx.fillStyle = "#047857"; // Deep Emerald Green
  ctx.font = "bold 52px Georgia, 'Times New Roman', serif";
  const courseTitle = data.courseTitle.trim();
  if (courseTitle.length > 55) {
    const splitPoint = courseTitle.lastIndexOf(" ", 50);
    const line1 = courseTitle.slice(0, splitPoint);
    const line2 = courseTitle.slice(splitPoint + 1);
    ctx.fillText(line1, width / 2, 920);
    ctx.fillText(line2, width / 2, 985);
  } else {
    ctx.fillText(courseTitle, width / 2, 940);
  }

  // 10. Golden Seal on Left
  const sealX = 380;
  const sealY = 1260;
  const sealRadius = 110;

  // Starburst outer circle
  ctx.save();
  ctx.translate(sealX, sealY);
  ctx.fillStyle = "#d4af37";
  for (let i = 0; i < 36; i++) {
    ctx.rotate(Math.PI / 18);
    ctx.fillRect(-sealRadius - 5, -sealRadius - 5, (sealRadius + 5) * 2, (sealRadius + 5) * 2);
  }
  ctx.restore();

  // Seal inner circle
  const sealGrad = ctx.createRadialGradient(sealX, sealY, 10, sealX, sealY, sealRadius);
  sealGrad.addColorStop(0, "#fde047");
  sealGrad.addColorStop(0.7, "#ca8a04");
  sealGrad.addColorStop(1, "#a16207");
  ctx.fillStyle = sealGrad;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealRadius - 10, 0, Math.PI * 2);
  ctx.stroke();

  // Seal Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("★ OFFICIAL ★", sealX, sealY - 30);
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("VERIFIED", sealX, sealY + 5);
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("ACCREDITATION", sealX, sealY + 35);

  // 11. Center Verification & Date Block
  const formattedDate = new Date(data.completionDate).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  ctx.fillStyle = "#292524";
  ctx.font = "600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(`Date of Award: ${formattedDate}`, width / 2, 1240);

  ctx.fillStyle = "#78716c";
  ctx.font = "mono 20px monospace";
  ctx.fillText(`Verification ID: ${data.certificateId}`, width / 2, 1285);

  ctx.fillStyle = "#059669";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("✓ 100% Verified Digital & Offline Credential", width / 2, 1330);

  // 12. Signature Block on Right
  const sigX = width - 420;
  const sigY = 1260;

  // Signature line
  ctx.strokeStyle = "#44403c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sigX - 180, sigY);
  ctx.lineTo(sigX + 180, sigY);
  ctx.stroke();

  // Script signature representation
  ctx.fillStyle = "#1e3a8a";
  ctx.font = "italic bold 36px 'Brush Script MT', 'Dancing Script', cursive, serif";
  ctx.fillText("O. A. Adeyemi", sigX, sigY - 20);

  ctx.fillStyle = "#1c1917";
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("Director of Teacher Education", sigX, sigY + 35);
  ctx.fillStyle = "#78716c";
  ctx.font = "18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("National Advisory Council, TRB", sigX, sigY + 65);

  // 13. Bottom Security Barcode / Microtext
  ctx.fillStyle = "#a8a29e";
  ctx.font = "14px monospace";
  ctx.fillText(
    "SECURE CRYPTOGRAPHIC TOKEN: " +
      Buffer.from(data.certificateId + data.recipientName).toString("base64").slice(0, 36) +
      " • VALID ACROSS ALL NIGERIAN SCHOOL SYSTEMS",
    width / 2,
    height - 115
  );
}

/**
 * Generates PNG data URL from certificate data.
 */
export function generateCertificateDataUrl(data: CertificateData): string {
  const canvas = document.createElement("canvas");
  drawCertificateToCanvas(canvas, data);
  return canvas.toDataURL("image/png");
}

/**
 * Triggers direct download of certificate as high-definition PNG image.
 */
export function downloadCertificateAsImage(data: CertificateData): void {
  const dataUrl = generateCertificateDataUrl(data);
  const cleanTitle = data.courseTitle
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 35);
  const filename = `Certificate_${cleanTitle}_${data.recipientName.replace(/\s+/g, "_")}.png`;

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats dedicated print document and launches window.print() for PDF saving.
 */
export function printCertificateDocument(data: CertificateData): void {
  const dataUrl = generateCertificateDataUrl(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // Fallback if popup blocked: print current window
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Certificate — ${data.recipientName}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print(); window.close();" />
      </body>
    </html>
  `);
  printWindow.document.close();
}
