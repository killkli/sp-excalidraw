import { MIME_TYPES } from "../../src/constants";
import { BinaryFileData, ExcalidrawImperativeAPI } from "../../src/types";
import {
  convertToExcalidrawElements,
  ExcalidrawElementSkeleton,
} from "../../src/data/transform";
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from "pdfjs-dist";
import { fileOpen } from "browser-fs-access";
const workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url,
);
GlobalWorkerOptions.workerSrc = workerSrc.href;

function formatNumber(number: number) {
  return String(number).padStart(6, "0");
}

export const uploadPDFFunction = async (excalidrawAPI: ExcalidrawImperativeAPI, pdfBlob?: Blob) => {
  if (window.confirm("確定要上傳PDF檔案嗎？(將會清除畫布)") === false) return;
  excalidrawAPI.resetScene();
  excalidrawAPI.updateScene({
    appState: {
      isLoading: true
    }
  })
  try {
    const rawImages = await getImagesFromPDF(pdfBlob);
    const imagesArray = rawImages.map((image, index) => {
      return {
        dataURL: image.data,
        mimeType: MIME_TYPES.jpg,
        id: `image-${index}-${Date.now()}` as BinaryFileData["id"],
        created: Date.now(),
      } as BinaryFileData;
    });
    excalidrawAPI.addFiles(imagesArray);
    let previousW = 0;
    let previousH = 0;
    let rowCounter = 0;
    const elements: ExcalidrawElementSkeleton[] = [];
    imagesArray.forEach((image, idx) => {
      const rawImage = rawImages[idx];
      const width = rawImage.width / 2;
      const height = rawImage.height / 2;
      const currentRow = Math.floor(idx / 5);
      if (currentRow !== rowCounter) {
        rowCounter = currentRow;
        previousW = 0;
      }
      const columnIdx = idx % 5;
      const imageID = `image-element-${idx}`;
      const imageElement = {
        type: "image",
        x: columnIdx * (previousW + 60),
        y: currentRow * (previousH + 60),
        width: width,
        height: height,
        fileId: image.id,
        id: imageID,
        locked: true,
      } as ExcalidrawElementSkeleton;
      previousW = width;
      previousH = height;
      const frameElement = {
        type: "frame",
        children: [imageID],
        name: `第${formatNumber(idx + 1)}頁`,
        locked: true,
      } as ExcalidrawElementSkeleton;
      elements.push(imageElement);
      elements.push(frameElement);
    });
    excalidrawAPI.updateScene({
      elements: convertToExcalidrawElements(elements),
    });
  } catch (_error) {
    console.error(_error)
  } finally {
    excalidrawAPI.updateScene({
      appState: {
        isLoading: false
      }
    });
  }
}

export const openPDF = async (blob?: Blob) => {
  const fileBlob = blob || await fileOpen({ mimeTypes: ["application/pdf"] });
  const data = await fileBlob.arrayBuffer();
  const pdf = await getDocument({ data: data, cMapUrl: "/boyost/exdraw/", cMapPacked: true }).promise;
  return pdf;
};

const renderPageToCanvas = async (options: {
  pdf: PDFDocumentProxy;
  pageIdx: number;
  canvas: HTMLCanvasElement;
}) => {
  const { pdf, pageIdx, canvas } = options;
  const page = await pdf.getPage(pageIdx);
  const viewport = page.getViewport({ scale: 3 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const canvasContext = canvas.getContext("2d") as CanvasRenderingContext2D;
  await page.render({ canvasContext, viewport }).promise;
};

export const renderPageToBase64 = async (options: {
  pdf: PDFDocumentProxy;
  pageIdx: number;
}): Promise<{
  data: string;
  width: number;
  height: number;
}> => {
  const canvas = document.createElement("canvas");
  await renderPageToCanvas({ ...options, canvas });
  return {
    data: canvas.toDataURL("image/jpeg"),
    width: canvas.width,
    height: canvas.height,
  };
};

export const getImagesFromPDF = async (blob?: Blob): Promise<
  {
    data: string;
    width: number;
    height: number;
  }[]
> => {
  const pdf = await openPDF(blob);
  const images: {
    data: string;
    width: number;
    height: number;
  }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const imageData = await renderPageToBase64({ pdf, pageIdx: i });
    images.push(imageData);
  }
  return images;
};
