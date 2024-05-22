import React from "react";
import { MainMenu } from "../../src/packages/excalidraw/index";
import type { ExcalidrawImperativeAPI } from "../../src/types";
import { LanguageList } from "./LanguageList";
import { PagesIcon, helpIcon } from "../../src/components/icons";
import { ImportPDF } from "../importpdf/ImportPDF";

export const AppMainMenu: React.FC<{
  setCollabDialogShown: (toggle: boolean) => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  ExcalidrawAPI: ExcalidrawImperativeAPI | null;
}> = React.memo((props) => {
  const { ExcalidrawAPI, isCollaborating } = props;
  return (
    <MainMenu>
      {isCollaborating ? (
        <button
          style={{
            marginLeft: "0.5rem",
            background: "#70b1ec",
            color: "white",
            borderRadius: "10px",
            borderStyle: "none",
          }}
          onClick={() => {
            window.open("https://ams.boyo.org.tw/boyost/exdraw", "_blank");
          }}
        >
          開啟新共享
        </button>
      ) : (
        <ImportPDF excalidrawAPI={ExcalidrawAPI} />
      )}
      <MainMenu.Item
        onSelect={() => {
          ExcalidrawAPI?.toggleSidebar({ name: "pages" });
        }}
        icon={PagesIcon}
      >
        選取頁面
      </MainMenu.Item>
      <MainMenu.ItemLink
        href="https://www.youtube.com/playlist?list=PL0xKEhydN5PR1QuSrnXYlopaCJUuPkuDr"
        target="_blank"
        icon={helpIcon}
      >
        教學影片
      </MainMenu.ItemLink>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      {props.isCollabEnabled && (
        <MainMenu.DefaultItems.LiveCollaborationTrigger
          isCollaborating={props.isCollaborating}
          onSelect={() => props.setCollabDialogShown(true)}
        />
      )}
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.DefaultItems.Socials />
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme />
      <MainMenu.ItemCustom>
        <LanguageList style={{ width: "100%" }} />
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});
