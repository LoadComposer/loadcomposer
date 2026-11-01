// Build-time reuse of audited geometry. No dynamic evaluation in the product.
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),site=path.join(root,'site');
const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
const section=(from,to)=>{const a=html.indexOf('    function '+from+'('),b=html.indexOf('    function '+to+'(',a);if(a<0||b<a)throw Error('Geometry boundary missing: '+from);return html.slice(a,b);};
function producer(from,to,name){let s=section(from,to);s=s.replace('function '+from+'(input)', 'function '+name+'(input, CONTAINERS)');s=s.replaceAll('      lastCbmTotal = cbmTotal;\n','').replaceAll('      lastCalculationInput = input;\n','');s=s.replace('      lastResults = CONTAINERS.map(', '      return CONTAINERS.map(');s=s.replace(/        result.validation = validateResultGeometry\(result\);[\s\S]*?        return result;/,'        return result;');const end=s.indexOf('      renderSummary(cbmTotal, input);');if(end<0)throw Error('Producer end missing');return s.slice(0,end)+'    }\n';}
const producers=producer('calculateSingle','calculateMixed','computeSingle')+producer('calculateMixed','resultMatchesActiveFilter','computeMixed');
const api='globalThis.loadComposerComputationCore = Object.freeze({one(input, container) { return (input.mode === "mixed" ? computeMixed : computeSingle)(input, [container])[0]; }});\n';
fs.writeFileSync(path.join(site,'computation-core.js'),'/* Generated from site/index.html by build-computation-v1.5.0.mjs. */\n'+producers+api);
const constants=html.slice(html.indexOf('    const MAX_TOTAL_PALLETS ='),html.indexOf('    let lastResults ='))+'\nconst mixedOrientationSearchCache = new Map();\n';
const geometry=section('fitCount','geometryIssue')+section('approximatelyEqual','validateMixedReference')+section('expandMixedItems','showValidationMessage');
if(/\b(document|els)\b/.test(geometry))throw Error('DOM dependency in worker geometry');
const worker='"use strict";\n'+constants+'\nconst t = key => key;const formatInt=String;\n'+geometry+'\n'+fs.readFileSync(path.join(site,'advanced-stacking-engine.js'),'utf8')+'\n'+producers+api+`
self.onmessage = event => {
  const job = event.data;
  try {
    if (!job || job.kind !== 'compute' || !Number.isSafeInteger(job.version) ||
        !job.input || !Array.isArray(job.containers) || job.containers.length > 12) throw new Error('Invalid computation request');
    for (let index = 0; index < job.containers.length; index++) {
      self.postMessage({kind:'progress',version:job.version,index});
      const started = performance.now();
      const result = loadComposerComputationCore.one(job.input, job.containers[index]);
      delete result.input; delete result.container;
      self.postMessage({ kind:'result', version:job.version, index, result, computeMs:performance.now()-started });
    }
    self.postMessage({kind:'complete',version:job.version,count:job.containers.length});
  } catch (_) { self.postMessage({kind:'failure',version:job?.version}); }
};
self.postMessage({kind:'ready'});
`;
const encoded=JSON.stringify(worker).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
fs.writeFileSync(path.join(site,'computation-worker-source.js'),'/* Generated static Worker program; contains no eval/import/network calls. */\nglobalThis.loadComposerWorkerSource = '+encoded+';\n');
console.log('Computation sources generated:',worker.length,'Worker characters; original geometric helpers reused');
