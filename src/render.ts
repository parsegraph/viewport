import TimingBelt from "parsegraph-timingbelt";
import {
  Projector,
  BasicProjector,
  Projected,
  Projection,
} from "parsegraph-projector";
import Viewport from "./navport/Navport";
import { PaintedNode } from "parsegraph-artist";
import SingleScreenViewportDisplayMode from "./navport/displaymode/single";
import FullscreenViewportDisplayMode from "./navport/displaymode/fullscreen";
import FixedWidthViewportDisplayMode from "./navport/displaymode/fixed";
import FitInWindowViewportDisplayMode from "./navport/displaymode/fit";
import Color from "parsegraph-color";

export default function render(
  container: Element,
  projected: Projected,
  projector: Projector = new BasicProjector(),
  belt: TimingBelt = new TimingBelt()
): () => void {
  container.appendChild(projector.container());
  new ResizeObserver(() => {
    belt.scheduleUpdate();
  }).observe(projector.container());

  const projection = new Projection(projector, projected);
  belt.addRenderable(projection);

  return () => {
    projection.unmount();
    belt.removeRenderable(projection);
    projector.container().remove();
  };
}

export function renderFullscreen(
  container: Element,
  root: PaintedNode,
  bg: Color
) {
  return render(
    container,
    new Viewport(new FullscreenViewportDisplayMode(), root, bg)
  );
}

export function renderSingleScreen(
  container: Element,
  root: PaintedNode,
  bg: Color
) {
  return render(
    container,
    new Viewport(new SingleScreenViewportDisplayMode(), root, bg)
  );
}

export function renderFixedWidth(
  container: Element,
  root: PaintedNode,
  w: number,
  h: number,
  bg: Color
) {
  return render(
    container,
    new Viewport(new FixedWidthViewportDisplayMode(w, h), root, bg)
  );
}

export function renderFitInWindow(
  container: Element,
  root: PaintedNode,
  bg: Color
) {
  return render(
    container,
    new Viewport(new FitInWindowViewportDisplayMode(), root, bg)
  );
}
