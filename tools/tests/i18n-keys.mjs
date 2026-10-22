import fs from 'fs';
const i18n = await import(new URL('../../public/js/i18n.js', import.meta.url));
const D = i18n.DICT || i18n.default || i18n;
const dicts = Object.values(i18n).filter(v => v && typeof v === 'object' && v.ar && v.en)[0];
const app = fs.readFileSync(new URL('../../public/js/app.js', import.meta.url),'utf8');
const html = fs.readFileSync(new URL('../../public/index.html', import.meta.url),'utf8');
const keys = new Set([...app.matchAll(/\bt\('([A-Za-z0-9_]+)'/g)].map(m=>m[1]));
for (const m of html.matchAll(/data-i18n(?:-html)?="([A-Za-z0-9_]+)"/g)) keys.add(m[1]);
for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) m[1].split(',').forEach(p=>keys.add(p.split(':')[1].trim()));
for (const lang of ['ar','en']) { const miss=[...keys].filter(k=>!(k in dicts[lang])); console.log(lang,'missing',miss); }
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const used = new Set([...app.matchAll(/(?:\$|getElementById)\('#?([A-Za-z][\w-]*)'\)/g)].map(m=>m[1]));
console.log('ids used in js but not in html:', [...used].filter(i=>!ids.has(i)));
