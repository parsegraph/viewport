import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

document.addEventListener("DOMContentLoaded", ()=>{
  const params = new URLSearchParams(window.location.search);

  const callbackId = params.get("cb");
  console.log("callbackId=" + callbackId);

  const topElem = document.getElementById("demo");
  topElem.style.backgroundColor = 'white';
  document.getElementById("demo").style.backgroundColor = 'white';

  const initialVal = params.get("val");
  ReactDOM.render(<App initialVal={initialVal} onSubmit={val=>{
    console.log("Received " + val);
    (parent.window as any)["callback_"+callbackId](val);
  }}/>, topElem);
});
