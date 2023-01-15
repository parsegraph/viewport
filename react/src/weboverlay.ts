import express from 'express';

const webOverlay = (app: ReturnType<typeof express> ) => {
  app.get("/weboverlay", (req, res)=>{

  });

  app.post("/weboverlay", (req, res)=>{

  });
};

export default webOverlay;
