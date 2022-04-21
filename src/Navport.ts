import Camera from "parsegraph-camera";
import Carousel from "parsegraph-carousel";
import InputController from "./InputController";
import BurgerMenu from "./BurgerMenu";
import CameraFilter from "./CameraFilter";
import { showInCamera } from "parsegraph-showincamera";
import { Projected, Projector } from "parsegraph-projector";
import { PaintedNode } from "parsegraph-artist";
import Method from "parsegraph-method";
import { BasicGLProvider } from "parsegraph-compileprogram";
import Color from 'parsegraph-color';
import {GraphPainter} from "parsegraph-graphpainter";

export const FOCUS_SCALE = 1;

const MIN_SPLIT_THRESHOLD = 800;
const MIN_MENU_THRESHOLD = 400;

export interface ViewportDisplayMode {
  render(projector: Projector, nav: Navport): boolean;
  allowSplit(projector: Projector, nav: Navport): boolean;
  showMenu(projector: Projector, nav: Navport): boolean;
}

abstract class SplittingViewportDisplayMode implements ViewportDisplayMode {
  abstract render(projector: Projector, nav: Navport): boolean;

  allowSplit(projector: Projector): boolean {
    return projector.width() > MIN_SPLIT_THRESHOLD;
  }

  showMenu(projector: Projector): boolean {
    return projector.width() > MIN_MENU_THRESHOLD;
  }
}

