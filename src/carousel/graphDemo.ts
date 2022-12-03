import Carousel from "./Carousel";
import TimingBelt from "parsegraph-timingbelt";
import { BasicProjector, Projection } from "parsegraph-projector";
import { DefaultBlockPalette } from "parsegraph-block";
import Color from "parsegraph-color";
import ActionCarousel from "./ActionCarousel";
import { Viewport } from "parsegraph-graphpainter";

const BACKGROUND_COLOR = new Color(
  0,
  47 / 255,
  57 / 255,
  1
  // 45/255, 84/255, 127/255, 1
);

document.addEventListener("DOMContentLoaded", () => {
  const palette = new DefaultBlockPalette();

  const belt = new TimingBelt();

  const proj = new BasicProjector();

  const rootBlock = palette.spawn("b");
  rootBlock.value().setLabel("Hello!");
  const viewport = new Viewport(rootBlock, BACKGROUND_COLOR);
  const carousel = new Carousel(viewport.camera());
  const ac = new ActionCarousel(carousel);
  ["Cut", "Copy", "Paste", "Delete"].forEach((cmd) => {
    ac.addAction(cmd, () => {
      alert(cmd);
    });
  });
  ac.install(rootBlock);

  rootBlock.value().setOnScheduleUpdate(() => viewport.scheduleUpdate());

  belt.addRenderable(new Projection(proj, viewport));
  belt.addRenderable(new Projection(proj, carousel));

  const root = document.getElementById("demo");
  root.appendChild(proj.container());
});
