import { getImpulse, getImpulseRetention } from "./impulse";
import fuzzyEquals from "parsegraph-fuzzyequals";
import { Direction } from "parsegraph-direction";
import NavportCursor from "./NavportCursor";

const minimum = 0.005;

export default class NavportImpulse {
  _horizontalJerk: number;
  _verticalJerk: number;
  _horizontalImpulse: number;
  _verticalImpulse: number;
  _cursor: NavportCursor;

  constructor(cursor: NavportCursor) {
    this._cursor = cursor;
    this.resetImpulse();
  }

  addImpulse(x: number, y: number): void {
    this._horizontalJerk = this._horizontalJerk * getImpulseRetention() + x;
    this._verticalJerk = this._verticalJerk * getImpulseRetention() + y;
    this.nav().scheduleRepaint();
  }

  nav() {
    return this._cursor.nav();
  }

  update(t: Date): boolean {
    const impulseSettings = getImpulse();
    // console.log(this._viewport.getFocusScale()*this._focusedNode.absoluteScale());
    const THRESHOLD = impulseSettings[0];
    // const THRESHOLD = Math.min(3, impulseSettings[0]*(this._viewport.getFocusScale()*this._focusedNode.absoluteScale()));
    const DECAY = impulseSettings[1];
    // console.log("Impulse threshold=" + THRESHOLD);
    // console.log("Impulse decay=" + DECAY);
    return this.checkImpulse(THRESHOLD, DECAY) || this.hasJerk();
  }

  clearImpulse() {
    // console.log("Clearing impulse");
    this._horizontalJerk = 0;
    this._verticalJerk = 0;
    this._horizontalImpulse = 0;
    this._verticalImpulse = 0;
  }

  resetImpulse() {
    this.clearImpulse();
  }

  hasImpulse() {
    /* console.log(
      "Checking for impulse: " +
        this._horizontalImpulse +
        ", " +
        this._verticalImpulse
    );*/
    return (
      !fuzzyEquals(this._horizontalImpulse, 0, minimum) ||
      !fuzzyEquals(this._verticalImpulse, 0, minimum)
    );
  }

  hasJerk() {
    return (
      !fuzzyEquals(this._horizontalJerk, 0, minimum) ||
      !fuzzyEquals(this._verticalJerk, 0, minimum)
    );
  }

  checkImpulse(THRESHOLD: number, DECAY: number) {
    // console.log("Before jerk");
    // console.log(this._horizontalImpulse, this._horizontalJerk);
    // console.log(this._verticalImpulse, this._verticalJerk);
    this._horizontalImpulse += this._horizontalJerk;
    this._verticalImpulse += this._verticalJerk;
    // console.log("After jerk");
    // console.log(this._horizontalImpulse, this._horizontalJerk);
    // console.log(this._verticalImpulse, this._verticalJerk);

    this._horizontalJerk *= DECAY;
    this._verticalJerk *= DECAY;
    // console.log("After decay");
    // console.log(this._horizontalImpulse, this._horizontalJerk);
    // console.log(this._verticalImpulse, this._verticalJerk);

    const getImpulseDirection = () => {
      if (this._verticalImpulse < -THRESHOLD) {
        return Direction.UPWARD;
      } else if (this._verticalImpulse > THRESHOLD) {
        return Direction.DOWNWARD;
      } else if (this._horizontalImpulse > THRESHOLD) {
        return Direction.FORWARD;
      } else if (this._horizontalImpulse < -THRESHOLD) {
        return Direction.BACKWARD;
      } else {
        return Direction.NULL;
      }
    };

    const dir = getImpulseDirection();
    if (dir === Direction.NULL) {
      return false;
    }
    if (this.nav().input().cursor().moveFocus(dir)) {
      this._horizontalImpulse *= DECAY;
      this._verticalImpulse *= DECAY;
      return true;
    }

    // console.log("Reversing");
    this._horizontalImpulse *= -DECAY;
    this._verticalImpulse *= -DECAY;
    this._horizontalJerk *= -DECAY;
    this._verticalJerk *= -DECAY;
    // console.log("After reversal");
    // console.log(this._horizontalImpulse, this._horizontalJerk);
    // console.log(this._verticalImpulse, this._verticalJerk);

    return false;
  }
}
