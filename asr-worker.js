
import {pipeline,env} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';
let asr=null,key='';
self.onmessage=async e=>{
  const{audio,model,lang}=e.data;
  try{
    if(!asr||key!==model){
      self.postMessage({type:'status',text:'A carregar o modelo…'});
      asr=await pipeline('automatic-speech-recognition',model,{device:'wasm',progress_callback:p=>{
        if(p.status==='progress')self.postMessage({type:'progress',progress:p.progress||0});
      }});
      key=model;
    }
    self.postMessage({type:'status',text:'A transcrever… (pode demorar)'});
    const o={task:'transcribe',return_timestamps:'word',chunk_length_s:30,stride_length_s:5};
    if(lang)o.language=lang;
    const out=await asr(audio,o);
    self.postMessage({type:'done',chunks:out.chunks||[]});
  }catch(err){self.postMessage({type:'error',message:String((err&&err.message)||err)});}
};
