import Viewport from ".";

import TimingBelt from "parsegraph-timingbelt";
import { Projection, BasicProjector } from "parsegraph-projector";
import Direction from "parsegraph-direction";

import Block, { DefaultBlockPalette} from "parsegraph-block";
import { DirectionCaret } from "parsegraph-direction";

// import Freezer from "../freezer/Freezer";

const buildGraph = ()=>{
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
    car.pull(dir);
    car.move(dir);
  }
  return root;
};

document.addEventListener("DOMContentLoaded", () => {
  const belt = new TimingBelt();
  const root = buildGraph();
  const comp = new Viewport(root);

  const projector = new BasicProjector();
  document.getElementById("demo").appendChild(projector.container());
  const proj = new Projection(projector, comp);
  belt.addRenderable(proj);
});
