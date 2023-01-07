import FanPainter from "parsegraph-fanpainter";
import { matrixMultiply3x3, makeScale3x3 } from "parsegraph-matrix";
import Color from "parsegraph-color";
import { Projector, Projected } from "parsegraph-projector";
import CarouselAction from "./CarouselAction";
import Camera from "parsegraph-camera";
import { PaintedNode } from "parsegraph-artist";
import { Keystroke } from "parsegraph-input";
import Method from "parsegraph-method";
import { GraphPainter } from "parsegraph-graphpainter";

export class CarouselPlot {
  node: PaintedNode;
  x: number;
  y: number;
  scale: number;
  painter: GraphPainter;

  constructor(node: PaintedNode) {
    this.node = node;
    this.painter = new GraphPainter(node);
  }
}

export const CAROUSEL_SHOW_DURATION = 100;
export const CAROUSEL_MAX_DISTANCE = 4.0;
export const CAROUSEL_MIN_DISTANCE = 0.5;

export default class Carousel implements Projected {
  _selectionAngle: number;
  _angleSpan: number;
  _updateRepeatedly: boolean;
  _showScale: number;
  onScheduleRepaint: Function;
  onScheduleRepaintThisArg: any;
  _carouselPaintingDirty: boolean;
  _carouselPlots: CarouselPlot[];
  _carouselCallbacks: CarouselAction[];
  _carouselSize: number;
  _showCarousel: boolean;
  _selectedCarouselPlot: CarouselPlot;
  _selectedCarouselPlotIndex: number;
  _carouselHotkeys: { [id: string]: number };
  _fanPainters: Map<Projector, FanPainter>;
  _selectedPlot: PaintedNode;
  _hideTime: Date;
  _cleaner: Function;
  _showTime: Date;
  _update: Method;
  _camera: Camera;
  _x: number;
  _y: number;

  constructor(cam: Camera) {
    this._camera = cam;
    this._updateRepeatedly = false;
    this._showScale = 1;

    this.onScheduleRepaint = null;
    this.onScheduleRepaintThisArg = null;

    // Carousel-rendered carets.
    this._carouselPaintingDirty = true;
    this._carouselPlots = [];
    this._carouselCallbacks = [];

    this._carouselHotkeys = {};

    // Location of the carousel, in world coordinates.
    this._carouselSize = 25;

    this._showCarousel = false;

    // GL painters are not created until needed.
    this._fanPainters = new Map();

    this._selectedPlot = null;

    this._update = new Method();

    this.reset();
  }

  camera() {
    return this._camera;
  }

  needsRepaint() {
    return this._carouselPaintingDirty || this._updateRepeatedly;
  }

  setCarouselSize(size: number) {
    this._carouselSize = size;
  }

  showCarousel() {
    // console.log(new Error("Showing carousel"));
    this._showCarousel = true;
    this._updateRepeatedly = true;
    this._showTime = new Date();
  }

  isCarouselShown() {
    return this._showCarousel;
  }

  scheduleUpdate() {
    this._update.call();
  }

  hideCarousel() {
    // console.log(new Error("Hiding carousel"));
    this._selectedCarouselPlot = null;
    this._selectedCarouselPlotIndex = null;
    this._showCarousel = false;
    this._hideTime = new Date();
    this.scheduleUpdate();
  }

  addToCarousel(action: CarouselAction) {
    // console.log("Adding to carousel", action);
    this._carouselCallbacks.push(action);
    const node = action.action();
    if (!node) {
      throw new Error("Node must not be null");
    }
    if (!node.localPaintGroup()) {
      node.crease();
    }
    this._carouselPlots.push(new CarouselPlot(node));
    if (action.hotkey()) {
      this._carouselHotkeys[action.hotkey()] = this._carouselPlots.length - 1;
    }
    // console.log("Added to carousel");
  }

  clearCarousel() {
    // console.log("carousel cleared");
    this._carouselPlots.splice(0, this._carouselPlots.length);
    this._carouselCallbacks.splice(0, this._carouselCallbacks.length);
    this._carouselHotkeys = {};
    this._selectedCarouselPlot = null;
    this._selectedCarouselPlotIndex = null;
    if (this._cleaner) {
      const cleaner = this._cleaner;
      this._cleaner = null;
      cleaner();
    }
  }

  setCleaner(func: Function) {
    this._cleaner = func;
  }

  clearHotfixActionIndex(i: number) {
    for (const hotkey in this._carouselHotkeys) {
      if (
        !Object.prototype.hasOwnProperty.call(this._carouselHotkeys, hotkey)
      ) {
        continue;
      }
      if (this._carouselHotkeys[hotkey] === i) {
        delete this._carouselHotkeys[hotkey];
        return true;
      }
    }
    return false;
  }