export class FullscreenViewportDisplayMode extends SplittingViewportDisplayMode {
  render(proj: Projector, nav: Navport) {
    const cam = nav.camera();
    let needsUpdate = false;
    proj.glProvider().container().style.width = "100%";
    proj.glProvider().container().style.height = "100%";
    if (nav._nodeShown) {
      if (nav._cameraFilter.getRequiredScale() != nav.getRequiredScale()) {
        nav._cameraFilter.restart();
      } else if (
        !cam.containsAll(
          nav._nodeShown.value().getLayout().absoluteSizeRect()
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
    } else {
      const size = nav.root().value().getLayout().extentSize();
      if (size.width() > 0 && size.height() > 0) {
        showInCamera(nav.root(), cam, false);
      }
    }

    return needsUpdate;
  }
}

abstract class MenulessViewportDisplayMode implements ViewportDisplayMode {
  allowSplit(): boolean {
    return false;
  }

  showMenu(): boolean {
    return false;
  }

  abstract render(proj: Projector, viewport: Navport): boolean;
}

export class SingleScreenViewportDisplayMode extends MenulessViewportDisplayMode {
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

export class FixedWidthViewportDisplayMode extends SplittingViewportDisplayMode {
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

export class FitInWindowViewportDisplayMode extends SplittingViewportDisplayMode {
  render(proj: Projector, nav: Navport) {
    const viewport = nav;
    const cam = viewport.camera();
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
/*
 * TODO Add gridX and gridY camera listeners, with support for loading from an
 * infinite grid of cells.
 *
 * TODO Add camera-movement listener, to let nodes watch for camera movement,
 * and thus let nodes detect when they are approaching critical screen
 * boundaries:
 *
 * enteringScreen leavingScreen
 *
 * Node distance is radially calculated (using the viewport's diagonal) from
 * the camera's center, adjusted by some constant.
 *
 * hysteresis factor gives the +/- from some preset large distance (probably
 * some hundreds of bud radiuses). Ignoring hysteresis, then when the camera
 * moves, the node's relative position may be changed. This distance is
 * recalculated, and if it is above some threshold plus hysteresis constant,
 * and the node's state was 'near', then the node's leavingScreen is called,
 * and the node's state is set to 'far'.
 *
 * Likewise, if the distance is lower than the same threshold minus hysteresis
 * constant, and the node's state was 'far', then the node's enteringScreen is
 * called, and the node's state is set to 'near'.
 *
 * This distance is checked when the node is painted and also when the camera
 * is moved.
 *
 * TODO Figure out how changing the grid size might change things.
 *
 * Grid updates based only on camera movement. Updates are reported in terms of
 * cells made visible in either direction.  The number of potentially visible
 * grid cells is determined for each axis using the camera's axis size
 * adjusted by some constant.
 */
export default class Navport implements Projected {
  _root: PaintedNode;
  _painter: GraphPainter;
  _camera: Camera;
  _cameraFilter: CameraFilter;
  _carousel: Carousel;
  _input: InputController;
  _menu: BurgerMenu;
  _renderedMouse: number;
  _needsRender: boolean;
  _focusScale: number;
  _focusedNode: PaintedNode;
  _backgroundColor: Color;
  _nodeShown: PaintedNode;
  _needsRepaint: boolean;
  _displayMode: ViewportDisplayMode;
  _update: Method;
  _cursor: string;

  setCursor(cur: string): void {
    this._cursor = cur;
  }

  scheduleUpdate() {
    this._update.call();
  }

  setOnScheduleUpdate(func: Function, obj?: object) {
    this._update.set(func, obj);
  }

  constructor(
    root: PaintedNode,
    backgroundColor: Color = new Color(0, 0, 0, 1)
  ) {
    // Construct the graph.
    this._update = new Method();
    this._backgroundColor = backgroundColor;
    this._root = root;
    this._painter = new GraphPainter(root, this._camera);
    this._displayMode = new FullscreenViewportDisplayMode();
    this._camera = new Camera();
    this._cameraFilter = new CameraFilter(this);
    this._input = new InputController(this);
    this._carousel = new Carousel(this.camera());
    this._carousel.setOnScheduleRepaint(this.scheduleRepaint, this);

    this._menu = new BurgerMenu(this);

    // this._piano = new AudioKeyboard(this._camera);
    this._renderedMouse = -1;
    this._needsRender = true;

    this._focusScale = FOCUS_SCALE;
  }

  width() {
    return this.camera().width();
  }

  height() {
    return this.camera().height();
  }

  setDisplayMode(displayMode: ViewportDisplayMode) {
    this._displayMode = displayMode;
  }

  setSingleScreen(single: boolean) {
    this._displayMode = single
      ? new SingleScreenViewportDisplayMode()
      : new FullscreenViewportDisplayMode();
    this._menu.showSplit(!single);
  }

  setFixedWidth(w: number, h: number) {
    this.setDisplayMode(new FixedWidthViewportDisplayMode(w, h));
  }

  fitInWindow() {
    this.setDisplayMode(new FitInWindowViewportDisplayMode());
  }

  displayMode() {
    return this._displayMode;
  }

  handleEvent(eventType: string, eventData: any, proj: Projector): boolean {
    // console.log(eventType, eventData);
    if (eventType === "blur") {
      this._menu.closeMenu();
      return true;
    }
    if (eventType === "wheel") {
      return this._input.onWheel(eventData);
    }
    if (eventType === "touchmove") {
      return this._input.onTouchmove(eventData, proj);
    }
    if (eventType === "touchzoom") {
      return this._input.onTouchzoom(eventData);
    }
    if (eventType === "touchstart") {
      this._nodeShown = null;
      return this._input.onTouchstart(eventData);
    }
    if (eventType === "touchend") {
      return this._input.onTouchend(eventData);
    }
    if (eventType === "mousedown") {
      return this._input.onMousedown(eventData);
    }
    if (eventType === "mousemove") {
      return this._input.onMousemove(eventData, proj);
    }
    if (eventType === "mouseup") {
      return this._input.onMouseup(eventData);
    }
    if (eventType === "keydown") {
      return this._input.onKeydown(eventData);
    }
    if (eventType === "keyup") {
      return this._input.onKeyup(eventData);
    }
    console.log("Unhandled event type: " + eventType);
    return false;
  }

  tick(startDate: number): boolean {
    return this._input.update(new Date(startDate));
  }

  _unmount: () => void;

  unmount() {
    if (this._unmount) {
      this._unmount();
      this._unmount = null;
    }
  }

  carousel() {
    return this._carousel;
  }

  menu() {
    return this._menu;
  }

  camera() {
    return this._camera;
  }

  input() {
    return this._input;
  }

  dispose() {
    this._menu.dispose();
  }

  scheduleRepaint() {
    // console.log("Viewport is scheduling repaint");
    this.scheduleUpdate();
    this._needsRepaint = true;
    this._needsRender = true;
  }

  scheduleRender() {
    // console.log("Viewport is scheduling render");
    this.scheduleUpdate();
    this._needsRender = true;
  }

  needsRepaint() {
    return (
      this._needsRepaint ||
      (this._carousel.isCarouselShown() && this._carousel.needsRepaint()) ||
      this._input.updateRepeatedly()
    );
  }

  needsRender() {
    return (
      this.needsRepaint() ||
      this._cameraFilter.animating() ||
      this._needsRender ||
      this._renderedMouse !== this.input().mouseVersion()
    );
  }

  root() {
    return this._root;
  }

  setRoot(root: PaintedNode) {
    if (this._root === root) {
      return;
    }
    this._root = root;
    this.scheduleUpdate();
  }

  plot(node: PaintedNode) {
    return this.setRoot(node);
  }

  /*
   * Paints the graph up to the given time, in milliseconds.
   *
   * Returns true if the graph completed painting.
   */
  paint(projector: Projector, timeout?: number) {
    const gl = projector.glProvider().gl();
    if (gl.isContextLost()) {
      return false;
    }
    if (!this.needsRepaint()) {
      // console.log("No need to paint; viewport is not dirty for window " + window.id());
      return false;
    }

    let needsUpdate = this.carousel().paint(projector, timeout);
    needsUpdate = this._painter.paint(projector, timeout) || needsUpdate;

    this._input.paint(projector);
    // this._piano.paint();
    if (needsUpdate) {
      this.scheduleRepaint();
    } else {
      this._needsRepaint = false;
    }
    this._needsRender = true;
    return needsUpdate;
  }

  mouseVersion() {
    return this._renderedMouse;
  }

  showInCamera(node: PaintedNode) {
    const noPrior = !this._nodeShown;
    this._nodeShown = node;
    this._input.setFocusedNode(node);
    if (noPrior && node) {
      this._cameraFilter.restart();
      this._cameraFilter.finish();
    }
    this.scheduleRender();
  }

  backgroundColor(): Color {
    return this._backgroundColor;
  }

  setBackgroundColor(color: Color) {
    this._backgroundColor = color;
    this.scheduleRender();
  }

  setFocusScale(scale: number) {
    // console.log("Focus scale is changing: " + scale);
    this._focusScale = scale;
    this.scheduleRender();
  }

  getFocusScale() {
    // console.log("Reading focus scale: " + this._focusScale);
    return this._focusScale;
  }

  getRequiredScale() {
    return (
      this.getFocusScale() / this._nodeShown.value().getLayout().absoluteScale()
    );
  }

  cameraFilter() {
    return this._cameraFilter;
  }

  private renderBackground(projector: Projector) {
    const hasGL = projector.glProvider()?.hasGL();
    const container = projector.glProvider().container();
    if (container.style.backgroundColor != this.backgroundColor().asRGBA()) {
      container.style.backgroundColor = this.backgroundColor().asRGBA();
    }
    if (hasGL) {
      // console.log("Rendering GL background");
      const gl = projector.glProvider().gl();
      const bg = this.backgroundColor();
      gl.viewport(0, 0, projector.width(), projector.height());
      gl.clearColor(bg.r(), bg.g(), bg.b(), bg.a());
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    if (projector.hasOverlay()) {
      // console.log("Rendering canvas background");
      const overlay = projector.overlay();
      overlay.textBaseline = "top";
      overlay.fillStyle = this.backgroundColor().asRGBA();
      overlay.clearRect(0, 0, projector.width(), projector.height());
    }
    if (projector.hasDOMContainer()) {
      // console.log("Rendering DOM background");
    }
  }

  render(projector: Projector): boolean {
    // width: number, height: number, avoidIfPossible: boolean): boolean {
    const gl = projector.glProvider().gl();
    if (gl.isContextLost()) {
      return false;
    }

    let needsUpdate = this._displayMode.render(projector, this);

    this.renderBackground(projector);
    const overlay = projector.overlay();
    overlay.textBaseline = "top";

    needsUpdate = this._painter.render(projector) || needsUpdate;
    if (needsUpdate) {
      // logc("World was rendered dirty.");
      this.scheduleRender();
    }

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (this._input.render(projector)) {
      this.scheduleRender();
    }
    // this._piano.render(world, cam.scale());
    if (!projector.isOffscreen()) {
      this._carousel.render(projector);
      if (this._displayMode.showMenu(projector, this)) {
        this._menu.showSplit(this._displayMode.allowSplit(projector, this));
        this._menu.paint(projector);
        this._menu.render(projector);
      }
    }
    this._renderedMouse = this.input().mouseVersion();
    if (!needsUpdate) {
      this._needsRender = this._needsRepaint;
    }

    return needsUpdate;
  }
}
