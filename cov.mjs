import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/usr/bin/chromium" });
for (const vp of [{width:412,height:900},{width:1350,height:940}]) {
const p = await b.newPage({viewport:vp});
await p.coverage.startCSSCoverage();
await p.goto(process.argv[2]||"http://localhost:4173/", { waitUntil: "networkidle" });
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,100))}});
const cov = await p.coverage.stopCSSCoverage();
for (const c of cov) { const used = c.ranges.reduce((s,r)=>s+r.end-r.start,0); console.log(vp.width, c.url.slice(-40), c.text.length, "used", used, "unused", c.text.length-used); }
}
await b.close();
