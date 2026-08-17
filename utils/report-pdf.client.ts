export interface ReportPdfCategory {
  id: string;
  label: string;
  content: string;
}

export interface ReportPdfResult {
  blob: Blob;
  pageCount: number;
}

export function extractPdfSummary(content: string) {
  return (
    content.match(/\/summary\s*([\s\S]*?)\s*\/summary_end/i)?.[1]?.trim() ||
    ""
  );
}

export function withoutPdfSummary(content: string) {
  return content
    .replace(/\/summary\s*[\s\S]*?\s*\/summary_end/gi, "")
    .trim();
}

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_X_MM = 5;
const MARGIN_TOP_MM = 9;
const MARGIN_BOTTOM_MM = 9;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_X_MM * 2;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;
const PDF_BACKGROUND = { red: 247, green: 250, blue: 246 };

function canvasHasVisibleContent(canvas: HTMLCanvasElement) {
  if (!canvas.width || !canvas.height) return false;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixelCount = canvas.width * canvas.height;
  const stride = Math.max(1, Math.floor(Math.sqrt(pixelCount / 120_000)));
  let visibleSamples = 0;
  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      const offset = (y * canvas.width + x) * 4;
      const alpha = pixels[offset + 3] || 0;
      const difference =
        Math.abs((pixels[offset] || 0) - PDF_BACKGROUND.red) +
        Math.abs((pixels[offset + 1] || 0) - PDF_BACKGROUND.green) +
        Math.abs((pixels[offset + 2] || 0) - PDF_BACKGROUND.blue);
      if (alpha > 20 && difference > 28) {
        visibleSamples += 1;
        if (visibleSamples >= 8) return true;
      }
    }
  }
  return false;
}

function sliceCanvas(
  source: HTMLCanvasElement,
  sourceY: number,
  sourceHeight: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("無法建立 PDF 分頁畫布");
  context.fillStyle = "#f7faf6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    source,
    0,
    sourceY,
    source.width,
    sourceHeight,
    0,
    0,
    source.width,
    sourceHeight,
  );
  return canvas;
}

async function createWatermarkLogo() {
  const image = new Image();
  image.decoding = "async";
  image.src = "/remove-background-logo.png";
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 500;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.globalAlpha = 0.075;
  context.drawImage(image, 110, 35, 280, 280);
  context.fillStyle = "#24575a";
  context.font = '700 42px "Noto Sans TC", "PingFang TC", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("江映澄紫微", canvas.width / 2, 365);
  return canvas.toDataURL("image/png");
}

function watermarkPositions(pageNumber: number) {
  const offset = (pageNumber % 3) * 2;
  return [
    { x: 18 + offset, y: 24, size: 62, rotation: -20 },
    { x: 122 - offset, y: 80, size: 62, rotation: -20 },
    { x: 2 + offset, y: 145, size: 62, rotation: -20 },
    { x: 72, y: 184, size: 62, rotation: -20 },
    { x: 143 - offset, y: 223, size: 62, rotation: -20 },
  ];
}

export async function generateReportPdf(
  source: HTMLElement,
): Promise<ReportPdfResult> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const watermarkLogo = await createWatermarkLogo().catch(() => "");
  const pages = Array.from(
    source.querySelectorAll<HTMLElement>("[data-pdf-page]"),
  );
  if (!pages.length) {
    throw new Error("沒有可整理成 PDF 的完整解析內容");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  let pageCount = 1;
  let cursorY = MARGIN_TOP_MM;
  let pageHasContent = false;

  const addPage = () => {
    pdf.addPage("a4", "portrait");
    pageCount += 1;
    cursorY = MARGIN_TOP_MM;
    pageHasContent = false;
  };

  const renderElement = async (element: HTMLElement) => {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#f7faf6",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
    });
    if (!canvasHasVisibleContent(canvas)) {
      throw new Error("PDF 內容渲染為空白，已停止下載");
    }
    return canvas;
  };

  const placeCanvas = (canvas: HTMLCanvasElement) => {
    const fullHeightMM = (canvas.height / canvas.width) * CONTENT_WIDTH_MM;
    if (fullHeightMM <= CONTENT_HEIGHT_MM) {
      const remaining = PAGE_HEIGHT_MM - MARGIN_BOTTOM_MM - cursorY;
      if (pageHasContent && fullHeightMM > remaining) addPage();
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.94),
        "JPEG",
        MARGIN_X_MM,
        cursorY,
        CONTENT_WIDTH_MM,
        fullHeightMM,
        undefined,
        "FAST",
      );
      cursorY += fullHeightMM + 3;
      pageHasContent = true;
      return;
    }

    // Oversized sections must begin on a fresh page. This keeps the section
    // title and its leading summary together instead of squeezing the summary
    // into the tail of the previous page before the body is sliced.
    if (pageHasContent) addPage();

    let sourceY = 0;
    while (sourceY < canvas.height) {
      let remainingMM = PAGE_HEIGHT_MM - MARGIN_BOTTOM_MM - cursorY;
      if (pageHasContent && remainingMM < 45) {
        addPage();
        remainingMM = CONTENT_HEIGHT_MM;
      }
      const sourceHeight = Math.min(
        canvas.height - sourceY,
        Math.max(1, Math.floor((remainingMM / CONTENT_WIDTH_MM) * canvas.width)),
      );
      const slice = sliceCanvas(canvas, sourceY, sourceHeight);
      const sliceHeightMM = (sourceHeight / canvas.width) * CONTENT_WIDTH_MM;
      pdf.addImage(
        slice.toDataURL("image/jpeg", 0.94),
        "JPEG",
        MARGIN_X_MM,
        cursorY,
        CONTENT_WIDTH_MM,
        sliceHeightMM,
        undefined,
        "FAST",
      );
      cursorY += sliceHeightMM;
      pageHasContent = true;
      sourceY += sourceHeight;
      if (sourceY < canvas.height) addPage();
    }
    cursorY += 3;
  };

  for (const [pageIndex, page] of pages.entries()) {
    if (pageIndex > 0 && pageHasContent) addPage();
    const blocks = Array.from(
      page.querySelectorAll<HTMLElement>("[data-pdf-block]"),
    ).filter((block) => !block.hasAttribute("data-pdf-footer"));
    if (!blocks.length) continue;
    for (const block of blocks) {
      if (block.hasAttribute("data-pdf-new-page") && pageHasContent) {
        addPage();
      }
      placeCanvas(await renderElement(block));
    }
  }

  for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber);
    if (watermarkLogo) {
      for (const watermark of watermarkPositions(pageNumber)) {
        pdf.addImage(
          watermarkLogo,
          "PNG",
          watermark.x,
          watermark.y,
          watermark.size,
          watermark.size,
          undefined,
          "FAST",
          watermark.rotation,
        );
      }
    }
  }

  const blob = pdf.output("blob");
  if (blob.size < 10_000 || pageCount < 1) {
    throw new Error("PDF 檔案內容不完整，已停止下載");
  }
  return { blob, pageCount };
}

export function saveReportPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
