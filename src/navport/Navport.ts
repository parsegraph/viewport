import Camera from "parsegraph-camera";
import { Carousel } from "../carousel";
import InputController from "./InputController";
import BurgerMenu from "./BurgerMenu";
import CameraFilter from "./CameraFilter";
import { BasicProjector, Projected, Projector } from "parsegraph-projector";
import { PaintedNode } from "parsegraph-artist";
import Method from "parsegraph-method";
import Color from "parsegraph-color";
import { GraphPainter } from "parsegraph-graphpainter";
import FullscreenViewportDisplayMode from "./displaymode/fullscreen";
import NavportWebOverlay from "./NavportWebOverlay";
import log, { logc } from "parsegraph-log";
import { Layout } from "parsegraph-layout";
import { showNodeInCamera } from "parsegraph-showincamera";

export const FOCUS_SCALE = 2;

export const MIN_CAMERA_SCALE = 0.00125;

export interface ViewportDisplayMode {
  render(projector: Projector, nav: Navport): boolean;
  allowSplit(projector: Projector, nav: Navport): boolean;
  showMenu(projector: Projector, nav: Navport): boolean;
}
export default class Navport implements Projected {
  _root: PaintedNode;
  _painter: GraphPainter;
  _camera: Camera;
  _cameraFilter: CameraFilter;
  _carousel: Carousel;
  _webOverlay: NavportWebOverlay;
  _input: InputController;
  _menu: BurgerMenu;
  _renderedMouse: number;
  _needsRender: boolean;
  _focusScale: number;
  _backgroundColor: Color;
  _needsRepaint: boolean;
  _displayMode: ViewportDisplayMode;
  _update: Method;
  _cursor: string;
  _inputLayer: Map<Projector, Projector>;
  _unmount: () => void;
  _recenter: boolean;

  constructor(
    displayMode: ViewportDisplayMode = new FullscreenViewportDisplayMode(),
    root?: PaintedNode,
    backgroundColor: Color = new Color(149 / 255, 149 / 255, 149 / 255, 1)
  ) {
    // Construct the graph.
    this._update = new Method();
    this._backgroundColor = backgroundColor;
    this._root = root;
    this._recenter = false;
    this._camera = new Camera();
    this._painter = new GraphPainter(root, this._camera);
    this._displayMode = displayMode;
    this._cameraFilter = new CameraFilter(this);
    this._input = new InputController(this);
    this._carousel = new Carousel(new Camera());
    this._carousel.setOnScheduleRepaint(this.scheduleRepaint, this);
    this._webOverlay = new NavportWebOverlay(0.85);

    this._inputLayer = new Map();

    this._menu = new BurgerMenu(this);

    // this._piano = new AudioKeyboard(this._camera);
    this._renderedMouse = -1;
    this._needsRender = true;

    this._focusScale = FOCUS_SCALE;

    this._unmount = null;
  }

  lastMouseX() {
    return this.input().mouse().lastMouseX();
  }

  lastMouseY() {
    return this.input().mouse().lastMouseY();
  }

  setCursor(cur: string): void {
    this._cursor = cur;
  }

  scheduleUpdate() {
    this._update.call();
  }

  setOnScheduleUpdate(func: Function, obj?: object) {
    this._update.set(func, obj);
  }

  width() {
    return this.camera().width();
  }

  height() {
    return this.camera().height();
  }

  setDisplayMode(displayMode: ViewportDisplayMode) {
    this._displayMode = displayMode;
    this.scheduleRepaint();
  }

  displayMode() {
    return this._displayMode;
  }

  tick(startDate: number): boolean {
    const rv = this._input.update(new Date(startDate));

    if (this.camera().canProject() && this.recenter() && this.focusedNode()) {
      if (
        !this.camera().containsAll(
          (this.focusedNode().value().getLayout() as Layout).absoluteSizeRect()
        )
      ) {
        showNodeInCamera(this.focusedNode(), this.camera());
      }
    }
    this._recenter = false;

    return rv;
  }

