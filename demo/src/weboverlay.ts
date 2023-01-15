import express from "express";
import bodyparser from "body-parser";
import path from "path";
import { readFileSync } from "fs";

const webOverlay = (app: ReturnType<typeof express>) => {
  app.get("/overlay", (req, res) => {
    const fullPath = path.resolve(process.cwd(), "../www/overlay.html");
    console.log(fullPath);
    res.end(readFileSync(fullPath));
  });

  app.get("/src/overlay.js", (req, res) => {
    const fullPath = path.resolve(process.cwd(), "../react/dist/demo.js");
    console.log(fullPath);
    res.end(readFileSync(fullPath));
  });

  app.post("/overlay", bodyparser.json(), (req, res) => {
    console.log(JSON.stringify(req.body));
    res.end();
  });
};

export default webOverlay;
