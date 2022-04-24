import lerp from "parsegraph-lerp";
import Animator from "parsegraph-animator";
import smoothstep from "parsegraph-smoothstep";
import Navport from "./Navport";

export default class CameraFilter extends Animator {
  _nav: Navport;
  _cameraChangeVersion: number;
  _lastNodePosition: any;
  _lastCameraPosition: any;
  _nodePosition: any;
  _cameraPosition: any;
  _requiredScale: number;

  constructor(nav: Navport) {
    super(240);
    this._nav = nav;
    this._cameraChangeVersion = null;

    this._lastNodePosition = null;
    this._lastCameraPosition = null;
    this._nodePosition = null;
    this._cameraPosition = null;
  }

  focusedNode() {
    return this.nav().input().focusedNode();
  }

  getNodePosition() {
    const node = this.focusedNode();
    return {
      x: node.value().getLayout().absoluteX(),
      y: node.value().getLayout().absoluteY(),
      scale: node.value().getLayout().absoluteScale(),
    };
  }

  getRequiredScale() {
    return this._requiredScale;
  }

  savePosition() {
    if (!this.nav()) {
      return;
    }
    this._requiredScale = this.nav().getRequiredScale();
    this._lastNodePosition = this._nodePosition;
    this._lastCameraPosition = this._cameraPosition;
    this._nodePosition = this.getNodePosition();
    this._cameraPosition = this.camera().toJSON();
    if (!this._lastNodePosition) {
      this._lastNodePosition = this._nodePosition;
    }
    if (!this._lastCameraPosition) {
      this._lastCameraPosition = this._cameraPosition;
    }
  }

  nav() {
    return this._nav;
  }

  camera() {
    return this.nav().camera();
  }

  latestChangeVersion() {
    return this._cameraChangeVersion;
  }

  actualChangeVersion() {
    return this.camera().changeVersion();
  }

  restart() {
    super.restart();
    this.savePosition();
  }

  getFocusedCameraScale() {
    const cam = this.camera();
    const node = this.focusedNode();
    const bodySize = node.value().getLayout().absoluteSize();
    const nodeScale = node.value().getLayout().absoluteScale();
    const screenWidth = cam.width();
    const screenHeight = cam.height();

    return (
      Math.min(
        screenWidth / (bodySize[0] * nodeScale),
        screenHeight / (bodySize[1] * nodeScale)
      ) * nodeScale
    );
  }

  /**
   * @param t {number} the percentage done of the animation. This is a value between 0 and 1, inclusive.
   */
  animate(t: number) {
    // console.log("CameraFilter is animating: ", t);
    t = smoothstep(t);
    const cam = this.camera();
    const nodePosition = this.getNodePosition();
    const x = lerp(
      this._cameraPosition.cameraX -
        cam.width() / (2 * this._cameraPosition.scale),
      -nodePosition.x,
      t
    );
    const y = lerp(
      this._cameraPosition.cameraY -
        cam.height() / (2 * this._cameraPosition.scale),
      -nodePosition.y,
      t
    );
    const scale = lerp(
      this._cameraPosition.scale,
      Math.min(this.getFocusedCameraScale(), this.getRequiredScale()),
      t
    );
    cam.setOrigin(
      x + cam.width() / (2 * scale),
      y + cam.height() / (2 * scale)
    );
    cam.setScale(scale);
  }

  /**
   * Adjust the camera based on the current time, to focus on the focused
   * node.
   *
   * @return {boolean} true if another frame is needed (i.e. animating)
   */
  render() {
    if (!this.animating()) {
      return false;
    }
    const t = this.t();
    // console.log("t=" + t);
    if (t >= 1) {
      this.stop();
    }
    this.animate(t);
    return this.animating();
  }
}
