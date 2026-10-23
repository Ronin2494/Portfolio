import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const script=readFileSync(new URL('../neural-field.js',import.meta.url),'utf8');

test('neural paths render in bounded batches and preserve the idle starting frame',()=>{
 const metrics={strokes:0,fills:0,paths:0,lines:0,arcs:0};
 class Path2D{
  constructor(){metrics.paths++;}
  moveTo(){}
  quadraticCurveTo(){metrics.lines++;}
  arc(){metrics.arcs++;}
 }
 const gradient={addColorStop(){}};
 const ctx={
  setTransform(){},fillRect(){},createRadialGradient:()=>gradient,
  stroke(){metrics.strokes++;},
  fill(){metrics.fills++;}
 };
 const canvas={clientWidth:390,clientHeight:840,getContext:()=>ctx,isConnected:true};
 const stage={dataset:{neuralProgress:'0',neuralPaused:'false'}};
 const callbacks=[];
 let idle;
 const window={
  innerWidth:390,devicePixelRatio:2,
  matchMedia:query=>({matches:query.includes('max-width')}),
  addEventListener(){},
  requestIdleCallback:fn=>{idle=fn;}
 };
 const document={getElementById:id=>id==='neural-field'?canvas:stage,hidden:false};
 vm.runInNewContext(script,{window,document,Math,Path2D,requestAnimationFrame:fn=>callbacks.push(fn)});
 assert.equal(metrics.strokes,0,'neural painting should not block initial hero text');
 assert.equal(metrics.paths,0,'no paths should be allocated before idle');
 idle();
 assert.equal(callbacks.length,1);
 callbacks.shift()(100);
 assert.ok(metrics.lines>100,'neuronal network should retain dense synaptic connections');
 assert.ok(metrics.arcs>100,'neuronal bodies remain present');
 assert.ok(metrics.strokes<=5,'batched axon strokes rather than one draw per neuron');
 assert.ok(metrics.fills<=9,'batched neuron fills rather than one fill per neuron');
 assert.equal(metrics.paths,15,'five paths per each of three layers');
});
test('a reduced-motion user still receives a static neural image on idle',()=>{
 assert.match(script,/if\(frozen&&Math\.abs\(p-lastProgress\)<\.001\)return/);
 assert.match(script,/const axons=new Path2D\(\),mint=new Path2D\(\),violet=new Path2D\(\)/);
 assert.match(script,/const budget=window\.innerWidth<700\?1450:3100/);
});
