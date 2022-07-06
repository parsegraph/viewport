import Navport from "../Navport";
import SplittingViewportDisplayMode from "./split";
import { Projector } from "parsegraph-projector";
import { showInCamera } from "parsegraph-showincamera";

export default class FitInWindowViewportDisplayMode extends SplittingViewportDisplayMode {
  render(proj: Projector, nav: Navport) {
    const viewport = nav;
    const cam = viewport.camera();
    cam.setSize(proj.width(), proj.height());
    const root = viewport.root();
    const size = root.value().getLayout().extentSize();
    const container = proj.glProvider().container();
    container.style.width = "100%";
    container.style.height = "100%";
    let needsUpdate = false;
    if (size.width() > 0 && size.height() > 0) {
      showInCamera(root, cam, false);
    } else {
      needsUpdate = true;
      viewport.scheduleRepaint();
    }
    return needsUpdate;
  }
}

export const navportFitInWindow = (navport: Navport) => {
  navport.setDisplayMode(new FitInWindowViewportDisplayMode());
};
