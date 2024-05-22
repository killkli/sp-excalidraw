import { ExcalidrawImperativeAPI } from "../../src/types";
import { uploadPDFFunction } from "./index";

export function ImportPDF(props: {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}) {
  const { excalidrawAPI } = props;
  if (!excalidrawAPI) return <></>;
  const uploadClick = () => uploadPDFFunction(excalidrawAPI)
  return (
    <button
      style={{
        marginLeft: "0.5rem",
        background: "#70b1ec",
        color: "white",
        borderRadius: "10px",
        borderStyle: "none",
      }}
      onClick={uploadClick}
    >
      上傳PDF檔案
    </button>
  );
}