  removeFromCarousel(node: PaintedNode) {
    if (!node) {
      throw new Error("Node must not be null");
    }
    if (!node.localPaintGroup && node.root) {
      // Passed a Caret.
      node = node.root();
    }
    for (let i = 0; i < this._carouselPlots.length; ++i) {
      if (this._carouselPlots[i].node !== node) {
        continue;
      }
      // console.log("removed from carousel");
      const removed = this._carouselPlots.splice(i, 1)[0];
      this._carouselCallbacks.splice(i, 1);
      this.clearHotfixActionIndex(i);

      if (this._selectedCarouselPlot === removed) {
        this._selectedCarouselPlot = null;
        this._selectedCarouselPlotIndex = null;
      }
      return removed;
    }
    return null;
  }

  updateRepeatedly() {
    return this._updateRepeatedly;
  }

  setPos(x: number, y: number) {
    this._x = x;
    this._y = y;
  }

  getPos(): [number, number] {
    return [this._x, this._y];
  }

  clickCarousel(x: number, y: number, asDown: boolean) {
    if (!this.isCarouselShown()) {
      return false;
    }

    if (this._showTime) {
      const ms = new Date().getTime() - this._showTime.getTime();
      if (ms < CAROUSEL_SHOW_DURATION) {
        // Ignore events that occur so early.
        return true;
      }
    }

    const dist = Math.sqrt(Math.pow(Math.abs(x), 2) + Math.pow(Math.abs(y), 2));
    const maxDist = this._carouselSize * CAROUSEL_MAX_DISTANCE;
    const minDist = this._carouselSize * CAROUSEL_MIN_DISTANCE;
    if (dist < minDist) {
      if (asDown) {
        // console.log(`Down events ${dist} within the inner region ${minDist} are treated as 'cancel.'`);
        this.hideCarousel();
        this.scheduleCarouselRepaint();
        return true;
      }

      // console.log(`Up events ${dist} within the inner region ${minDist} are ignored.`);
      return false;
    } else if (dist > maxDist) {
      this.hideCarousel();
      this.scheduleCarouselRepaint();
      // console.log(`Click occurred so far outside ${dist} vs. ${maxDist} that it is considered its own event.`);
      return false;
    }

    const angleSpan = (2 * Math.PI) / this._carouselPlots.length;
    let mouseAngle = Math.atan2(y, x);
    // console.log(
    //   toDegrees(mouseAngle) +
    //   " degrees = caret " +
    //   i +
    //   " angleSpan = " +
    //   angleSpan);
    if (this._carouselPlots.length == 1 && Math.abs(mouseAngle) > Math.PI / 2) {
      this.hideCarousel();
      this.scheduleCarouselRepaint();
      // console.log("Click occurred so far outside that' +
      //   ' it is considered its own event.");
      return false;
    }
    mouseAngle += Math.PI;
    const i = Math.floor(mouseAngle / angleSpan);

    // Click was within a carousel caret; invoke the listener.
    this.runAction(i);
    return true;
  }

  runAction(i: number) {
    this.hideCarousel();
    try {
      const action = this._carouselCallbacks[i];
      action.call();
    } catch (ex) {
      // console.log("Error occurred while running command:", ex);
    }
    this.scheduleCarouselRepaint();
  }

  carouselKey(event: Keystroke) {
    if (!(event.name() in this._carouselHotkeys)) {
      return false;
    }
    const i = this._carouselHotkeys[event.name()];
    this.runAction(i);
    return true;
  }

  private reset() {
    this._selectionAngle = null;
    this._angleSpan = null;
    this._selectedCarouselPlot = null;
    this._selectedCarouselPlotIndex = null;
  }

  mouseOverCarousel(x: number, y: number) {
    if (!this.isCarouselShown()) {
      this.reset();
      return 0;
    }

    const angleSpan = (2 * Math.PI) / this._carouselPlots.length;
    const mouseAngle = Math.PI + Math.atan2(y, x);
    const dist = Math.sqrt(Math.pow(Math.abs(x), 2) + Math.pow(Math.abs(y), 2));

    if (
      dist < this._carouselSize * CAROUSEL_MAX_DISTANCE &&
      dist > this._carouselSize * CAROUSEL_MIN_DISTANCE
    ) {
      if (
        this._carouselPlots.length > 1 ||
        Math.abs(mouseAngle - Math.PI) < Math.PI / 2
      ) {
        const i = Math.floor(mouseAngle / angleSpan);
        /* console.log(
          toDegrees(mouseAngle - Math.PI) +
            " degrees = caret " +
            i +
            " angleSpan = " +
            toDegrees(angleSpan)
        );*/
        const selectionAngle = angleSpan / 2 + i * angleSpan - Math.PI;
        if (i != this._selectedCarouselPlotIndex) {
          this._selectedCarouselPlotIndex = i;
          this._selectedCarouselPlot = this._carouselPlots[i];
        }
        this._selectionAngle = selectionAngle;
        this._angleSpan = angleSpan;
        this.scheduleCarouselRepaint();
        return 2;
      }
    }
    this.reset();
    this.scheduleCarouselRepaint();
    return 0;
  }

  showScale() {
    return this._showScale;
  }

