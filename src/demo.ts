import Viewport from ".";

import Color from "parsegraph-color";

import {
  WorldTransform,
  WorldRenderable,
} from 'parsegraph-scene';

import Artist, {
  NodeValues,
  PaintedNode,
} from "parsegraph-artist";

import TimingBelt from "parsegraph-timingbelt";
import { Projection, BasicProjector, Projector } from "parsegraph-projector";
import Direction, { DirectionNode } from "parsegraph-direction";

import Block from "parsegraph-block";
import { Renderable } from "parsegraph-timingbelt";
import Method from "parsegraph-method";

// import Freezer from "../freezer/Freezer";

class DebugOverlay implements Renderable {
  _onUpdate: Method;
  _projector: Projector;

  constructor() {
    this._projector = new BasicProjector();
    this._onUpdate = new Method();

    this.container().style.pointerEvents = "none";
    this.container().style.position = "absolute";
    this.container().style.top = "0px";
    this.container().style.left = "0px";
  }

  container() {
    return this.projector().glProvider().container();
  }

  tick() {
    return false;
  }

  projector() {
    return this._projector;
  }

  paint() {
    this.projector().overlay();
    return false;
  }

  width() {
    return this.projector().width();
  }

  height() {
    return this.projector().height();
  }

  render() {
    this.projector().render();
    const ctx = this.projector().overlay();
    ctx.clearRect(0, 0, this.width(), this.height());
    ctx.fillStyle = "white";
    ctx.textBaseline = "top";
    ctx.fillText("DebugOverlay", 0, 0);
    ctx.fillStyle = "red";
    ctx.textAlign = "right";
    ctx.fillText("DebugOverlay", this.width(), 0);
    ctx.fillStyle = "blue";
    ctx.textBaseline = "bottom";
    ctx.fillText("DebugOverlay", this.width(), this.height());
    ctx.fillStyle = "yellow";
    ctx.textAlign = "left";
    ctx.fillText("DebugOverlay", 0, this.height());
    return false;
  }

  unmount() {}

  setOnScheduleUpdate(listener: () => void, listenerObj?: object) {
    this._onUpdate.set(listener, listenerObj);
  }
}

class Scene implements WorldRenderable {
  _projector: Projector;
  _blocks: NodeValues<Block>;
  _world: WorldTransform;

  constructor(projector: Projector) {
    this._projector = projector;
    this._blocks = null;
  }

  setBlocks(blocks: NodeValues<Block>) {
    this._blocks = blocks;
  }

  setWorldTransform(world: WorldTransform) {
    this._world = world;
  }

  tick() {
    return false;
  }

  paint() {
    return false;
  }

  render() {
    return false;
  }

  unmount() {}

  setOnScheduleUpdate() {}
}

class TestArtist implements Artist<Block, Scene> {
  patch(scene: Scene, seq: NodeValues<Block>) {
    scene.setBlocks(seq);
    return true;
  }

  make(projector: Projector, seq: NodeValues<Block>) {
    const scene = new Scene(projector);
    scene.setBlocks(seq);
    return scene;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const makeBlock = (color: Color, borderColor: Color) => {
    const node: DirectionNode<Block> = new DirectionNode();
    const artist = artistFunc();
    const b = new Block(color, borderColor, node, artist);
    if (comp) {
      b.setOnScheduleUpdate(comp);
    }
    node.setValue(b);
    return node;
  };

  const belt = new TimingBelt();

  const root = makeBlock(new Color(1, 1, 1), new Color(0.5, 0.5, 0.5, 0.5));
  const comp = new Viewport(root);
  root.value().setOnScheduleUpdate(comp);
  // const freezer = new Freezer();
  // root.value().getCache().freeze(freezer);

  let n: PaintedNode = root;
  for (let i = 0; i < 10; ++i) {
    const child = makeBlock(
      new Color(1 - i / 10, 0, 0),
      new Color(0.5, 0.5, 0.5, 0.5)
    );
    n.connectNode(i % 2 ? Direction.FORWARD : Direction.DOWNWARD, child);
    n = child;
    if (i == 5) {
      n.crease();
    }
  }

  window.addEventListener("resize", () => {
    belt.scheduleUpdate();
  });

  const projector = new BasicProjector();
  document.getElementById("demo").appendChild(projector.container());
  const proj = new Projection(projector, comp);
  belt.addRenderable(proj);
  const debugOverlay = new DebugOverlay();
  document.getElementById("demo").appendChild(debugOverlay.container());
  belt.addRenderable(debugOverlay);
});
