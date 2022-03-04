import { assert } from "chai";
import todo from "../src/index";

describe("Package", function () {
  it("works", () => {
    assert.equal(typeof todo(), "string");
    console.log(todo());
    assert.isTrue(todo().indexOf("Hello") >= 0);
  });
});
