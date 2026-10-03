// One decoded original loop; audio failures must never block local video analysis.
export class WaitingMusic {
  constructor({createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),
    loadBuffer,muted=false,onChange=()=>{},volume=.25,fadeSeconds=.8}={}) {
    this.createContext=createContext;this.loadBuffer=loadBuffer;
    this.muted=muted;this.onChange=onChange;this.volume=volume;this.fadeSeconds=fadeSeconds;
    this.active=false;this.generation=0;this.context=null;this.voice=null;this.buffer=null;
  }
  notify(state){this.onChange({state,active:this.active,muted:this.muted});}
  async begin(){
    this.end({immediate:true});this.active=true;
    const generation=++this.generation;
    if(this.muted){this.notify('muted');return;}
    await this.play(generation);
  }
  async play(generation){
    this.notify('loading');
    try{
      const context=this.context||(this.context=this.createContext());
      // Call resume immediately from a tap; do not await a blocked autoplay promise.
      // A suspended context can still download/decode the small loop for a later tap.
      const resume=Promise.resolve(context.resume()).catch(()=>{});
      if(!this.buffer){
        this.buffer=(this.loadBuffer?this.loadBuffer(context):fetch('/practice/analysis-waiting-loop.mp3')
          .then(response=>{if(!response.ok)throw Error('Waiting music unavailable');return response.arrayBuffer();})
          .then(bytes=>context.decodeAudioData(bytes))).catch(error=>{this.buffer=null;throw error;});
      }
      const buffer=await this.buffer;
      if(generation!==this.generation||!this.active||this.muted)return;
      if(context.state!=='running'){
        let timer;
        try{await Promise.race([resume,new Promise(resolve=>{timer=setTimeout(resolve,500);})]);}
        finally{clearTimeout(timer);}
      }
      if(generation!==this.generation||!this.active||this.muted)return;
      if(context.state!=='running'){this.notify('blocked');return;}
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=Math.min(30,buffer.duration);
      gain.gain.setValueAtTime(this.volume,context.currentTime);
      source.connect(gain);gain.connect(context.destination);
      source.onended=()=>{source.disconnect();gain.disconnect();};
      this.voice={source,gain};source.start(context.currentTime);this.notify('playing');
    }catch{
      if(generation===this.generation&&this.active&&!this.muted)this.notify('unavailable');
    }
  }
  silence(seconds){
    const voice=this.voice;this.voice=null;
    if(!voice)return;
    const now=this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);
    voice.gain.gain.linearRampToValueAtTime(0,now+seconds);
    voice.source.stop(now+seconds);
  }
  async setMuted(muted){
    this.muted=!!muted;const generation=++this.generation;this.silence(.2);
    if(!this.active){this.notify('idle');return;}
    if(this.muted){this.notify('muted');return;}
    await this.play(generation);
  }
  end({immediate=false}={}){
    this.active=false;++this.generation;
    this.silence(immediate?0:this.fadeSeconds);this.notify('idle');
  }
  dispose(){this.end({immediate:true});this.context?.close()?.catch(()=>{});this.context=null;this.buffer=null;}
}
