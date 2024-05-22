import { ExcalidrawImperativeAPI } from "../../src/types";
import { ExcalidrawFrameElement } from "../../src/element/types";

export const RenderFramesButtons = (props: {
  ExcalidrawAPI: ExcalidrawImperativeAPI | null;
}) => {
  const excalidrawAPI = props.ExcalidrawAPI;
  if (!excalidrawAPI) return <></>;
  const temp_elements = excalidrawAPI
    .getSceneElements()
    .filter((e) => e.type === "frame") as ExcalidrawFrameElement[];

  const elements = temp_elements.sort(
    (a, b) => a.name?.localeCompare(b.name || "") || 0,
  );

  const handleClick = (index: number) => {
    console.log(
      "Selected frame:",
      elements[index].name || "頁面 " + (index + 1),
    );
    // excalidrawAPI.scrollToContent(elements[index], {
    //   fitToViewport: true,
    // });
    const action = excalidrawAPI.actionManager.actions["zoomToFrame"]
    excalidrawAPI.actionManager.executeAction(action, undefined, elements[index])
  };

  const buttonStyle = {
    padding: "10px",
    margin: "5px",
    border: "1px solid #ccc",
    borderRadius: "5px",
    display: "block", // Use 'inline-block' if you want the buttons to be inline
    fontSize: "16px",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div
      style={{ overflowX: "hidden", maxHeight: "100vh", overflowY: "scroll" }}
    >
      {elements.map((e, i) => (
        <button key={i} onClick={() => handleClick(i)} style={buttonStyle}>
          {e.name || "頁面 " + (i + 1)}{" "}
        </button>
      ))}
    </div>
  );
};
