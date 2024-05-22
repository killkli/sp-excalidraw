import { questionCircle, saveAs } from "../components/icons";
import { ProjectName } from "../components/ProjectName";
import { ToolButton } from "../components/ToolButton";
import { Tooltip } from "../components/Tooltip";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { loadFromJSON, saveAsJSON, prepareElementsForExport } from "../data";
import { resaveAsImageWithScene } from "../data/resave";
import { t } from "../i18n";
import { useDevice } from "../components/App";
import { KEYS } from "../keys";
import { register } from "./register";
import { CheckboxItem } from "../components/CheckboxItem";
import { getExportSize } from "../scene/export";
import { DEFAULT_EXPORT_PADDING, EXPORT_SCALES, THEME } from "../constants";
import { getSelectedElements, isSomeElementSelected } from "../scene";
import { getNonDeletedElements } from "../element";
import { isImageFileHandle } from "../data/blob";
import { nativeFileSystemSupported, fileSave } from "../data/filesystem";
import { Theme } from "../element/types";
import { PDFDocument } from "pdf-lib";
import { exportToCanvas } from "../scene/export";
import { canvasToBlob } from "../data/blob";
import { askAI } from "../data/magic";
import AWN from "awesome-notifications";
import "awesome-notifications/dist/style.css";
import { DataURL } from "../types";

import "../components/ToolIcon.scss";

const notifier = new AWN();

export const actionChangeProjectName = register({
  name: "changeProjectName",
  trackEvent: false,
  perform: (_elements, appState, value) => {
    return { appState: { ...appState, name: value }, commitToHistory: false };
  },
  PanelComponent: ({ appState, updateData, appProps, data }) => (
    <ProjectName
      label={t("labels.fileTitle")}
      value={appState.name || "Unnamed"}
      onChange={(name: string) => updateData(name)}
      isNameEditable={
        typeof appProps.name === "undefined" && !appState.viewModeEnabled
      }
      ignoreFocus={data?.ignoreFocus ?? false}
    />
  ),
});

export const actionChangeExportScale = register({
  name: "changeExportScale",
  trackEvent: { category: "export", action: "scale" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportScale: value },
      commitToHistory: false,
    };
  },
  PanelComponent: ({ elements: allElements, appState, updateData }) => {
    const elements = getNonDeletedElements(allElements);
    const exportSelected = isSomeElementSelected(elements, appState);
    const exportedElements = exportSelected
      ? getSelectedElements(elements, appState)
      : elements;

    return (
      <>
        {EXPORT_SCALES.map((s) => {
          const [width, height] = getExportSize(
            exportedElements,
            DEFAULT_EXPORT_PADDING,
            s,
          );

          const scaleButtonTitle = `${t(
            "imageExportDialog.label.scale",
          )} ${s}x (${width}x${height})`;

          return (
            <ToolButton
              key={s}
              size="small"
              type="radio"
              icon={`${s}x`}
              name="export-canvas-scale"
              title={scaleButtonTitle}
              aria-label={scaleButtonTitle}
              id="export-canvas-scale"
              checked={s === appState.exportScale}
              onChange={() => updateData(s)}
            />
          );
        })}
      </>
    );
  },
});

export const actionChangeExportBackground = register({
  name: "changeExportBackground",
  trackEvent: { category: "export", action: "toggleBackground" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportBackground: value },
      commitToHistory: false,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <CheckboxItem
      checked={appState.exportBackground}
      onChange={(checked) => updateData(checked)}
    >
      {t("imageExportDialog.label.withBackground")}
    </CheckboxItem>
  ),
});

export const actionChangeExportEmbedScene = register({
  name: "changeExportEmbedScene",
  trackEvent: { category: "export", action: "embedScene" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportEmbedScene: value },
      commitToHistory: false,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <CheckboxItem
      checked={appState.exportEmbedScene}
      onChange={(checked) => updateData(checked)}
    >
      {t("imageExportDialog.label.embedScene")}
      <Tooltip label={t("imageExportDialog.tooltip.embedScene")} long={true}>
        <div className="excalidraw-tooltip-icon">{questionCircle}</div>
      </Tooltip>
    </CheckboxItem>
  ),
});

