const runtime=import('./trial-assets/vision_bundle.mjs');
let pose,canvas,ctx;
self.onmessage=async({data:d})=>{try{
 if(d.type==='init'){
  const {PoseLandmarker,FilesetResolver}=await runtime;
  pose=await PoseLandmarker.createFromOptions(await FilesetResolver.forVisionTasks('/practice/trial-assets'),{baseOptions:{modelAssetPath:'/practice/trial-assets/pose_landmarker_full.task',delegate:'CPU'},runningMode:'VIDEO',numPoses:2,minPoseDetectionConfidence:.6,minPosePresenceConfidence:.6,minTrackingConfidence:.6});
  canvas=new OffscreenCanvas(d.width,d.height);ctx=canvas.getContext('2d',{willReadFrequently:true});postMessage({ready:true});return;
 }
 const started=performance.now();ctx.drawImage(d.bitmap,0,0);d.bitmap.close();
 const result=pose.detectForVideo(canvas,Math.round(d.time*1000));const points={};
 for(const k of [11,12,23,24,25,26,27,28,29,30,31,32])if(result.landmarks[0])points[k]=result.landmarks[0][k];
 const blur={};
 for(const [side,ids] of [['left',[27,29,31]],['right',[28,30,32]]]){
  if(!result.landmarks.length){blur[side]=0;continue;}
  const pts=ids.map(k=>points[k]);const x0=Math.max(0,Math.floor(Math.min(...pts.map(p=>p.x))*canvas.width)-12),x1=Math.min(canvas.width,Math.floor(Math.max(...pts.map(p=>p.x))*canvas.width)+12),y0=Math.max(0,Math.floor(Math.min(...pts.map(p=>p.y))*canvas.height)-12),y1=Math.min(canvas.height,Math.floor(Math.max(...pts.map(p=>p.y))*canvas.height)+12),w=x1-x0,h=y1-y0;
  if(w<4||h<4){blur[side]=0;continue;}const pixels=ctx.getImageData(x0,y0,w,h).data;const gray=(x,y)=>{const i=(y*w+x)*4;return (pixels[i]+pixels[i+1]+pixels[i+2])/3;};let sum=0,sq=0,n=0;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const v=gray(x-1,y)+gray(x+1,y)+gray(x,y-1)+gray(x,y+1)-4*gray(x,y);sum+=v;sq+=v*v;n++;}blur[side]=sq/n-(sum/n)**2;
 }
 postMessage({row:{time:d.time,poses:result.landmarks.length,points,blur},inferenceMs:performance.now()-started});
 }catch(e){postMessage({error:e.message||'Local pose analysis failed.'});}};
