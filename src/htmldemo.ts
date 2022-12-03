import Navport from ".";

import Direction, { DirectionNode } from "parsegraph-direction";

import Block, { DefaultBlockPalette } from "parsegraph-block";
import { DirectionCaret } from "parsegraph-direction";
import Color from "parsegraph-color";
import render from "./render";
import { DOMContent, DOMContentArtist } from "parsegraph-artist";

const artist = new DOMContentArtist();

const buildGraph = () => {
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
    const n = car.node();

    const c = document.createElement("div");
    c.style.fontSize = "24px";
    c.style.color = "green";
    c.style.pointerEvents = "all";
    c.innerText = "this is dom content";
    // const c = document.createElement("img");
    // c.src = "/favicon.ico";
    const val = new DOMContent(() => c);
    val.setArtist(artist);
    val.setNode(n as unknown as DirectionNode<DOMContent>);
    val.setOnScheduleUpdate(() => {
      n.layoutChanged();
    });
    (n as unknown as DirectionNode<DOMContent>).setValue(val);
    car.pull(dir);
    car.move(dir);
  }
  return root;
};

document.addEventListener("DOMContentLoaded", () => {
  const comp = new Navport(null);
  comp.setBackgroundColor(new Color(0.5));
  const root = buildGraph();
  comp.setRoot(root);
  comp.menu().setSearchCallback((cmd: string) => {
    alert(cmd);
  });

  render(document.getElementById("demo"), comp);
});
