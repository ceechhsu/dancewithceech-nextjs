// A frame nudge follows the student's decoded presentation timestamps.
export function frameShift(times,studentTime,direction){
 if(!Array.isArray(times)||times.length<2)return null;
 let i=0;for(let j=1;j<times.length;j++)if(Math.abs(times[j]-studentTime)<Math.abs(times[i]-studentTime))i=j;
 const next=i+direction;
 if(next<0||next>=times.length)return null;
 return times[next]-times[i];
}
