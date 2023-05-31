import Navport from "../src/index";
import { DirectionCaret } from "parsegraph-direction";
import Block, { copyStyle, DefaultBlockPalette } from "parsegraph-block";

describe("Package", function () {
  it("works", () => {
    const nav = new Navport(null);
    nav.camera().setSize(100, 100);
    const car = new DirectionCaret<Block>("u", new DefaultBlockPalette());
    nav.showInCamera(car.root());
    nav.setRoot(car.root());
    const size = nav.root().value().getLayout().extentSize();
    console.log(size);

    expect(nav.input().key().minCameraScale()).toEqual(1);
  });
});
