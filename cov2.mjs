import { chromium } from "playwright";
import postcss from "postcss";
const b = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const usedSet = [];
let text;
for (const vp of [{width:412,height:900},{width:1350,height:940}]) {
const p = await b.newPage({viewport:vp});
await p.coverage.startCSSCoverage();
await p.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,100))}});
const [c] = await p.coverage.stopCSSCoverage(); text=c.text; usedSet.push(...c.ranges);
}
await b.close();
const used = new Uint8Array(text.length); for (const r of usedSet) used.fill(1,r.start,r.end);
const root = postcss.parse(text); const agg = {};
root.walkRules(r=>{ if (r.nodes.some(n=>n.type==="rule")) return; const s=r.source.start.offset, e=r.source.end.offset; let u=0; for(let i=s;i<e;i++) u+=used[i]; if(u===0){const key=r.selector.slice(0,60); agg[key]=(agg[key]||0)+(e-s);} });
const tot=Object.values(agg).reduce((a,b)=>a+b,0); console.log("unused rules bytes",tot);
Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,80).forEach(([k,v])=>console.log(v,k));
