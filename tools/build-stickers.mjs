#!/usr/bin/env node
// 生成橘团表情包的图片文件：
//   stickers/gif/NN-id.gif   240×240 透明背景动图（微信表情主图规格）
//   stickers/png/NN-id.png   480×480 高清静态图
//   stickers/judan-stickers.zip  上面两样打包，带使用说明
// 画法全在 stickers/judan.js 里；这里只是用 Chromium 把它跑一遍再存盘。
// 用法：node tools/build-stickers.mjs（需要 playwright）
import http from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// 用 require 加载，这样全局安装（NODE_PATH）或本地安装的 playwright 都能找到
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'stickers');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2' };

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  if (url === '/__blank') {
    res.writeHead(200, { 'content-type': TYPES['.html'] });
    return res.end('<!doctype html><meta charset="utf-8"><title>build</title>');
  }
  const file = path.join(root, path.normalize(url));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
let items;
try {
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('[page]', e));
  await page.goto(base + '/__blank');
  items = await page.evaluate(async () => {
    const m = await import('/stickers/judan.js');
    if (!(await m.loadFont())) throw new Error('font failed to load');
    const b64 = u8 => {
      let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const res = [];
    for (const st of m.STICKERS) {
      const gif = await m.makeGIF(st);
      const png = new Uint8Array(await (await m.makePNG(st)).arrayBuffer());
      res.push({ id: st.id, text: st.text, gif: b64(gif), png: b64(png) });
    }
    return res;
  });
} finally {
  await browser.close();
  server.close();
}

await rm(path.join(outDir, 'gif'), { recursive: true, force: true });
await rm(path.join(outDir, 'png'), { recursive: true, force: true });
await mkdir(path.join(outDir, 'gif'), { recursive: true });
await mkdir(path.join(outDir, 'png'), { recursive: true });

const entries = [];
const plain = s => s.replace(/[！？!?，。,.\s]/g, '');
for (const [i, it] of items.entries()) {
  const nn = String(i + 1).padStart(2, '0');
  const gif = Buffer.from(it.gif, 'base64');
  const png = Buffer.from(it.png, 'base64');
  await writeFile(path.join(outDir, 'gif', `${nn}-${it.id}.gif`), gif);
  await writeFile(path.join(outDir, 'png', `${nn}-${it.id}.png`), png);
  entries.push({ name: `橘团表情包/动图GIF/${nn}-${plain(it.text)}.gif`, data: gif });
  entries.push({ name: `橘团表情包/高清PNG/${nn}-${plain(it.text)}.png`, data: png });
  console.log(`${nn} ${it.text.padEnd(5, '　')} gif ${(gif.length / 1024).toFixed(0).padStart(4)} KB   png ${(png.length / 1024).toFixed(0).padStart(4)} KB`);
}
const readme = [
  '橘团表情包',
  '',
  '动图GIF：240×240，透明背景，微信表情的标准尺寸。',
  '高清PNG：480×480 静态图，适合 QQ、Telegram 或打印贴纸。',
  '',
  '加到微信：',
  '1. 把 GIF 传到手机相册（或发给「文件传输助手」）。',
  '2. 微信聊天里点笑脸 → 爱心那一栏 → 「+」→ 从相册选这张图。',
  '   发给文件传输助手的话，长按图片 → 「添加到表情」更快。',
  '',
  '想改字：打开 https://helloevan123.github.io/hello-yifan/stickers/ ，点任意一张 → 改字。',
  '',
  '文字字体：站酷快乐体（ZCOOL KuaiLe），SIL Open Font License 1.1。',
  '',
].join('\r\n');
entries.push({ name: '橘团表情包/使用说明.txt', data: Buffer.from('﻿' + readme, 'utf8') });
const zipPath = path.join(outDir, 'judan-stickers.zip');
const zip = makeZip(entries);
await writeFile(zipPath, zip);
console.log(`zip ${(zip.length / 1024).toFixed(0)} KB → ${path.relative(root, zipPath)}`);

/* 最小的 ZIP 写入器：不压缩（GIF/PNG 本身已压缩），文件名用 UTF-8 标记，Windows/macOS 都能正常显示中文 */
function makeZip(files) {
  const table = new Uint32Array(256).map((_, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = buf => {
    let c = 0xffffffff;
    for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const time = (0 << 11) | (0 << 5), date = ((2026 - 1980) << 9) | (11 << 5) | 7; // 固定时间，重复构建结果一致
  const locals = [], centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), crc = crc32(f.data), size = f.data.length;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(size, 18); lh.writeUInt32LE(size, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, f.data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(0, 10); ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(size, 20); ch.writeUInt32LE(size, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += 30 + name.length + size;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
