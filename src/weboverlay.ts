import Navport from ".";

import Direction from "parsegraph-direction";

import Block, { copyStyle, DefaultBlockPalette } from "parsegraph-block";
import { DirectionCaret } from "parsegraph-direction";
import Color from "parsegraph-color";
import render from "./render";

const buildGraph = (comp: Navport) => {
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
    car.node().value().setLabel("No time");

    const editLabel = car.palette().spawn("b");
    editLabel.value().setLabel("Edit");
    const bStyle = copyStyle("b");
    bStyle.backgroundColor = new Color(1, 1, 1, 1);
    editLabel.value().setBlockStyle(bStyle);

    const n = car.node();
    n.value()
      .interact()
      .setClickListener(() => {
        web.setSize(0.75);
        web.show((par) => {
          const iframe = document.createElement("iframe");
          iframe.width = "500";
          iframe.height = "300";
          const callbackId = Math.floor(Math.random() * 999999999);

          const params = new URLSearchParams();
          params.set("cb", String(callbackId));
          params.set("val", n.value().label());

          iframe.src = `/overlay?${params.toString()}`;
          (window as any)["callback_" + callbackId] = (val: string) => {
            web.close();
            if (val === null) {
              return;
            }
            n.value().setLabel(val);
            comp.scheduleRepaint();
          };
          par.appendChild(iframe);
          return () => {
            delete (window as any)["callback_" + callbackId];
          };
        });
        comp.scheduleRepaint();
        return true;
      });
    car.pull(dir);
    car.move(dir);
  }
  return root;
};

document.addEventListener("DOMContentLoaded", () => {
  const comp = new Navport(null);
  const root = buildGraph(comp);
  comp.setRoot(root);

  render(document.getElementById("demo"), comp);
  comp.scheduleRepaint();
  comp.showInCamera(root);
});
