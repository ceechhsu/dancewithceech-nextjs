export class PendingSubmission {
  constructor({api,upload,wait=ms=>new Promise(r=>setTimeout(r,ms)),requestKey=crypto.randomUUID()}){Object.assign(this,{api,upload,wait,requestKey});this.id=null;}
  async submit(lessonId,file,recording,onProgress=()=>{}) {
    if(!this.id){const session=await this.api(`/practice/api/lesson-session/${lessonId}`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':this.requestKey},body:JSON.stringify({recording})});this.id=session.id;}
    let job=await this.api(`/practice/api/job/${this.id}`);
    if(job.state==='error'){
      await this.api(`/practice/api/session/${this.id}`,{method:'DELETE'});
      this.id=null;
      return this.submit(lessonId,file,recording,onProgress);
    }
    if(job.state==='uploading'){
      onProgress('Uploading your captured video and microphone recording…');
      await this.upload(file,this.id,onProgress);
      await this.api(`/practice/api/match/${this.id}`,{method:'POST'});
    }
    for(let attempt=0;attempt<900;attempt++){
      job=await this.api(`/practice/api/job/${this.id}`);onProgress(job.message||'Preparing the comparison…');
      if(job.state==='done')return{id:this.id,job};
      if(job.state==='error')throw new Error((job.message||'Processing failed.')+' Your take is still here. Submit again to retry processing, or save it.');
      await this.wait(650);
    }
    throw new Error('Processing is taking longer than expected. Your take is still here; submit again to check progress.');
  }
}
