/**
 * Export utilities — PDF, image, text, and clipboard for Oracle readings.
 */

import type { ConsultationResult } from "@/types";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatAsText(
  result: ConsultationResult,
  locale: string = "en",
): string {
  const lines: string[] = [];
  const isFA = locale === "fa";
  const divider = "─".repeat(40);

  lines.push(isFA ? "خوانش اوراکل NPS" : "NPS Oracle Reading");
  lines.push(divider);
  lines.push("");

  switch (result.type) {
    case "reading": {
      const d = result.data;
      lines.push(
        `${isFA ? "نوع" : "Type"}: ${isFA ? "خوانش زمانی" : "Time Reading"}`,
      );
      if (d.generated_at) {
        lines.push(
          `${isFA ? "تاریخ" : "Date"}: ${new Date(d.generated_at).toLocaleDateString(locale === "fa" ? "fa-IR" : "en-US")}`,
        );
      }
      lines.push("");

      if (d.fc60_extended) {
        lines.push(`${isFA ? "── آدرس جهانی ──" : "── Universal Address ──"}`);
        lines.push(d.fc60_extended.stamp);
        lines.push(
          `${d.fc60_extended.weekday_name} | ${d.fc60_extended.weekday_planet} | ${d.fc60_extended.weekday_domain}`,
        );
        lines.push("");
      }

      if (d.fc60) {
        lines.push(`${isFA ? "── FC60 ──" : "── FC60 ──"}`);
        lines.push(`${isFA ? "عنصر" : "Element"}: ${d.fc60.element}`);
        lines.push(`${isFA ? "انرژی" : "Energy"}: ${d.fc60.energy_level}`);
        lines.push(`${isFA ? "قطبیت" : "Polarity"}: ${d.fc60.polarity}`);
        lines.push(`${isFA ? "ساقه" : "Stem"}: ${d.fc60.stem}`);
        lines.push(`${isFA ? "شاخه" : "Branch"}: ${d.fc60.branch}`);
        lines.push("");
      }

      if (d.numerology) {
        lines.push(`${isFA ? "── عددشناسی ──" : "── Numerology ──"}`);
        lines.push(
          `${isFA ? "مسیر زندگی" : "Life Path"}: ${d.numerology.life_path}`,
        );
        lines.push(
          `${isFA ? "ارتعاش روز" : "Day Vibration"}: ${d.numerology.day_vibration}`,
        );
        lines.push(
          `${isFA ? "سال شخصی" : "Personal Year"}: ${d.numerology.personal_year}`,
        );
        lines.push(
          `${isFA ? "ماه شخصی" : "Personal Month"}: ${d.numerology.personal_month}`,
        );
        lines.push(
          `${isFA ? "روز شخصی" : "Personal Day"}: ${d.numerology.personal_day}`,
        );
        lines.push("");
      }

      if (d.moon) {
        lines.push(`${isFA ? "── فاز ماه ──" : "── Moon Phase ──"}`);
        lines.push(
          `${d.moon.emoji} ${d.moon.phase_name} (${d.moon.illumination}%)`,
        );
        lines.push("");
      }

      if (d.ganzhi) {
        lines.push(
          `${isFA ? "── کیهان‌شناسی چینی ──" : "── Chinese Cosmology ──"}`,
        );
        lines.push(
          `${isFA ? "حیوان سال" : "Year Animal"}: ${d.ganzhi.year_animal}`,
        );
        lines.push(
          `${isFA ? "عنصر ساقه" : "Stem Element"}: ${d.ganzhi.stem_element}`,
        );
        lines.push("");
      }

      if (d.angel && d.angel.matches.length > 0) {
        lines.push(`${isFA ? "── اعداد فرشته ──" : "── Angel Numbers ──"}`);
        for (const m of d.angel.matches) {
          lines.push(`${m.number}: ${m.meaning}`);
        }
        lines.push("");
      }

      if (d.chaldean) {
        lines.push(`${isFA ? "── کلدانی ──" : "── Chaldean ──"}`);
        lines.push(`${isFA ? "مقدار" : "Value"}: ${d.chaldean.value}`);
        lines.push(`${isFA ? "معنا" : "Meaning"}: ${d.chaldean.meaning}`);
        lines.push("");
      }

      if (d.synchronicities && d.synchronicities.length > 0) {
        lines.push(`${isFA ? "── هم‌زمانی‌ها ──" : "── Synchronicities ──"}`);
        for (const s of d.synchronicities) {
          lines.push(`  - ${s}`);
        }
        lines.push("");
      }

      if (d.ai_interpretation) {
        lines.push(
          `${isFA ? "── تفسیر هوش مصنوعی ──" : "── AI Interpretation ──"}`,
        );
        lines.push(d.ai_interpretation);
        lines.push("");
      }

      lines.push(`${isFA ? "── خلاصه ──" : "── Summary ──"}`);
      lines.push(d.summary);
      break;
    }

    case "question": {
      const d = result.data;
      lines.push(
        `${isFA ? "نوع" : "Type"}: ${isFA ? "خوانش سؤال" : "Question Reading"}`,
      );
      lines.push("");
      lines.push(`${isFA ? "سؤال" : "Question"}: ${d.question}`);
      lines.push(
        `${isFA ? "عدد سؤال" : "Question Number"}: ${d.question_number}`,
      );
      lines.push(
        `${isFA ? "خط تشخیص داده شده" : "Script"}: ${d.detected_script}`,
      );
      lines.push(`${isFA ? "سیستم" : "System"}: ${d.numerology_system}`);
      if (d.is_master_number) {
        lines.push(
          `${isFA ? "عدد استاد" : "Master Number"}: ${isFA ? "بله" : "Yes"}`,
        );
      }
      if (d.ai_interpretation) {
        lines.push("");
        lines.push(`${isFA ? "── تفسیر ──" : "── Interpretation ──"}`);
        lines.push(d.ai_interpretation);
      }
      break;
    }

    case "name": {
      const d = result.data;
      lines.push(
        `${isFA ? "نوع" : "Type"}: ${isFA ? "خوانش نام" : "Name Reading"}`,
      );
      lines.push("");
      lines.push(`${isFA ? "نام" : "Name"}: ${d.name}`);
      lines.push(`${isFA ? "بیان" : "Expression"}: ${d.expression}`);
      lines.push(`${isFA ? "انگیزه روح" : "Soul Urge"}: ${d.soul_urge}`);
      lines.push(`${isFA ? "شخصیت" : "Personality"}: ${d.personality}`);
      if (d.life_path !== null) {
        lines.push(`${isFA ? "مسیر زندگی" : "Life Path"}: ${d.life_path}`);
      }
      if (d.ai_interpretation) {
        lines.push("");
        lines.push(`${isFA ? "── تفسیر ──" : "── Interpretation ──"}`);
        lines.push(d.ai_interpretation);
      }
      break;
    }
  }

  lines.push("");
  lines.push(divider);
  lines.push(
    isFA
      ? "تولید شده توسط فریمورک عددشناسی NPS"
      : "Generated by NPS Numerology Framework",
  );

  return lines.join("\n");
}

export async function exportAsPdf(
  elementId: string,
  filename: string,
  _locale: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  await document.fonts.ready;

  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: null,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let yOffset = margin;
  let remainingHeight = imgHeight;

  while (remainingHeight > 0) {
    pdf.addImage(imgData, "PNG", margin, yOffset, imgWidth, imgHeight);
    remainingHeight -= pageHeight - margin * 2;
    if (remainingHeight > 0) {
      pdf.addPage();
      yOffset = -(imgHeight - remainingHeight) + margin;
    }
  }

  pdf.save(filename);
}

export async function exportAsImage(
  elementId: string,
  filename: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  await document.fonts.ready;

  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: null,
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, filename);
  }, "image/png");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for insecure contexts
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  }
}

export function downloadAsText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}

export function downloadAsJson(
  data: Record<string, unknown>,
  filename: string,
): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, filename);
}
