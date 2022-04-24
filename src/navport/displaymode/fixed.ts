import Navport from "../Navport";
import SplittingViewportDisplayMode from "./split";
import { Projector } from "parsegraph-projector";
import { showInCamera } from "parsegraph-showincamera";
import { BasicGLProvider } from "parsegraph-compileprogram";

export default class FixedWidthViewportDisplayMode extends SplittingViewportDisplayMode {
  _w: number;
  _h: number;

  constructor(w: number, h: number) {
    super();
    this._w = w;
    this._h = h;
  }

  render(proj: Projector, nav: Navport) {
    const viewport = nav;
    const cam = viewport.camera();
    const root = viewport.root();
    const size = root.value().getLayout().extentSize();
    const container = proj.glProvider().container();
    container.style.display = "inline-block";
    container.style.width = this._w + "px";
    container.style.height = this._h + "px";
    let needsUpdate = false;
    if (size.width() > 0 && size.height() > 0) {
      if (cam.setSize(this._w, this._h)) {
        (proj.glProvider() as BasicGLProvider).setExplicitSize(
          this._w,
          this._h
        );
        needsUpdate = true;
      }
      showInCamera(root, cam, false);
    } else {
      needsUpdate = true;
      viewport.scheduleRepaint();
    }
    return needsUpdate;
  }
}

export const navportFixedWidth = (navport: Navport, w: number, h: number) => {
  navport.setDisplayMode(new FixedWidthViewportDisplayMode(w, h));
};
