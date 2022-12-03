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
          const div = document.createElement("div");
          div.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
          });
          div.innerHTML =
            "<div style='border-radius: 6px; background: white; padding: 6px; pointer-events: auto'></div>";
          const text = document.createElement("input");
          text.style.fontSize = "2em";
          div.childNodes[0].appendChild(text);
          text.addEventListener("change", () => {
            n.value().setLabel(text.value);
            web.close();
          });
          text.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              n.value().setLabel(text.value);
              web.close();
            }
          });
          text.value = n.value().label();
          setTimeout(() => {
            text.focus();
          }, 0);
          par.appendChild(div);
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
  comp.menu().setSearchCallback((cmd: string) => {
    alert(cmd);
  });

  render(document.getElementById("demo"), comp);
});
