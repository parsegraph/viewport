import Navport from ".";

import Direction, { nameDirection } from "parsegraph-direction";

import Block, { copyStyle, DefaultBlockPalette } from "parsegraph-block";
import { showInCamera } from "parsegraph-showincamera";
import { DirectionCaret } from "parsegraph-direction";
import { ActionCarousel } from "./carousel";
import Color from "parsegraph-color";
import render from "./render";
import { DirectionNode } from "parsegraph-direction";
import { DOMContent, DOMContentArtist } from "parsegraph-artist"
import Camera from "parsegraph-camera";

const artist = new DOMContentArtist();

let COUNT = 0;
const makeNode = (cam: Camera, onUpdate: () => void): DirectionNode => {
  const node = new DirectionNode();
  const size = 24; // Math.ceil(36 * Math.random());
  // co
  const c = document.createElement("textarea");
  c.style.fontSize = size + "px";
  c.style.pointerEvents = "all";
  c.style.zIndex = "1";
  c.innerText = "DOMCONTENT" + COUNT++;
  const val = new DOMContent(() => c);
  val.interact().setClickListener(() => {
    onUpdate();
    return false;
  });
  val.setArtist(artist);
  val.setNode(node);
  val.setOnScheduleUpdate(onUpdate);
  node.setValue(val);
  return node;
};

const buildGraph = (comp: Navport) => {
  const carousel = comp.carousel();
  const web = comp.web();
  const car = new DirectionCaret<Block>("u", new DefaultBlockPalette());

  const root = car.root();

  const dirs = [
    Direction.FORWARD,
    Direction.DOWNWARD,
    Direction.INWARD,
    Direction.UPWARD,
    Direction.BACKWARD,
  ];
  for (let i = 0; i < 20; ++i) {
    let dir = Direction.NULL;
    while (dir === Direction.NULL || car.has(dir)) {
      dir = dirs[Math.floor(Math.random() * dirs.length)];
    }
    car.spawn(dir, "b");
    car.pull(dir);
    car.move(dir);

    const dom = makeNode(comp.camera(), ()=>comp.scheduleRepaint());
    car.node().connectNode(Direction.INWARD, dom);

    car.node().value().setLabel(nameDirection(dir));
    car.shrink();
  }
  return root;
};

document.addEventListener("DOMContentLoaded", () => {
  const comp = new Navport(null);
  const root = buildGraph(comp);
  comp.showInCamera(root);
  comp.setRoot(root);
  comp.menu().setSearchCallback((cmd: string) => {
    alert(cmd);
  });
  comp.scheduleRepaint();

  render(document.getElementById("demo"), comp);
  setTimeout(() => {
    showInCamera(root, comp.camera(), false);
  }, 0);
});