export const actionSaveToActiveFile = register({
  name: "saveToActiveFile",
  trackEvent: { category: "export" },
  predicate: (elements, appState, props, app) => {
    return (
      !!app.props.UIOptions.canvasActions.saveToActiveFile &&
      !!appState.fileHandle &&
      !appState.viewModeEnabled
    );
  },
  perform: async (elements, appState, value, app) => {
    const fileHandleExists = !!appState.fileHandle;

    try {
      const { fileHandle } = isImageFileHandle(appState.fileHandle)
        ? await resaveAsImageWithScene(elements, appState, app.files)
        : await saveAsJSON(elements, appState, app.files);

      return {
        commitToHistory: false,
        appState: {
          ...appState,
          fileHandle,
          toast: fileHandleExists
            ? {
                message: fileHandle?.name
                  ? t("toast.fileSavedToFilename").replace(
                      "{filename}",
                      `"${fileHandle.name}"`,
                    )
                  : t("toast.fileSaved"),
              }
            : null,
        },
      };
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error(error);
      } else {
        console.warn(error);
      }
      return { commitToHistory: false };
    }
  },
  keyTest: (event) =>
    event.key === KEYS.S && event[KEYS.CTRL_OR_CMD] && !event.shiftKey,
});

export const actionSaveFileToDisk = register({
  name: "saveFileToDisk",
  viewMode: true,
  trackEvent: { category: "export" },
  perform: async (elements, appState, value, app) => {
    try {
      const { fileHandle } = await saveAsJSON(
        elements,
        {
          ...appState,
          fileHandle: null,
        },
        app.files,
      );
      return {
        commitToHistory: false,
        appState: {
          ...appState,
          openDialog: null,
          fileHandle,
          toast: { message: t("toast.fileSaved") },
        },
      };
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error(error);
      } else {
        console.warn(error);
      }
      return { commitToHistory: false };
    }
  },
  keyTest: (event) =>
    event.key === KEYS.S && event.shiftKey && event[KEYS.CTRL_OR_CMD],
  PanelComponent: ({ updateData }) => (
    <ToolButton
      type="button"
      icon={saveAs}
      title={t("buttons.saveAs")}
      aria-label={t("buttons.saveAs")}
      showAriaLabel={useDevice().editor.isMobile}
      hidden={!nativeFileSystemSupported}
      onClick={() => updateData(null)}
      data-testid="save-as-button"
    />
  ),
});

