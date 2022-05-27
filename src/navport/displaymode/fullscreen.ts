import SplittingViewportDisplayMode from "./split";
import { Projector } from "parsegraph-projector";
import Navport from "../Navport";
import { showInCamera } from "parsegraph-showincamera";

export default class FullscreenViewportDisplayMode extends SplittingViewportDisplayMode {
  render(proj: Projector, nav: Navport) {
    const cam = nav.camera();
    cam.setSize(proj.width(), proj.height());
    let needsUpdate = false;
    proj.glProvider().container().style.width = "100%";
    proj.glProvider().container().style.height = "100%";
    if (nav.focusedNode() && nav.focusedNode().value()) {
      if (nav._cameraFilter.getRequiredScale() != nav.getRequiredScale()) {
        nav._cameraFilter.restart();
      } else if (
        !cam.containsAll(
          nav.focusedNode().value().getLayout().absoluteSizeRect()
        ) &&
        !nav._cameraFilter.animating()
      ) {
        nav._cameraFilter.restart();
      } else {
        // console.log("Focused node is visible on screen");
      }
      if (nav._cameraFilter.render()) {
        nav.scheduleRender();
        needsUpdate = true;
      }
    } else if (nav.root() && nav.root().value()) {
      const size = nav.root().value().getLayout().extentSize();
      if (size.width() > 0 && size.height() > 0) {
        showInCamera(nav.root(), cam, false);
      }
    }

    return needsUpdate;
  }
}

export const navportFullscreen = (navport: Navport) => {
  navport.setDisplayMode(new FullscreenViewportDisplayMode());
};
