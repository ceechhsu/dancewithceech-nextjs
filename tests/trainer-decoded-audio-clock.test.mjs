import test from 'node:test';
import assert from 'node:assert/strict';
import * as alignment from '../public/practice/audio-alignment.mjs';
import * as video from '../public/practice/local-video.mjs';

test('the same AAC recording exposes its actual decoded origin with and without Apple priming removal',()=>{
 assert.equal(typeof alignment.inferDecodedAudioClock,'function');
 const timeline={codec:'mp4a.40.2',sampleRate:48000,first:0,duration:12.4586666667};
 const chrome=alignment.inferDecodedAudioClock(timeline,{sampleRate:16000,length:199338});
 const safari=alignment.inferDecodedAudioClock(timeline,{sampleRate:16000,length:198634});
 assert.equal(chrome.known,true);assert.equal(chrome.offset,0);
 assert.equal(safari.known,true);assert.equal(safari.offset,-.044);
});
test('an explicit audio edit retains the edited movie origin; unrecognized trimming is never guessed',()=>{
 assert.equal(typeof alignment.inferDecodedAudioClock,'function');
 const edited={codec:'mp4a.40.2',sampleRate:48000,first:0,duration:12.6,editDuration:12.573,mediaStart:.0213333333};
 assert.equal(alignment.inferDecodedAudioClock(edited,{sampleRate:16000,length:201168}).offset,0);
 assert.equal(alignment.inferDecodedAudioClock({...edited,editDuration:undefined},{sampleRate:16000,length:1000}).known,false);
});
test('Safari video normalization and already-trimmed audio require only their remaining difference',()=>{
 assert.equal(typeof video.audioPlaybackShift,'function');
 const record={videoTimeline:{clockOffset:-.043333333333},audioAlignment:{decodeClocks:{student:{known:true,offset:-.044},reference:{known:true,offset:0}}}};
 assert.ok(Math.abs(video.audioPlaybackShift(record,'student')-.000666666667)<1e-10);
 assert.equal(video.audioPlaybackShift(record,'reference'),0);
});