export const actionAIDesign = register({
  name: "AIDesign",
  viewMode: true,
  trackEvent: { category: "export" },
  perform: async (elements, appState, _value, app) => {
    if (!app.canvas || app.OpenAIAPIKey === null) {
      return {
        commitToHistory: false,
      };
    }
    const exportElements = prepareElementsForExport(
      elements,
      {
        selectedElementIds: appState.selectedElementIds,
      },
      true,
    );
    const canvas = await exportToCanvas(
      exportElements.exportedElements,
      appState,
      app.files,
      {
        exportBackground: true,
        viewBackgroundColor: "white",
        exportingFrame: exportElements.exportingFrame,
      },
    );
    const data_url = canvas.toDataURL() as DataURL;
    async function dummy() {
      const params: {
        image: DataURL;
        apiKey: string;
        text: string;
        apiEndpoint?: string;
        model?: string;
        mode?: "maker";
      } = {
        image: data_url,
        apiKey: app.OpenAIAPIKey as string,
        text: "",
        mode: "maker",
      };
      const endpoint = localStorage.getItem("AIENDPOINT") as string;
      if (endpoint !== null) {
        params.apiEndpoint = endpoint;
      }
      const model = localStorage.getItem("AIMODEL") as string;
      if (model !== null) {
        params.model = model;
      }
      const res = await askAI(params);
      if (!res.ok) {
        return false;
      }
      const raw_string = res.choices[0].message.content as string;
      const html_string = raw_string.slice(
        raw_string.indexOf("<html"),
        raw_string.indexOf("</html>") + 7,
      );
      const demo_blob = new Blob([html_string], { type: "text/html" });
      const demo_url = URL.createObjectURL(demo_blob);
      const demo_iframe = `<iframe src="${demo_url}" width="100%" height="600px"></iframe>`;
      const stringify_html_string = `\`\`\`html\n${html_string}\n\`\`\``;
      const template = `<!doctypehtml> <html lang=en> <head> <meta charset=UTF-8> <meta content="width=device-width,initial-scale=1"name=viewport> <title>AI解答</title> <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script> <script src=https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js async id=MathJax-script></script> <script>window.MathJax={tex:{inlineMath:[["$","$"],["\\(","\\)"]]}}</script> <script src=https://cdn.jsdelivr.net/npm/marked/marked.min.js></script> <link href=https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/default.min.css rel=stylesheet> <script src=https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/highlight.min.js></script> <style>body{font-family:Arial,sans-serif;margin:20px} .container{max-width:800px;margin:0 auto;padding:20px}</style> </head> <body>
<div class=container><img src=${JSON.stringify(data_url)} width=400 /></div>
<div class=container>${demo_iframe}</div>
<div class=container id=output></div> <script>
const content = ${JSON.stringify(encodeURI(stringify_html_string))};
        function renderContent() {
            const renderedMarkdown = marked.parse(decodeURI(content));
            document.getElementById('output').innerHTML = renderedMarkdown;
            MathJax.typeset();
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        }
        document.addEventListener('DOMContentLoaded', renderContent); </script>`;
      const blob = new Blob([template], { type: "text/html" });
      const blobURL = URL.createObjectURL(blob);
      const iframeString = `<iframe src="${blobURL}" width="100%" height="500px"></iframe>`;
      const modal = notifier.modal(iframeString) as any;
      const element = modal.el.children[0] as HTMLElement;
      element.style.minWidth = "80%";
      // if (window.confirm("是否顯示答案？")) {
      //   window.open(blobURL, "_blank");
      // }
    }
    await notifier.asyncBlock(dummy());
    return {
      commitToHistory: false,
      appState: {
        ...appState,
        openDialog: null,
        toast: { message: "查詢成功" },
      },
    };
  },
  PanelComponent: ({ updateData }) => (
    <ToolButton
      type="button"
      icon={saveAs}
      title="AI幫我設計"
      aria-label="AI幫我設計"
      showAriaLabel={useDevice().editor.isMobile}
      hidden={!nativeFileSystemSupported}
      onClick={() => updateData(null)}
    />
  ),
  contextItemLabel: "labels.ai_make",
});
export const actionAskAI = register({
  name: "askAI",
  viewMode: true,
  trackEvent: { category: "export" },
  perform: async (elements, appState, _value, app) => {
    if (!app.canvas || app.OpenAIAPIKey === null) {
      return {
        commitToHistory: false,
      };
    }
    const exportElements = prepareElementsForExport(
      elements,
      {
        selectedElementIds: appState.selectedElementIds,
      },
      true,
    );
    const canvas = await exportToCanvas(
      exportElements.exportedElements,
      appState,
      app.files,
      {
        exportBackground: true,
        viewBackgroundColor: "white",
        exportingFrame: exportElements.exportingFrame,
      },
    );
    const data_url = canvas.toDataURL() as DataURL;
    async function dummy() {
      const params: {
        image: DataURL;
        apiKey: string;
        text: string;
        apiEndpoint?: string;
        model?: string;
      } = {
        image: data_url,
        apiKey: app.OpenAIAPIKey as string,
        text: "",
      };
      const endpoint = localStorage.getItem("AIENDPOINT") as string;
      if (endpoint !== null) {
        params.apiEndpoint = endpoint;
      }
      const model = localStorage.getItem("AIMODEL") as string;
      if (model !== null) {
        params.model = model;
      }
      const res = await askAI(params);
      if (!res.ok) {
        return false;
      }
      const template = `<!doctypehtml> <html lang=en> <head> <meta charset=UTF-8> <meta content="width=device-width,initial-scale=1"name=viewport> <title>AI解答</title> <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script> <script src=https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js async id=MathJax-script></script> <script>window.MathJax={tex:{inlineMath:[["$","$"],["\\(","\\)"]]}}</script> <script src=https://cdn.jsdelivr.net/npm/marked/marked.min.js></script> <link href=https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/default.min.css rel=stylesheet> <script src=https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/highlight.min.js></script> <style>body{font-family:Arial,sans-serif;margin:20px} .container{max-width:800px;margin:0 auto;padding:20px}</style> </head> <body>
<div class=container><img src=${JSON.stringify(data_url)} width=800 /></div>
<div class=container id=output></div> <script>
const content = ${JSON.stringify(res.choices[0].message.content)};
        function renderContent() {
            const renderedMarkdown = marked.parse(content);
            document.getElementById('output').innerHTML = renderedMarkdown;
            MathJax.typeset();
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        }
        document.addEventListener('DOMContentLoaded', renderContent); </script>`;
      const blob = new Blob([template], { type: "text/html" });
      const blobURL = URL.createObjectURL(blob);
      const iframeString = `<iframe src="${blobURL}" width="100%" height="500px"></iframe>`;
      const modal = notifier.modal(iframeString) as any;
      const element = modal.el.children[0] as HTMLElement;
      element.style.minWidth = "80%";
      // if (window.confirm("是否顯示答案？")) {
      //   window.open(blobURL, "_blank");
      // }
    }
    await notifier.asyncBlock(dummy());
    return {
      commitToHistory: false,
      appState: {
        ...appState,
        openDialog: null,
        toast: { message: "查詢成功" },
      },
    };
  },
  PanelComponent: ({ updateData }) => (
    <ToolButton
      type="button"
      icon={saveAs}
      title="詢問AI老師"
      aria-label="詢問AI老師"
      showAriaLabel={useDevice().editor.isMobile}
      hidden={!nativeFileSystemSupported}
      onClick={() => updateData(null)}
    />
  ),
  contextItemLabel: "labels.ai",
});

