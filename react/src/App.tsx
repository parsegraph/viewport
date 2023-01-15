import React, {useState} from 'react';

interface Props {
  initialVal?: string;
  onSubmit:(val:string)=>void
}

const App: React.FC<Props> = ({initialVal="", onSubmit})=>{
  const [val, setVal] = useState(initialVal);
  return <div>
    <h3>React App</h3>
    <input type="text" value={val} onChange={e=>setVal(e.target.value)}></input>
    <button onClick={()=>{
      onSubmit(val);
    } }>Change</button>
    <button onClick={()=>{
      onSubmit(null);
    }}>Cancel</button>
  </div>
};

export default App;
