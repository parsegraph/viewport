import { Direction, Alignment } from "parsegraph-direction";
import { PaintedNode } from "parsegraph-artist";
import Navport from "./Navport";
import AnimatedSpotlight from "parsegraph-animatedspotlight";
import { Projector } from "parsegraph-projector";
import { logc } from "parsegraph-log";

export default class NavportCursor {
  _focusedNode: PaintedNode;
  _nav: Navport;
  _spotlight: AnimatedSpotlight;
  _showSpotlight: boolean;

  constructor(navport: Navport) {
    this._nav = navport;
    this._focusedNode = null;

    this._spotlight = new AnimatedSpotlight();
    this._showSpotlight = false;
  }

  showSpotlight() {
    this._showSpotlight = true;
  }

  hideSpotlight() {
    this._showSpotlight = false;
  }

  isSpotlightShown() {
    return this._showSpotlight;
  }

  spotlight() {
    return this._spotlight;
  }

  nav() {
    return this._nav;
  }

  carousel() {
    return this.nav().carousel();
  }

  focusedNode(): PaintedNode {
    return this._focusedNode;
  }

  camera() {
    return this.nav().camera();
  }

  setFocusedNode(focusedNode: PaintedNode) {
    if (focusedNode === this._focusedNode) {
      return false;
    }
    this._focusedNode = focusedNode;
    if (this._focusedNode) {
      this.nav().focusedNodeChanged();
      this.carousel().clearCarousel();
      this.carousel().hideCarousel();
      this.carousel().scheduleCarouselRepaint();
      this._spotlight.restart(this._focusedNode);
    }
    this.nav().scheduleRepaint();
    return true;
  }

  moveToEnd(dir: Direction): boolean {
    let moved = false;
    while (this.moveFocus(dir)) {
      moved = true;
    }
    return moved;
  }

  moveForwardly(skipHorizontalInward?: boolean, event?: any): boolean {
    let node = this._focusedNode;
    if (!node) {
      return false;
    }
    if (
      node.hasNode(Direction.INWARD) &&
      node.nodeAlignmentMode(Direction.INWARD) != Alignment.INWARD_VERTICAL &&
      !skipHorizontalInward
    ) {
      this.setFocusedNode(node.nodeAt(Direction.INWARD));
      return true;
    }
    let neighbor = node.nodeAt(Direction.FORWARD);
    if (neighbor) {
      this.setFocusedNode(neighbor);
      return true;
    }
    neighbor = node.nodeAt(Direction.OUTWARD);
    if (neighbor) {
      skipHorizontalInward = true;
      node = neighbor;
      return null;
    }
    // Search up the parents hoping that an inward node can be escaped.
    while (true) {
      if (node.isRoot()) {
        // The focused node is not within an inward node.
        return false;
      }
      const pdir = node.parentDirection();
      node = node.nodeAt(pdir);
      if (pdir === Direction.OUTWARD) {
        // Found the outward node to escape.
        skipHorizontalInward = true;
        break;
      }
    }
    // Continue traversing using the found node.
    return true;
  }

  moveInwardly(dir: Direction): boolean {
    return this.moveFocus(dir) || this.moveFocus(Direction.INWARD);
  }

  moveOutwardly(dir: Direction): boolean {
    return this.moveFocus(dir) || this.moveFocus(Direction.OUTWARD);
  }

  moveFocus(dir: Direction): boolean {
    if (!this._focusedNode) {
      return false;
    }
    const neighbor = this._focusedNode.nodeAt(dir);
    if (neighbor) {
      this.setFocusedNode(neighbor);
      return true;
    }
    return false;
  }

  update(_: Date) {
    let needsUpdate = false;
    if (this.focusedNode()) {
      if (this.isSpotlightShown() && this._spotlight.animating()) {
        logc("Schedule Updates", "Cursor needs update");
        needsUpdate = true;
      }
    }
    return needsUpdate;
  }

  paint(projector: Projector) {
    if (
      !this._focusedNode ||
      this._focusedNode.value().getLayout().needsPosition()
    ) {
      return false;
    }

    this._spotlight.paint(projector);
    return false;
  }

  render(proj: Projector) {
    const gl = proj.glProvider().gl();
    if (this.focusedNode()) {
      const layout = this.focusedNode().value().getLayout();
      const ctx = proj.overlay();
      proj.overlay().strokeStyle = "white";
      proj.overlay().lineWidth = 4 * layout.absoluteScale();
      proj.overlay().lineJoin = "round";
      ctx.setLineDash([5 * layout.absoluteScale()]);
      const rect = layout.absoluteSizeRect();
      logc(
        "Rendering",
        "Rendering navport cursor at absolute pos {0}",
        rect.toString()
      );

      logc(
        "Rendering",
        "Navport cursor group size {0}",
        layout.groupSizeRect().toString()
      );
      logc(
        "Rendering",
        "Navport cursor local pos {0}, {1}",
        this.focusedNode().x(),
        this.focusedNode().y()
      );
      proj.overlay().save();
      proj.overlay().resetTransform();
      const sc = this.camera().scale();
      proj.overlay().scale(sc, sc);
      proj.overlay().translate(this.camera().x(), this.camera().y());
      proj
        .overlay()
        .strokeRect(
          rect.x() - rect.width() / 2,
          rect.y() - rect.height() / 2,
          rect.width(),
          rect.height()
        );
      proj.overlay().restore();
    }
    if (this.isSpotlightShown()) {
      gl.enable(gl.BLEND);
      this._spotlight.setWorldTransform(this.camera().project());
      return this._spotlight.render(proj);
    }
    return false;
  }
}