  arrangeCarousel() {
    if (this._carouselPlots.length === 0) {
      return;
    }

    const angleSpan = (2 * Math.PI) / this._carouselPlots.length;

    const MAX_CAROUSEL_SIZE = 150;

    const now = new Date();
    // Milliseconds
    const showDuration = CAROUSEL_SHOW_DURATION;
    if (this._showTime) {
      let ms = now.getTime() - this._showTime.getTime();
      if (ms < showDuration) {
        ms /= showDuration / 2;
        if (ms < 1) {
          this._showScale = 0.5 * ms * ms;
        } else {
          ms--;
          this._showScale = -0.5 * (ms * (ms - 2) - 1);
        }
      } else {
        this._showScale = 1;
        this._showTime = null;
        this._updateRepeatedly = false;
      }
    }
    // console.log("Show scale is " + this._showScale);

    this._carouselPlots.forEach((carouselData, i) => {
      const root = carouselData.node;
      const rootLayout = root.value().getLayout();
      rootLayout.commitLayoutIteratively();

      // Set the origin.
      const caretRad =
        Math.PI +
        angleSpan / 2 +
        (i / this._carouselPlots.length) * (2 * Math.PI);
      carouselData.x =
        2 * this._carouselSize * this._showScale * Math.cos(caretRad);
      carouselData.y =
        2 * this._carouselSize * this._showScale * Math.sin(caretRad);
    });
  }

  setOnScheduleRepaint(func: Function, thisArg?: any) {
    thisArg = thisArg || this;
    this.onScheduleRepaint = func;
    this.onScheduleRepaintThisArg = thisArg;
  }

  scheduleCarouselRepaint() {
    // console.log("Scheduling carousel repaint.");
    this._carouselPaintingDirty = true;
    if (this.onScheduleRepaint) {
      this.onScheduleRepaint.call(this.onScheduleRepaintThisArg);
    }
    this.scheduleUpdate();
  }

  paint(proj: Projector, timeout?: number) {
    // console.log("Painting carousel");
    if (
      !this._updateRepeatedly &&
      (!this._carouselPaintingDirty || !this._showCarousel)
    ) {
      return false;
    }

    // Paint the carousel.
    // console.log("Painting the carousel");
    this.arrangeCarousel();
    let needsUpdate = false;
    this._carouselPlots.forEach((carouselData) => {
      needsUpdate =
        carouselData.painter.paint(
          proj,
          timeout / this._carouselPlots.length
        ) || needsUpdate;
    });

    // Paint the background highlighting fan.
    let painter = this._fanPainters.get(proj);
    if (!painter) {
      painter = new FanPainter(proj.glProvider());
      this._fanPainters.set(proj, painter);
    } else {
      painter.clear();
    }
    painter.setSelectionAngle(this._selectionAngle);
    painter.setSelectionSize(this._angleSpan);
    painter.setAscendingRadius(
      this.showScale() * CAROUSEL_MIN_DISTANCE * this._carouselSize
    );
    painter.setDescendingRadius(
      this.showScale() * CAROUSEL_MAX_DISTANCE * this._carouselSize
    );
    painter.selectRad(0, 0, 0, Math.PI * 2, new Color(1, 1, 1, 1));

    this._carouselPaintingDirty = false;
    return this._updateRepeatedly || needsUpdate;
  }

  render(proj: Projector): boolean {
    // console.log("Rendering carousel", this._showCarousel);
    if (!this._showCarousel) {
      return false;
    }
    if (this._updateRepeatedly || this._carouselPaintingDirty) {
      this.paint(proj);
    }

    // console.log("Rendering " + this + " in scene.");

    const painter = this.getPainter(proj);
    if (!painter) {
      return true;
    }
    const carouselCam = new Camera();
    carouselCam.setSize(this.camera().width(), this.camera().height());
    carouselCam.copy(this.camera());
    const world = matrixMultiply3x3(
      makeScale3x3(1 / window.visualViewport.scale / carouselCam.scale()),
      carouselCam.project()
    );
    const gl = proj.glProvider().gl();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    painter.render(world);

    // Render the carousel if requested.
    // console.log("Rendering ", this._carouselPlots.length, " carousel plots");
    this._carouselPlots.forEach((carouselData) => {
      proj.overlay().save();

      const graphCam = new Camera();
      graphCam.setSize(this.camera().width(), this.camera().height());
      graphCam.copy(carouselCam);
      graphCam.adjustOrigin(carouselData.x, carouselData.y);
      graphCam.setScale(1 / window.visualViewport.scale);

      carouselData.painter.setCamera(graphCam);
      carouselData.painter.render(proj);
      proj.overlay().restore();
    });

    return false;
  }

  tick() {
    return false;
  }

  getPainter(proj: Projector) {
    return this._fanPainters.get(proj);
  }

  unmount(proj: Projector) {
    const painter = this.getPainter(proj);
    if (painter) {
      painter.clear();
      this._fanPainters.delete(proj);
    }
  }

  dispose() {
    this._fanPainters.forEach((painter) => painter.clear());
    this._fanPainters.clear();
  }

  setOnScheduleUpdate(func: Function, obj?: object) {
    this._update.set(func, obj);
  }

  toggleCarousel() {
    if (this.updateRepeatedly()) {
      // Throttle.
      return false;
    }
    if (this.isCarouselShown()) {
      this.hideCarousel();
    } else {
      this.showCarousel();
    }
  }
}
