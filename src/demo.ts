import Navport from ".";

import Direction, { nameDirection } from "parsegraph-direction";

import Block, { copyStyle, DefaultBlockPalette } from "parsegraph-block";
import { showInCamera } from "parsegraph-showincamera";
import { DirectionCaret } from "parsegraph-direction";
import { ActionCarousel } from "./carousel";
import Color from "parsegraph-color";
import render from "./render";

let RUNNING = true;

const buildGraph = (comp: Navport) => {
  const carousel = comp.carousel();
  const web = comp.web();
  const car = new DirectionCaret<Block>("u", new DefaultBlockPalette());

  const root = car.root();

  const dirs = [
    Direction.FORWARD,
    Direction.DOWNWARD,
    // Direction.INWARD,
    Direction.UPWARD,
    Direction.BACKWARD,
  ];
  const MAX_RUNS = 6;
  let runs = 0;
  const refresh = () => {
    for (let i = 0; i < 3; ++i) {
      let dir = Direction.NULL;
      while (dir === Direction.NULL || car.has(dir)) {
        dir = dirs[Math.floor(Math.random() * dirs.length)];
      }
      car.spawn(dir, "b");
      car.node().layoutChanged();
      if (!car.node().isRoot()) {
        car.node().parent()?.layoutChanged();
        car.node().parent().value().getLayout()._hasGroupPos = false;
      }
      if (Math.random() > 0.5) {
        car.node().value().interact().setImmediateClick(true);
      }
      const ac = new ActionCarousel(carousel);

      const editLabel = car.palette().spawn("b");
      editLabel.value().setLabel("Edit");
      const bStyle = copyStyle("b");
      bStyle.backgroundColor = new Color(1, 1, 1, 1);
      editLabel.value().setBlockStyle(bStyle);

      ac.addAction(editLabel, () => {
        carousel.hideCarousel();
        carousel.scheduleCarouselRepaint();
        web.show("https://www.youtube.com/embed/W1WmqLODrPk");
        comp.scheduleRepaint();
      });
      ac.install(car.node());
      car.pull(dir);
      car.move(dir);
      // car.shrink();
      if (i % 4 === 0) {
        car.crease();
        car.node().value().setLabel("PaintGrooooooup");
        if (!car.node().isRoot()) {
          car.node().parent()?.layoutChanged();
        }
      } else {
        car.node().value().setLabel(nameDirection(dir));
      }
    }
    comp.showInCamera(car.root());
    showInCamera(car.root(), comp.camera(), true);
    comp.scheduleRepaint();
  };
  setInterval(() => {
    if (!RUNNING) {
      return;
    }
    if (runs > MAX_RUNS) {
      car.moveToRoot();
      dirs.forEach((dir) => car.disconnect(dir));
      runs = 0;
      return;
    }
    ++runs;
    refresh();
  }, 1000);
  return root;
};

document.addEventListener("DOMContentLoaded", () => {
  const comp = new Navport(null);
  const root = buildGraph(comp);
  // comp.showInCamera(root);
  comp.setRoot(root);
  comp.menu().setSearchCallback((cmd: string) => {
    alert(cmd);
  });
  comp.scheduleRepaint();

  const topElem = document.getElementById("demo");
  render(topElem, comp);
  setTimeout(() => {
    // showInCamera(root, comp.camera(), false);
  }, 0);

  const dot = document.createElement("div");
  dot.style.position = "absolute";
  dot.style.right = "8px";
  dot.style.top = "8px";
  dot.style.width = "16px";
  dot.style.height = "16px";
  dot.style.borderRadius = "8px";
  dot.style.transition = "background-color 400ms";
  dot.style.backgroundColor = "#222";
  topElem.appendChild(dot);

  document.body.style.transition = "background-color 2s";
  let dotTimer: any = null;
  let dotIndex = 0;
  const dotState = ["#f00", "#c00"];
  const refreshDot = () => {
    dotIndex = (dotIndex + 1) % dotState.length;
    dot.style.backgroundColor = dotState[dotIndex];
  };
  const dotInterval = 500;
  dot.addEventListener("click", () => {
    if (RUNNING) {
      clearInterval(dotTimer);
      RUNNING = false;
      dotTimer = null;
      dot.style.transition = "background-color 3s";
      dot.style.backgroundColor = "#222";
    } else {
      RUNNING = true;
      dot.style.transition = "background-color 400ms";
      refreshDot();
      dotTimer = setInterval(refreshDot, dotInterval);
    }
  });
});
