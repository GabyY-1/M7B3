import {tileImage} from './tiles.js';
self.onmessage=async ({data})=>{
 const {key,z,x,y,graticule}=data;
 try{
  const canvas=tileImage(z,x,y,{graticule});
  if(!canvas){self.postMessage({key,empty:true});return}
  const bitmap=canvas.transferToImageBitmap();
  self.postMessage({key,bitmap},[bitmap]);
 }catch(error){self.postMessage({key,error:String(error)})}
};
