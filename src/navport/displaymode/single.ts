import { Projector } from "parsegraph-projector";
import { showInCamera } from "parsegraph-showincamera";
import Navport from "../Navport";
import { BasicGLProvider } from "parsegraph-compileprogram";
import MenulessViewportDisplayMode from "./menuless";

export default class SingleScreenViewportDisplayMode extends MenulessViewportDisplayMode {
  render(proj: Projector, nav: Navport) {
    const viewport = nav;
    const cam = viewport.camera();
    const size = viewport.root().value().getLayout().extentSize();
    proj.glProvider().container().style.display = "inline-block";
    let needsUpdate = false;
    if (size.width() > 0 && size.height() > 0) {
      if (cam.setSize(size.width(), size.height())) {
        (proj.glProvider() as BasicGLProvider).setExplicitSize(
          size.width(),
          size.height()
        );
        needsUpdate = true;
      }
      showInCamera(viewport.root(), cam, false);
    } else {
      needsUpdate = true;
      viewport.scheduleRepaint();
    }
    return needsUpdate;
  }
}

export const navportSingle = (navport: Navport) => {
  navport.setDisplayMode(new SingleScreenViewportDisplayMode());
};