  unmount(proj: Projector) {
    if (this._inputLayer.has(proj)) {
      this._inputLayer.get(proj).glProvider().container().remove();
      this._inputLayer.delete(proj);
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

  input(): InputController {
    return this._input;
  }

  dispose() {
    this._menu.dispose();
    if (this._unmount !== null) {
      this._unmount();
      this._unmount = null;
    }
  }

  scheduleRepaint() {
    // console.log("Viewport is scheduling repaint");
    this.scheduleUpdate();
    this._painter.markDirty();
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
      (this._carousel.isCarouselShown() && this._carousel.needsRepaint())
    );
  }

  needsRender() {
    return (
      this.needsRepaint() ||
      this._cameraFilter.animating() ||
      this._needsRender ||
      this._renderedMouse !== this.input().mouse().mouseVersion()
    );
  }

  root(): PaintedNode {
    return this._root;
  }

  web() {
    return this._webOverlay;
  }

  setRoot(root: PaintedNode) {
    if (this._root === root) {
      return;
    }
    this._root = root;
    this._painter.setRoot(this._root);
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
    let needsUpdate = false;
    if (this.needsRepaint()) {
      if (this.focusedNode() && this.focusedNode().root() !== this.root()) {
        this.input().cursor().setFocusedNode(null);
      }
      needsUpdate = this._painter.paint(projector, timeout);

      let inputProj;
      if (!this._inputLayer.has(projector)) {
        inputProj = new BasicProjector();
        const container = inputProj.glProvider().container();
        projector.glProvider().container().appendChild(container);
        container.style.zIndex = "0";
        container.style.left = "0px";
        container.style.top = "0px";
        container.style.right = "0px";
        container.style.bottom = "0px";
        inputProj.glProvider().gl();
        inputProj.overlay();
        this._inputLayer.set(projector, inputProj);
      }
      inputProj = this._inputLayer.get(projector);
      inputProj.glProvider().container().style.position = "absolute";

      needsUpdate = this.carousel().paint(inputProj, timeout) || needsUpdate;
      this._input.paint(inputProj);
      // this._piano.paint();
      needsUpdate = this.web().paint(projector, timeout) || needsUpdate;
    }

    this._needsRender = this._needsRender || this._needsRepaint;
    if (needsUpdate) {
      this.scheduleUpdate();
      this._needsRepaint = true;
    } else {
      this._needsRepaint = false;
    }
    log("Needs a render", this._needsRender, needsUpdate);
    return needsUpdate;
  }

  mouseVersion() {
    return this._renderedMouse;
  }

  focusedNode(): PaintedNode {
    return this._input.focusedNode();
  }

  showInCamera(node: PaintedNode) {
    if (this.focusedNode() === node) {
      return;
    }
    const noPrior = !this.focusedNode();
    this.input().cursor().setFocusedNode(node);
    if (noPrior && node) {
      this._cameraFilter.restart();
      this._cameraFilter.finish();
    }
  }

  focusedNodeChanged() {
    this._recenter = true;
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
      this.getFocusScale() /
      this.focusedNode().value().getLayout().absoluteScale()
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

  recenter() {
    return this._recenter;
  }

  render(projector: Projector): boolean {
    // width: number, height: number, avoidIfPossible: boolean): boolean {
    const overlay = projector.overlay();
    overlay.resetTransform();
    overlay.clearRect(0, 0, projector.width(), projector.height());
    let needsUpdate = this._displayMode?.render(projector, this);
    this.camera().setSize(projector.width(), projector.height());

    this.renderBackground(projector);
    overlay.textBaseline = "top";

    needsUpdate = this._painter.render(projector) || needsUpdate;
    if (needsUpdate) {
      log("World was rendered dirty.");
      this.scheduleRender();
    }

    if (!this._inputLayer.has(projector)) {
      return true;
    }
    const inputProj = this._inputLayer.get(projector);
    inputProj.render();

    const gl = inputProj.glProvider().gl();
    if (gl.isContextLost()) {
      return false;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.viewport(0, 0, projector.width(), projector.height());
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    inputProj.overlay().clearRect(0, 0, projector.width(), projector.height());
    if (this._input.render(inputProj)) {
      this.scheduleRender();
    }
    // this._piano.render(world, cam.scale());
    if (this.carousel().isCarouselShown() && !projector.isOffscreen()) {
      const scale = this.camera().scale() * window.visualViewport.scale;
      const [carouselX, carouselY] = this.carousel().getPos();
      const x = this.camera().x() * scale + carouselX * scale;
      const y = this.camera().y() * scale + carouselY * scale;
      const cam = this.carousel().camera();
      cam.copy(this.camera());
      cam.setSize(this.camera().width(), this.camera().height());
      cam.setOrigin(x, y);
      cam.setScale(1 / window.visualViewport.scale);
      this._carousel.render(inputProj);
    }
    if (
      !projector.isOffscreen() &&
      this._displayMode?.showMenu(projector, this)
    ) {
      this._menu.paint(inputProj);
      this._menu.render(inputProj);
    }

    needsUpdate = this.web().render(projector) || needsUpdate;

    this._renderedMouse = this.input().mouse().mouseVersion();
    if (!needsUpdate) {
      this._needsRender = this._needsRepaint;
    }

    needsUpdate = Boolean(needsUpdate);
    logc(
      "Viewport renders",
      needsUpdate ? "Render needs more time" : "Render complete"
    );
    return needsUpdate;
  }
}
