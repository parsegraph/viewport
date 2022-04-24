let impulseThreshold = 20;
let impulseDecay = 0.0;
export function getImpulse() {
  return [impulseThreshold, impulseDecay];
}

export function setImpulse(threshold: number, decay: number) {
  impulseThreshold = threshold;
  impulseDecay = decay;
}

let mouseImpulseAdjustment = -0.135;
export function getMouseImpulseAdjustment() {
  return mouseImpulseAdjustment;
}
export function setMouseImpulseAdjustment(value: number) {
  mouseImpulseAdjustment = value;
}

let wheelImpulseAdjustment = 0.75;
export function getWheelImpulseAdjustment() {
  return wheelImpulseAdjustment;
}
export function setWheelImpulseAdjustment(value: number) {
  wheelImpulseAdjustment = value;
}

let impulseRetention = 1;
export function getImpulseRetention() {
  return impulseRetention;
}
export function setImpulseRetention(value: number) {
  impulseRetention = value;
}