export const actionSavePDFToDisk = register({
  name: "savePDFToDisk",
  viewMode: true,
  trackEvent: { category: "export" },
  perform: async (elements, appState, _value, app) => {
    try {
      const tempFunc = async (): Promise<Blob> => {
        const frames = app.scene.getNonDeletedFrames();
        const pdfDoc = await PDFDocument.create();
        for (const frame of frames) {
          const exportElements = prepareElementsForExport(
            elements,
            {
              selectedElementIds: {
                [frame.id]: true,
              },
            },
            true,
          );
          const canvas = await exportToCanvas(
            exportElements.exportedElements,
            appState,
            app.files,
            {
              exportBackground: true,
              viewBackgroundColor: "white",
              exportingFrame: exportElements.exportingFrame,
            },
          );
          const blob = await canvasToBlob(canvas, {
            type: "image/jpeg",
            quality: 0.85,
          });
          const imageBuffer = await blob.arrayBuffer();
          const page = pdfDoc.addPage();
          const width = page.getWidth();
          const height = page.getHeight();
          const embedImage = await pdfDoc.embedJpg(imageBuffer);
          const scale = embedImage.scaleToFit(width, height);
          page.drawImage(embedImage, { ...scale });
        }
        const data = await pdfDoc.save();
        const blob = new Blob([data], { type: "application/pdf" });
        return blob;
      };
      let blob: Blob;
      await notifier.asyncBlock(
        tempFunc(),
        (res) => (blob = res as Blob),
        "匯出發生錯誤！",
        "整理資料中...",
      );
      await new Promise((resolve, reject) => {
        notifier.confirm(
          "確定匯出檔案？",
          () => {
            fileSave(blob, {
              name: appState.name,
              extension: "pdf",
              description: "匯出pdf檔案",
              fileHandle: null,
            })
              .then(resolve)
              .catch(reject);
          },
          () => {
            reject("取消匯出檔案");
          },
        );
      });
      return {
        commitToHistory: false,
        appState: {
          ...appState,
          openDialog: null,
          toast: { message: "PDF檔案匯出成功" },
        },
      };
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error(error);
      } else {
        console.warn(error);
      }
      return { commitToHistory: false };
    }
  },
  PanelComponent: ({ updateData }) => (
    <ToolButton
      type="button"
      icon={saveAs}
      title="匯出PDF檔案"
      aria-label="匯出PDF檔案"
      showAriaLabel={useDevice().editor.isMobile}
      hidden={!nativeFileSystemSupported}
      onClick={() => updateData(null)}
    />
  ),
});

export const actionLoadScene = register({
  name: "loadScene",
  trackEvent: { category: "export" },
  predicate: (elements, appState, props, app) => {
    return (
      !!app.props.UIOptions.canvasActions.loadScene && !appState.viewModeEnabled
    );
  },
  perform: async (elements, appState, _, app) => {
    try {
      const {
        elements: loadedElements,
        appState: loadedAppState,
        files,
      } = await loadFromJSON(appState, elements);
      return {
        elements: loadedElements,
        appState: loadedAppState,
        files,
        commitToHistory: true,
      };
    } catch (error: any) {
      if (error?.name === "AbortError") {
        console.warn(error);
        return false;
      }
      return {
        elements,
        appState: { ...appState, errorMessage: error.message },
        files: app.files,
        commitToHistory: false,
      };
    }
  },
  keyTest: (event) => event[KEYS.CTRL_OR_CMD] && event.key === KEYS.O,
});

export const actionExportWithDarkMode = register({
  name: "exportWithDarkMode",
  trackEvent: { category: "export", action: "toggleTheme" },
  perform: (_elements, appState, value) => {
    return {
      appState: { ...appState, exportWithDarkMode: value },
      commitToHistory: false,
    };
  },
  PanelComponent: ({ appState, updateData }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "-45px",
        marginBottom: "10px",
      }}
    >
      <DarkModeToggle
        value={appState.exportWithDarkMode ? THEME.DARK : THEME.LIGHT}
        onChange={(theme: Theme) => {
          updateData(theme === THEME.DARK);
        }}
        title={t("imageExportDialog.label.darkMode")}
      />
    </div>
  ),
});
