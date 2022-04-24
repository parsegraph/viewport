import Viewport from ".";

import TimingBelt from "parsegraph-timingbelt";
import { Projection, BasicProjector } from "parsegraph-projector";
import Direction from "parsegraph-direction";

import Block, { copyStyle, DefaultBlockPalette } from "parsegraph-block";
import { DirectionCaret } from "parsegraph-direction";
import Carousel, { ActionCarousel } from "parsegraph-carousel";
import Color from "parsegraph-color";

// import Freezer from "../freezer/Freezer";

const buildGraph = (carousel: Carousel) => {
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

    const editLabel = new DefaultBlockPalette().spawn("b");
    editLabel.value().setLabel("Edit");
    const bStyle = copyStyle("b");
    bStyle.backgroundColor = new Color(1, 1, 1, 1);
    editLabel.value().setBlockStyle(bStyle);

    ac.addAction(editLabel, () => {
      alert("Showing editor");
      carousel.hideCarousel();
      carousel.scheduleCarouselRepaint();
    });
    ac.install(car.node());
    car.pull(dir);
    car.move(dir);
  }
  return root;
};

document.addEventListener("DOMContentLoaded", () => {
  const belt = new TimingBelt();
  const comp = new Viewport();
  const root = buildGraph(comp.carousel());
  comp.setRoot(root);
  comp.menu().setSearchCallback((cmd: string) => {
    alert(cmd);
  });

  const projector = new BasicProjector();
  document.getElementById("demo").appendChild(projector.container());
  new ResizeObserver(() => {
    belt.scheduleUpdate();
  }).observe(projector.container());
  const proj = new Projection(projector, comp);
  belt.addRenderable(proj);
});
