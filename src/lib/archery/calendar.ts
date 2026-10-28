function monthDate(month:string){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Choose a valid month.')
 return new Date(month+'-01T12:00:00Z')
}
const iso=(date:Date)=>date.toISOString().slice(0,10)
export function monthCells(month:string):(string|null)[]{
 const start=monthDate(month),end=new Date(start)
 end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0)
 const cells:(string|null)[]=Array(start.getUTCDay()).fill(null)
 for(let day=1;day<=end.getUTCDate();day++)cells.push(`${month}-${String(day).padStart(2,'0')}`)
 while(cells.length%7)cells.push(null)
 return cells
}
export function moveMonth(month:string,offset:number){const date=monthDate(month);date.setUTCMonth(date.getUTCMonth()+offset);return iso(date).slice(0,7)}
export function monthTitle(month:string){return monthDate(month).toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})}
export function classDate(timestamp:string,timezone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp))}
