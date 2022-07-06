import Navport from ".";

import Direction from "parsegraph-direction";

import Block, { copyStyle, DefaultBlockPalette } from "parsegraph-block";
import { DirectionCaret } from "parsegraph-direction";
import Carousel, { ActionCarousel } from "parsegraph-carousel";
import Color from "parsegraph-color";
import render from "./render";

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
    car.node().value().setLabel("No time");
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
    });
    ac.install(car.node());
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
