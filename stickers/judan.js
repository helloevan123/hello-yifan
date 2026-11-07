// 橘团表情包：角色画法、16 张表情的动画，以及 GIF / PNG 导出。
// 构建脚本（tools/build-stickers.mjs）和网页（stickers/index.html）共用这一份代码，
// 所以网页上「改字」做出来的图和仓库里的成品长得完全一样。
import { GIFEncoder, quantize, applyPalette } from './vendor/gifenc.esm.js';

export const SIZE = 240; // 微信表情主图规格：240×240
const TAU = Math.PI * 2;
const LW = 4.5; // 角色描边粗细（240 画布里的单位）

const C = {
  line: '#4a2c1d', body: '#ffb04f', stripe: '#ef8a2c', belly: '#fff2dc',
  ear: '#ffc2b0', blush: '#ff7b7b', nose: '#ff8a8a', eye: '#3a2215',
  mouth: '#9a3b2b', tongue: '#ff8f8f', pad: '#ffa3b5', heart: '#ff5c7a',
  drop: '#8fd4ff', gold: '#ffcf3f',
};

/* ---------- 小工具 ---------- */
const n = v => Math.round(v * 100) / 100;
const sin = x => Math.sin(TAU * x);
const cos = x => Math.cos(TAU * x);
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;
const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
const T = (x, y, r = 0, s = 1) =>
  `translate(${n(x)} ${n(y)})${r ? ` rotate(${n(r)})` : ''}${s !== 1 ? ` scale(${n(s)})` : ''}`;
const stroke = (w, col = C.line) =>
  `fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"`;
// 先描一圈深色，再盖一层彩色：给线条类小道具（Z、问号、波浪线）加描边
const duo = (d, col, w = 4, ow = 2.6) => `<path d="${d}" ${stroke(w + ow * 2)}/><path d="${d}" ${stroke(w, col)}/>`;
// 绕“肩膀”转的爪子：a 是离正上方的角度（顺时针为正）
const swing = (px, py, len, a, extra = {}) => {
  const r = (a * Math.PI) / 180;
  return { x: px + len * Math.sin(r), y: py - len * Math.cos(r), r: a, ...extra };
};
const burst = (cx, cy, r1, r2, angles, col = C.line, w = 3.4) =>
  angles
    .map(a => {
      const r = (a * Math.PI) / 180, s = Math.sin(r), c = Math.cos(r);
      return `<path d="M${n(cx + r1 * s)} ${n(cy - r1 * c)}L${n(cx + r2 * s)} ${n(cy - r2 * c)}" ${stroke(w, col)}/>`;
    })
    .join('');

/* ---------- 角色：橘团（一只圆滚滚的小橘猫） ---------- */
// 局部坐标：身体中心在 (0,0)，脚底大约在 y=48
const BODY = 'M0 48C38 48 62 40 62 12C62-28 34-50 0-50C-34-50-62-28-62 12C-62 40-38 48 0 48Z';
const EAR = 'M-55-21Q-59-55-50-62Q-44-67-36-59L-19-45Z';
const EAR_IN = 'M-49.5-30Q-52-51-47.5-55.5Q-44-58-40-53.5L-28.5-44Z';
const TAIL = 'M42 30C68 36 82 18 77-2';
const STAR4 = 'M0-10Q1.8-1.8 10 0Q1.8 1.8 0 10Q-1.8 1.8-10 0Q-1.8-1.8 0-10Z';

function eye(type, x, y, side) {
  const E = C.eye;
  switch (type) {
    case 'happy':
      return `<path d="M${n(x - 7)} ${n(y + 2.5)}Q${n(x)} ${n(y - 7.5)} ${n(x + 7)} ${n(y + 2.5)}" ${stroke(4.2, E)}/>`;
    case 'closed':
      return `<path d="M${n(x - 7)} ${n(y - 1)}Q${n(x)} ${n(y + 6)} ${n(x + 7)} ${n(y - 1)}" ${stroke(4.2, E)}/>`;
    case 'line':
      return `<path d="M${n(x - 7)} ${n(y + 1)}H${n(x + 7)}" ${stroke(4.2, E)}/>`;
    case 'meh':
      return `<path d="M${n(x - 7.5)} ${n(y - 1)}H${n(x + 7.5)}A7.5 7.5 0 0 1 ${n(x - 7.5)} ${n(y - 1)}Z" fill="${E}"/>` +
        `<path d="M${n(x - 9)} ${n(y - 1.5)}H${n(x + 9)}" ${stroke(3.4, E)}/>` +
        `<circle cx="${n(x - 2.6)}" cy="${n(y + 2.4)}" r="1.6" fill="#fff"/>`;
    case 'squint':
      return side < 0
        ? `<path d="M${n(x - 6)} ${n(y - 6.5)}L${n(x + 5)} ${n(y)}L${n(x - 6)} ${n(y + 6.5)}" ${stroke(4.2, E)}/>`
        : `<path d="M${n(x + 6)} ${n(y - 6.5)}L${n(x - 5)} ${n(y)}L${n(x + 6)} ${n(y + 6.5)}" ${stroke(4.2, E)}/>`;
    case 'teary':
      return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="8.2" ry="9.4" fill="${E}"/>` +
        `<circle cx="${n(x - 2.8)}" cy="${n(y - 3.6)}" r="3.3" fill="#fff"/><circle cx="${n(x + 2.9)}" cy="${n(y + 3.4)}" r="1.6" fill="#fff"/>` +
        `<path d="M${n(x - 6)} ${n(y + 4.6)}Q${n(x)} ${n(y + 9.8)} ${n(x + 6)} ${n(y + 4.6)}" ${stroke(2.4, '#9fdcff')}/>`;
    case 'sparkle':
      return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="8.2" ry="9.4" fill="${E}"/>` +
        `<path d="${STAR4}" transform="${T(x - 2.4, y - 3, 0, 0.46)}" fill="#fff"/>` +
        `<circle cx="${n(x + 3)}" cy="${n(y + 3.7)}" r="1.7" fill="#fff"/>`;
    case 'wide':
      return `<circle cx="${n(x)}" cy="${n(y)}" r="9.6" fill="#fff" stroke="${E}" stroke-width="3"/><circle cx="${n(x)}" cy="${n(y)}" r="3.2" fill="${E}"/>`;
    default: // 'dot'
      return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="6.3" ry="7.3" fill="${E}"/><circle cx="${n(x - 1.9)}" cy="${n(y - 2.7)}" r="2.4" fill="#fff"/>`;
  }
}

function brows(type, [lx, ly]) {
  if (!type) return '';
  const d = {
    angry: s => `M${n(s * 31 + lx)} ${n(-18 + ly)}L${n(s * 14 + lx)} ${n(-11 + ly)}`,
    sad: s => `M${n(s * 30 + lx)} ${n(-11 + ly)}L${n(s * 14 + lx)} ${n(-17 + ly)}`,
  }[type];
  return [-1, 1].map(s => `<path d="${d(s)}" ${stroke(3.8, C.eye)}/>`).join('');
}

function mouth(type, k = 0) {
  const L = C.line;
  const nose = `<path d="M-3.4 5.2Q0 3.6 3.4 5.2Q1.6 8.6 0 8.6Q-1.6 8.6-3.4 5.2Z" fill="${C.nose}"/>`;
  const openM = (w, d) =>
    `<path d="M${-w} 10Q0 12 ${w} 10Q${w - 1} ${10 + d} 0 ${10 + d}Q${1 - w} ${10 + d} ${-w} 10Z" fill="${C.mouth}" stroke="${L}" stroke-width="2.8" stroke-linejoin="round"/>` +
    `<path d="M${-w * 0.55} ${10 + d * 0.7}Q0 ${10 + d * 0.45} ${w * 0.55} ${10 + d * 0.7}Q${w * 0.45} ${10 + d - 0.6} 0 ${10 + d - 0.6}Q${-w * 0.45} ${10 + d - 0.6} ${-w * 0.55} ${10 + d * 0.7}Z" fill="${C.tongue}"/>`;
  switch (type) {
    case 'open': return nose + openM(9, 13);
    case 'laugh': return nose + openM(12, 17);
    case 'o': return nose + `<ellipse cx="0" cy="14.5" rx="4.4" ry="5.2" fill="${C.mouth}" stroke="${L}" stroke-width="2.6"/>`;
    case 'O': return nose + `<ellipse cx="0" cy="18" rx="7.5" ry="9.5" fill="${C.mouth}" stroke="${L}" stroke-width="2.8"/>`;
    case 'flat': return nose + `<path d="M-6 13H6" ${stroke(3.1, L)}/>`;
    case 'wobble': return nose + `<path d="M-10 14.5Q-7.5 10.5-5 14.5T0 14.5T5 14.5T10 14.5" ${stroke(2.9, L)}/>`;
    case 'frown': return nose + `<path d="M-7 16.5Q0 10 7 16.5" ${stroke(3.1, L)}/>`;
    case 'munch':
      return nose + `<path d="M-8.5 9.5Q-4.2 ${n(15.5 + 3 * k)} 0 ${n(10 + 2.5 * k)}Q4.2 ${n(15.5 + 3 * k)} 8.5 9.5" ${stroke(3.1, L)}/>`;
    default: return nose + `<path d="M-8.5 9.5Q-4.2 15.5 0 10Q4.2 15.5 8.5 9.5" ${stroke(3.1, L)}/>`; // 'w'
  }
}

function paw(p, fill) {
  if (!p) return '';
  const { x, y, r = 0, s = 1, pad = false, flat = false } = p;
  if (flat) return `<g transform="${T(x, y, r, s)}"><ellipse rx="14" ry="8" fill="${fill}" stroke="${C.line}" stroke-width="${n(LW * 0.85)}"/><path d="M-6.5-7.6V-3.6M-1.5-8V-4" ${stroke(2.2)}/></g>`;
  const inner = pad
    ? `<ellipse cy="2.2" rx="4.6" ry="3.6" fill="${C.pad}"/><circle cx="-4.7" cy="-3.6" r="2" fill="${C.pad}"/><circle cy="-5.6" r="2" fill="${C.pad}"/><circle cx="4.7" cy="-3.6" r="2" fill="${C.pad}"/>`
    : `<path d="M-3.4-8.9V-4.8M3.4-8.9V-4.8" ${stroke(2.2)}/>`;
  return `<g transform="${T(x, y, r, s)}"><ellipse rx="10.5" ry="9.2" fill="${fill}" stroke="${C.line}" stroke-width="${n(LW * 0.85)}"/>${inner}</g>`;
}

// 一小截胳膊 + 爪子，画在身体后面，这样爪子举起来时看得出是从身上伸出来的
function limb(sx, sy, p, fill) {
  const d = `M${n(sx)} ${n(sy)}L${n(p.x)} ${n(p.y)}`;
  return `<path d="${d}" ${stroke(13 + LW * 1.7)}/><path d="${d}" ${stroke(13, fill)}/>` + paw(p, fill);
}

function earSVG(angle, fill) {
  return `<g transform="rotate(${n(-angle)} -38 -36)"><path d="${EAR}" fill="${fill}" stroke="${C.line}" stroke-width="${LW}" stroke-linejoin="round"/><path d="${EAR_IN}" fill="${C.ear}"/></g>`;
}

function tailSVG(angle, fill) {
  if (angle === null || angle === false) return '';
  return `<g transform="rotate(${n(angle)} 42 30)"><path d="${TAIL}" ${stroke(12 + LW * 1.7)}/><path d="${TAIL}" ${stroke(12, fill)}/>` +
    `<path d="${TAIL}" fill="none" stroke="${C.stripe}" stroke-width="12" stroke-dasharray="4 8" stroke-dashoffset="-30"/></g>`;
}

/**
 * 画一只橘团。所有参数都可省略。
 * sx/sy：以脚底为中心的挤压拉伸；rot：以脚底为中心的旋转；face：五官整体偏移；look：眼睛偏移
 * armL/armR：爪子 {x,y,r,s,pad}（坐标按未挤压的身体给，会自动跟着身体走），null 表示不画
 * clip：画在身体里面（会被身体轮廓裁掉）；hat：画在头上；mid：画在身体前、爪子后；front：最前面
 */
function cat(o = {}) {
  const fill = o.body || C.body;
  const sx = o.sx ?? 1, sy = o.sy ?? 1;
  const look = o.look || [0, 0];
  const face = o.face || [0, 0];
  const map = p => p && { ...p, x: p.x * sx, y: 48 + (p.y - 48) * sy };
  const armL = o.armL === undefined ? { x: -50, y: 26, r: 25 } : o.armL;
  const armR = o.armR === undefined ? { x: 50, y: 26, r: -25 } : o.armR;
  const feet = o.feet === false ? '' : [-1, 1]
    .map(s => `<ellipse cx="${s * 22}" cy="47" rx="12.5" ry="7.5" fill="${fill}" stroke="${C.line}" stroke-width="${n(LW * 0.85)}"/>`)
    .join('');
  const ears = o.ears === false ? '' : earSVG(o.earL || 0, fill) + `<g transform="scale(-1 1)">${earSVG(o.earR || 0, fill)}</g>`;
  const eyesSVG = [-1, 1].map(s => eye(o.eyes || 'dot', s * 22 + look[0], look[1], s)).join('');
  const blush = o.blush ?? 1;
  const blushSVG = blush > 0
    ? [-1, 1].map(s => `<ellipse cx="${s * 38}" cy="13" rx="9" ry="5.6" fill="${C.blush}" opacity="${n(Math.min(1, 0.5 * blush))}"/>`).join('')
    : '';
  const stripes = o.stripes === false ? '' : `<path d="M-12-54L-10-40M0-56V-41M12-54L10-40" ${stroke(4.2, C.stripe)}/>`;
  const squash = `translate(0 48) scale(${n(sx)} ${n(sy)}) translate(0 -48)`;
  return `<g transform="rotate(${n(o.rot || 0)} 0 48)">${o.back || ''}<g transform="${squash}">` +
    tailSVG(o.tail ?? 0, fill) + feet + ears +
    `<path d="${BODY}" fill="${fill}"/>` +
    `<g clip-path="url(#bc)"><ellipse cx="0" cy="42" rx="30" ry="14" fill="${C.belly}"/>${stripes}` +
    `<ellipse cx="-32" cy="-26" rx="11" ry="6" transform="rotate(-40 -32 -26)" fill="#fff" opacity=".45"/>${o.clip || ''}</g>` +
    `<path d="${BODY}" fill="none" stroke="${C.line}" stroke-width="${LW}"/>` +
    `<g transform="translate(${n(face[0])} ${n(face[1])})">${blushSVG}${eyesSVG}${brows(o.brows, look)}${mouth(o.mouth || 'w', o.chew)}${o.faceExtra || ''}</g>` +
    (o.hat || '') + `</g>` +
    (o.mid || '') + paw(map(armL), fill) + paw(map(armR), fill) + (o.front || '') + `</g>`;
}

/* ---------- 道具 ---------- */
function heart(x, y, s = 1, fill = C.heart, r = 0) {
  if (s <= 0.03) return '';
  return `<g transform="${T(x, y, r, s)}"><path d="M0 12C-6 7.5-15 1-15-6C-15-11.5-11-14.5-7-14.5C-4-14.5-1.5-12.5 0-10C1.5-12.5 4-14.5 7-14.5C11-14.5 15-11.5 15-6C15 1 6 7.5 0 12Z" fill="${fill}" stroke="${C.line}" stroke-width="3.4" stroke-linejoin="round"/>` +
    `<ellipse cx="-7" cy="-6.5" rx="3.2" ry="2.1" transform="rotate(-35 -7 -6.5)" fill="#fff" opacity=".9"/></g>`;
}
function drop(x, y, s = 1, r = 0, fill = C.drop) {
  if (s <= 0.03) return '';
  return `<g transform="${T(x, y, r, s)}"><path d="M0-10C3.5-4.5 6.5-1 6.5 3A6.5 6.5 0 0 1-6.5 3C-6.5-1-3.5-4.5 0-10Z" fill="${fill}" stroke="${C.line}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<ellipse cx="-2.3" cy="2.8" rx="1.5" ry="2.3" fill="#fff"/></g>`;
}
function sparkle(x, y, s = 1, fill = C.gold, r = 0) {
  if (s <= 0.03) return '';
  return `<g transform="${T(x, y, r, s)}"><path d="${STAR4}" fill="${fill}" stroke="${C.line}" stroke-width="2.4" stroke-linejoin="round"/></g>`;
}
function check(x, y, s = 1) {
  if (s <= 0.03) return '';
  return `<g transform="${T(x, y, 0, s)}"><circle r="12.5" fill="#3cc46b" stroke="${C.line}" stroke-width="3"/><path d="M-6 0.5L-1.8 4.8L6.2-4.2" ${stroke(3.8, '#fff')}/></g>`;
}
function zee(x, y, s = 1, col = '#8b7cf6') {
  if (s <= 0.03) return '';
  return `<g transform="${T(x, y, -10, s)}">${duo('M-6.5-7H6.5L-6.5 7H6.5', col, 4.4, 2.5)}</g>`;
}
function qmark(x, y, s = 1, r = 0, col = '#6c7bff') {
  return `<g transform="${T(x, y, r, s)}">${duo('M-8-7C-8-17.5 8-17.5 8-7C8-1 0 0 0 6.5', col, 6, 2.8)}` +
    `<circle cy="16" r="5.4" fill="${col}" stroke="${C.line}" stroke-width="2.8"/></g>`;
}
function anger(x, y, s = 1, col = '#ff4d4d') {
  const arm = 'M-3.5-11Q-3.5-3.5-11-3.5';
  const rs = [0, 90, 180, 270];
  return `<g transform="${T(x, y, 0, s)}">` +
    rs.map(a => `<path d="${arm}" transform="rotate(${a})" ${stroke(10.2)}/>`).join('') +
    rs.map(a => `<path d="${arm}" transform="rotate(${a})" ${stroke(5, col)}/>`).join('') + `</g>`;
}
function puff(x, y, s = 1, fill = '#ffffff') {
  if (s <= 0.03) return '';
  const cs = [[0, -3, 7.5], [-7.5, 2, 6], [7.5, 2, 6], [0, 4, 6.5]];
  return `<g transform="${T(x, y, 0, s)}">` +
    cs.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r + 2.7}" fill="${C.line}"/>`).join('') +
    cs.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`).join('') + `</g>`;
}
function coin(x, y, s = 1, spin = 1) {
  const k = Math.max(0.14, Math.abs(spin));
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(k * s)} ${n(s)})"><circle r="11" fill="${C.gold}" stroke="${C.line}" stroke-width="3"/>` +
    `<circle r="7.3" fill="none" stroke="#eba51c" stroke-width="2"/>` +
    (Math.abs(spin) > 0.4 ? `<path d="M-3.6-4.6L0-0.6L3.6-4.6M0-0.6V5.2M-3.4 0.9H3.4M-3.4 3.5H3.4" ${stroke(1.9, '#b57300')}/>` : '') + `</g>`;
}
function melon(x, y, s = 1, r = 0) {
  const seeds = [[-9, 5, 30], [-2, 9, 0], [6, 7, -25], [11, 3, -40], [-14, 2, 50], [3, 3, 10]]
    .map(([sx, sy, a]) => `<ellipse cx="${sx}" cy="${sy}" rx="1.3" ry="2.1" transform="rotate(${a} ${sx} ${sy})" fill="${C.line}"/>`).join('');
  return `<g transform="${T(x, y, r, s)}"><path d="M-22 0A22 22 0 0 0 22 0Z" fill="#4bb05a" stroke="${C.line}" stroke-width="3.2" stroke-linejoin="round"/>` +
    `<path d="M-18.6 0A18.6 18.6 0 0 0 18.6 0Z" fill="#c9ef8a"/><path d="M-16 0A16 16 0 0 0 16 0Z" fill="#ff5d6c"/>${seeds}` +
    `<path d="M-22 0H22" ${stroke(3.2)}/></g>`;
}
function moon(x, y, s = 1) {
  return `<g transform="${T(x, y, -15, s)}"><path d="M-1.2-11.93A12 12 0 1 0 11.52 3.33A10 10 0 0 1-1.2-11.93Z" fill="#ffd84d" stroke="${C.line}" stroke-width="2.8" stroke-linejoin="round"/></g>`;
}
function nightcap(sway) {
  const tx = 68 + sway * 4, ty = -30 + sway * 3;
  const cap = `M-40-33C-36-62-4-80 30-70C48-64 ${n(tx - 4)} ${n(ty - 20)} ${n(tx)} ${n(ty)}C${n(tx - 10)} ${n(ty - 10)} 50-48 36-44Q0-58-40-33Z`;
  return `<path d="${cap}" fill="#7b8cff" stroke="${C.line}" stroke-width="${LW}" stroke-linejoin="round"/>` +
    `<circle cx="6" cy="-62" r="2.4" fill="#ffe27a"/><circle cx="26" cy="-60" r="2" fill="#ffe27a"/><circle cx="-14" cy="-52" r="2" fill="#ffe27a"/>` +
    `<path d="M-42-32Q0-62 38-43" ${stroke(10 + 6.4)}/><path d="M-42-32Q0-62 38-43" ${stroke(10, '#ffffff')}/>` +
    `<circle cx="${n(tx)}" cy="${n(ty + 3)}" r="7.5" fill="#fff" stroke="${C.line}" stroke-width="3.2"/>`;
}
function headband(t) {
  const w1 = sin(t * 4) * 4, w2 = sin(t * 4 + 0.25) * 4;
  const tails = `M54-29Q66-${n(36 + w1)} 76-${n(31 + w1)}` + `M54-29Q68-${n(20 - w2)} 74-${n(12 - w2)}`;
  return {
    clip: `<path d="M-70-24Q0-52 70-24" ${stroke(11 + 6)}/><path d="M-70-24Q0-52 70-24" ${stroke(11, '#ff4d4d')}/>`,
    hat: duo(tails, '#ff4d4d', 6, 2.6) + `<circle cx="53" cy="-29" r="6" fill="#ff4d4d" stroke="${C.line}" stroke-width="3"/>`,
  };
}
const wavy = (x, y, s) => (s <= 0.03 ? '' : `<g transform="${T(x, y, 0, s)}">${duo('M-8 0Q-4-5 0 0T8 0', '#5ad1c4', 3.6, 2.3)}</g>`);

/* ---------- 16 张表情 ---------- */
const HOME_X = 120, HOME_Y = 106;
const home = (inner, dx = 0, dy = 0, s = 1) => `<g transform="${T(HOME_X + dx, HOME_Y + dy, 0, s)}">${inner}</g>`;

export const STICKERS = [
  {
    id: 'hello', text: '你好呀', color: '#ff8a3d', frames: 20, delay: 70, still: 0.1,
    draw(t) {
      const w = sin(2 * t), bob = (1 - cos(2 * t)) / 2, sp = (1 + sin(2 * t)) / 2;
      return home(
        cat({ mouth: 'open', armL: null, back: limb(-44, 14, swing(-46, 10, 32, -(40 + 18 * w), { pad: true, s: 1.12 }), C.body),
          tail: 14 * sin(2 * t), sy: 1 - 0.03 * bob, sx: 1 + 0.02 * bob,
          front: `<g transform="rotate(${n(-18 * w)} -46 10)"><path d="M-90-28Q-97-18-93-6M-82-44Q-88-42-92-36" ${stroke(3.2)}/></g>` }) +
        sparkle(86, -46, 0.35 + 0.35 * (1 - sp)) + sparkle(64, -78, 0.25 + 0.3 * sp),
        0, -3 * bob);
    },
    textAnim: t => ({ y: -2 * (1 - cos(2 * t)) / 2 }),
  },
  {
    id: 'roger', text: '收到！', color: '#2e9bff', frames: 20, delay: 75, still: 0.6,
    draw(t) {
      const k = ease(clamp01(t / 0.22)), snap = bump(t, 0.25, 0.06);
      const arm = { x: lerp(50, 31, k), y: lerp(26, -27, k) - 3 * snap, r: lerp(-25, -28, k), flat: k > 0.5 };
      const pop = clamp01((t - 0.22) / 0.06) * (1 + 0.3 * bump(t, 0.3, 0.05));
      return home(
        cat({ armR: arm, sy: 1 - 0.05 * snap, sx: 1 + 0.04 * snap, tail: 8 + 10 * snap, rot: -3 * k }) +
        check(80, -44, pop) + sparkle(-74, -34, 0.6 * pop) + sparkle(-58, -70, 0.4 * pop));
    },
    textAnim: t => ({ s: 1 + 0.18 * bump(t, 0.26, 0.07) }),
  },
  {
    id: 'haha', text: '哈哈哈哈', color: '#ffb800', frames: 16, delay: 60, still: 0.05,
    draw(t) {
      const sh = sin(4 * t), hop = Math.abs(sh);
      const tears = [-1, 1].map(side => {
        const p = (t * 2) % 1;
        return drop(side * (33 + 22 * p), -2 - 10 * p + 30 * p * p, 0.7, side * (50 + 60 * p));
      }).join('');
      return home(
        cat({ eyes: 'squint', mouth: 'laugh', blush: 1.3, rot: 7 * sh, tail: 20 * sh,
          armL: { x: -50, y: 22 - 5 * hop, r: 40 }, armR: { x: 50, y: 22 - 5 * hop, r: -40 }, front: tears }),
        0, -4 * hop);
    },
    textAnim: t => ({ r: 4 * sin(4 * t + 0.1), y: -2 * Math.abs(sin(4 * t)) }),
  },
  {
    id: 'love', text: '爱你', color: '#ff5a7a', frames: 20, delay: 70, still: 0.12,
    draw(t) {
      const beat = bump(t, 0.12, 0.06) + 0.7 * bump(t, 0.3, 0.06);
      const floats = [[-60, 0], [64, 1 / 3], [-2, 2 / 3]].map(([x, ph], i) => {
        const p = (t + ph) % 1;
        return heart(x + 5 * sin(p + i * 0.3), -48 - 42 * p, 0.62 * Math.sin(Math.PI * p));
      }).join('');
      return home(
        cat({ eyes: 'happy', blush: 1.7, tail: 10 * sin(t),
          armL: { x: -23, y: 30, r: 40 }, armR: { x: 23, y: 30, r: -40 }, mid: heart(0, 36, 1.2 + 0.22 * beat) }) + floats);
    },
    textAnim: t => ({ s: 1 + 0.07 * (bump(t, 0.12, 0.06) + 0.7 * bump(t, 0.3, 0.06)) }),
  },
  {
    id: 'thanks', text: '谢谢老板', color: '#ff9f1a', frames: 20, delay: 75, still: 0.45,
    draw(t) {
      const p = ease((1 - cos(t)) / 2);
      const coins = [[-84, 0], [86, 0.5]].map(([x, ph]) => {
        const q = (t + ph) % 1;
        return coin(x, -40 + 7 * sin(q), 1, cos(q));
      }).join('');
      return home(
        cat({ eyes: 'happy', blush: 1.2, sy: 1 - 0.1 * p, sx: 1 + 0.04 * p, face: [0, 7 * p], earL: 12 * p, earR: 12 * p, tail: 8,
          armL: { x: -7, y: 28 + 4 * p, r: 70 }, armR: { x: 7, y: 25 + 4 * p, r: -70 } }) + coins);
    },
    textAnim: t => ({ y: 3 * ease((1 - cos(t)) / 2) }),
  },
  {
    id: 'there', text: '在吗？', color: '#6c7bff', frames: 20, delay: 75, still: 0.25,
    draw(t) {
      const knock = Math.max(0, sin(2 * t)) ** 2;
      const blink = t > 0.6 && t < 0.68;
      const hits = knock > 0.75 ? burst(44, 20, 19, 33, [15, 55, 95], C.line, 3.8) : '';
      return home(
        cat({ eyes: blink ? 'line' : 'dot', mouth: 'o', rot: 8 * sin(t), tail: 12 * sin(2 * t),
          armR: { x: 44, y: 20, r: -15, s: 1 + 0.42 * knock, pad: true }, front: hits }) +
        qmark(74, -62 + 4 * sin(2 * t), 0.95, 12 + 8 * sin(t)));
    },
    textAnim: t => ({ r: 3 * sin(t) }),
  },
  {
    id: 'night', text: '晚安', color: '#8b7cf6', frames: 20, delay: 90, still: 0.5,
    draw(t) {
      const br = sin(t), r = 2.5 + 7 * (1 - cos(t)) / 2;
      const bubble = `<circle cx="${n(4 + r * 0.9)}" cy="${n(7 + r * 0.3)}" r="${n(r)}" fill="#dff3ff" stroke="${C.line}" stroke-width="2.2"/>` +
        `<circle cx="${n(4 + r * 0.6)}" cy="${n(7 - r * 0.15)}" r="${n(r * 0.26)}" fill="#fff"/>`;
      const zs = [0, 0.5].map(ph => {
        const p = (t + ph) % 1;
        return zee(56 + 18 * p, -58 - 28 * p, 0.5 + 0.5 * Math.sin(Math.PI * p));
      }).join('');
      const tw = (1 + sin(2 * t)) / 2;
      return home(
        cat({ eyes: 'closed', blush: 0.8, sy: 1 + 0.025 * br, sx: 1 - 0.015 * br, hat: nightcap(sin(t)), ears: false,
          armL: { x: -42, y: 34, r: 60 }, armR: { x: 42, y: 34, r: -60 }, tail: -30 + 5 * br, faceExtra: bubble }) +
        zs + moon(-80, -62, 1.15) + sparkle(-54, -84, 0.3 + 0.3 * tw, '#ffe27a') + sparkle(-100, -30, 0.25 + 0.3 * (1 - tw), '#ffe27a'));
    },
  },
  {
    id: 'wronged', text: '委屈', color: '#4da6ff', frames: 20, delay: 60, still: 0.3,
    draw(t) {
      const j = sin(t * 10) * 1.3;
      const tears = [-1, 1].map((side, i) => {
        const p = (t * 2 + i * 0.5) % 1;
        return p < 0.9 ? drop(side * 23, 10 + 32 * p, 0.62) : '';
      }).join('');
      return home(
        cat({ eyes: 'teary', brows: 'sad', mouth: 'wobble', blush: 1.3, tail: -20, earL: 22, earR: 22,
          armL: { x: -18, y: 32, r: 15 }, armR: { x: 18, y: 32, r: -15 }, faceExtra: tears }), j, 0);
    },
    textAnim: t => ({ x: sin(t * 10) * 0.8 }),
  },
  {
    id: 'speechless', text: '无语', color: '#8a9bb0', frames: 20, delay: 80, still: 0.92,
    draw(t) {
      const dots = [0, 1, 2].map(i => (t > 0.18 + 0.2 * i ? `<circle cx="${-16 + 16 * i}" cy="-84" r="5" fill="${C.line}"/>` : '')).join('');
      const ds = ease(clamp01(t / 0.25)), dy = 5 * ease(clamp01((t - 0.25) / 0.75));
      return home(cat({ eyes: 'meh', mouth: 'flat', blush: 0.35, tail: 6 * sin(t) }) + drop(60, -14 + dy, 1.1 * ds, 18) + dots);
    },
  },
  {
    id: 'cheer', text: '加油！', color: '#ff4d4d', frames: 16, delay: 70, still: 0.25,
    draw(t) {
      const u = ease(Math.max(0, sin(2 * t)));
      const hb = headband(t);
      const lines = u > 0.6 ? burst(-58, -26, 16, 24, [-80, -40, 0]) + burst(58, -26, 16, 24, [0, 40, 80]) : '';
      return home(
        cat({ brows: 'angry', mouth: 'open', sy: 1 + 0.05 * u, sx: 1 - 0.03 * u, tail: 20 * u, clip: hb.clip, hat: hb.hat,
          armL: { x: -50 - 6 * u, y: 22 - 46 * u, r: 25 - 10 * u }, armR: { x: 50 + 6 * u, y: 22 - 46 * u, r: -25 + 10 * u }, front: lines }),
        0, -6 * u);
    },
    textAnim: t => ({ s: 1 + 0.12 * ease(Math.max(0, sin(2 * t))) }),
  },
  {
    id: 'melon', text: '吃瓜', color: '#3cb371', frames: 16, delay: 80, still: 0,
    draw(t) {
      const ch = (1 - cos(4 * t)) / 2, my = 19 - 3 * ch;
      return home(cat({ look: [4, -1.5], mouth: 'munch', chew: ch, blush: 1.1, sx: 1 + 0.015 * ch, tail: 10 * sin(t),
        armL: { x: -24, y: my + 4, r: 60 }, armR: { x: 24, y: my + 4, r: -60 }, mid: melon(0, my, 1) }));
    },
  },
  {
    id: 'shock', text: '震惊', color: '#a066ff', frames: 20, delay: 70, still: 0.7,
    draw(t) {
      let dy = 0, sy = 1, sx = 1;
      if (t < 0.12) { const k = ease(t / 0.12); sy = 1 - 0.12 * k; sx = 1 + 0.08 * k; }
      else if (t < 0.42) { const k = Math.sin((Math.PI * (t - 0.12)) / 0.3); dy = -21 * k; sy = 1 + 0.1 * k; sx = 1 - 0.06 * k; }
      else if (t < 0.54) { const k = Math.sin((Math.PI * (t - 0.42)) / 0.12); sy = 1 - 0.1 * k; sx = 1 + 0.07 * k; }
      const after = t >= 0.42, g = ease(clamp01((t - 0.42) / 0.15));
      const gloom = after ? [-18, -9, 0, 9, 18].map(x => `<path d="M${x}-56V${n(-56 + 26 * g)}" ${stroke(2.8, '#7f8cff')}/>`).join('') : '';
      const jit = after ? sin(t * 12) * 1.2 : 0;
      return home(
        cat({ eyes: 'wide', mouth: 'O', sx, sy, earL: -14, earR: -14, tail: -50, clip: gloom,
          armL: { x: -56, y: 8, r: 70 }, armR: { x: 56, y: 8, r: -70 } }) +
        (after ? burst(0, -14, 80, 94, [-62, -44, -26, 26, 44, 62]) + drop(-60, -24, 0.85, -20) : ''),
        jit, dy);
    },
    textAnim: t => ({ x: t >= 0.42 ? sin(t * 12) : 0 }),
  },
  {
    id: 'humph', text: '哼！', color: '#ff5a3c', frames: 16, delay: 75, still: 0.3,
    draw(t) {
      const pf = (1 - cos(2 * t)) / 2, sh = sin(t * 8) * 1.2;
      const steam = [0, 0.5].map((ph, i) => {
        const p = (t + ph) % 1;
        return puff(i ? 22 : -22, -62 - 24 * p, 0.85 * Math.sin(Math.PI * p));
      }).join('');
      const flush = `<defs><linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4a2e" stop-opacity=".55"/><stop offset="1" stop-color="#ff4a2e" stop-opacity="0"/></linearGradient></defs>` +
        `<rect x="-64" y="-52" width="128" height="40" fill="url(#fl)"/>`;
      return home(
        cat({ look: [-3.5, 0], brows: 'angry', mouth: 'frown', blush: 1.7, sx: 1.03 + 0.03 * pf, sy: 1 + 0.02 * pf, clip: flush,
          tail: -10 + 12 * sin(t * 4), earL: 12, earR: 12, armL: { x: -10, y: 31, r: 50 }, armR: { x: 10, y: 33, r: -50 } }) +
        anger(76, -36, 0.9 + 0.15 * Math.abs(sin(t * 2))) + steam,
        sh, 0);
    },
    textAnim: t => ({ x: sin(t * 8) * 1, r: -3 }),
  },
  {
    id: 'please', text: '拜托拜托', color: '#ff77b7', frames: 20, delay: 70, still: 0.05,
    draw(t) {
      const rk = sin(2 * t);
      const sp = [[-76, -36, 0], [78, -24, 0.33], [-66, 30, 0.66], [72, 36, 0.15]]
        .map(([x, y, ph]) => sparkle(x, y, 0.3 + 0.45 * (1 + sin(t * 2 + ph)) / 2)).join('');
      return home(
        cat({ eyes: 'sparkle', brows: 'sad', blush: 1.4, rot: 6 * rk, tail: 12 * rk, earL: 10, earR: 10,
          armL: { x: -7, y: 25, r: 20 }, armR: { x: 7, y: 25, r: -20 } }) + sp);
    },
    textAnim: t => ({ r: 3 * sin(2 * t) }),
  },
  {
    id: 'flat', text: '躺平', color: '#2ec4b6', frames: 16, delay: 100, still: 0,
    draw(t) {
      const br = sin(t), sy = 0.6 + 0.025 * br, sx = 1.3 - 0.02 * br;
      const waves = [0, 0.5].map(ph => {
        const p = (t + ph) % 1;
        return wavy(46 + 10 * p, -2 - 26 * p, Math.sin(Math.PI * p));
      }).join('');
      return home(
        cat({ eyes: 'line', blush: 0.7, sx, sy, feet: false, tail: 70, earL: 30, earR: 30,
          armL: { x: -58, y: 38, r: 80 }, armR: { x: 58, y: 38, r: -80 } }) + waves,
        -10, 4, 1.08);
    },
  },
  {
    id: 'hug', text: '抱抱', color: '#ff8fb1', frames: 20, delay: 70, still: 0.5,
    draw(t) {
      const p = ease((1 - cos(t)) / 2), hs = clamp01((p - 0.7) / 0.3);
      return home(
        cat({ eyes: 'happy', mouth: 'open', blush: 1.5, tail: 15 * sin(2 * t),
          armL: { x: lerp(-74, -28, p), y: lerp(-8, 24, p), r: lerp(-30, 40, p) },
          armR: { x: lerp(74, 28, p), y: lerp(-8, 24, p), r: lerp(30, -40, p) } }) +
        heart(-52, -60, 0.55 * hs, C.heart, -15) + heart(56, -56, 0.5 * hs, C.heart, 15),
        0, 0, 1 + 0.05 * p);
    },
  },
];

/* ---------- 渲染与导出 ---------- */
// 给整只角色（连同道具）描一圈白边，像贴纸一样，在深色聊天背景里也清楚
const FILTER = `<filter id="cut" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">` +
  `<feMorphology in="SourceAlpha" operator="dilate" radius="2.6" result="d"/>` +
  `<feGaussianBlur in="d" stdDeviation="1.7" result="b"/>` +
  `<feComponentTransfer in="b" result="m"><feFuncA type="linear" slope="5" intercept="-1.1"/></feComponentTransfer>` +
  `<feFlood flood-color="#ffffff"/><feComposite in2="m" operator="in" result="w"/>` +
  `<feMerge><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

export function svgMarkup(st, t, size = SIZE) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 240 240">` +
    `<defs><clipPath id="bc"><path d="${BODY}"/></clipPath>${FILTER}</defs><g filter="url(#cut)">${st.draw(t)}</g></svg>`;
}

export const FONT = '"ZCOOL KuaiLe","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","WenQuanYi Zen Hei",sans-serif';
let fontReady;
export function loadFont() {
  if (!fontReady) {
    const url = new URL('./fonts/zcool-kuaile.woff2', import.meta.url);
    const face = new FontFace('ZCOOL KuaiLe', `url("${url}") format("woff2")`);
    fontReady = face.load().then(f => (document.fonts.add(f), true), () => false);
  }
  return fontReady;
}

const loadImg = src => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error('图片渲染失败'));
  im.src = src;
});

// 把一行字摆成一行或两行，尽量大，不超出画面
function layoutText(ctx, text) {
  const maxW = 214;
  ctx.font = `36px ${FONT}`;
  let fs = 36;
  const w = ctx.measureText(text).width;
  if (w <= maxW) return { lines: [text], fs };
  fs = Math.floor((36 * maxW) / w);
  const chars = Array.from(text);
  if (fs >= 26 || chars.length < 6) return { lines: [text], fs: Math.max(fs, 18) };
  const cut = Math.ceil(chars.length / 2), lines = [chars.slice(0, cut).join(''), chars.slice(cut).join('')];
  fs = 28;
  ctx.font = `${fs}px ${FONT}`;
  const lw = Math.max(...lines.map(l => ctx.measureText(l).width));
  if (lw > maxW) fs = Math.floor((fs * maxW) / lw);
  return { lines, fs };
}

export function drawCaption(ctx, text, color, a, size = SIZE) {
  text = (text || '').replace(/\s+/g, ' ').trim();
  if (!text) return;
  a = a || {};
  ctx.save();
  ctx.scale(size / 240, size / 240);
  const { lines, fs } = layoutText(ctx, text);
  ctx.translate(120 + (a.x || 0), (lines.length > 1 ? 204 : 210) + (a.y || 0));
  if (a.r) ctx.rotate((a.r * Math.PI) / 180);
  if (a.s) ctx.scale(a.s, a.s);
  ctx.font = `${fs}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const k = fs / 36, gap = fs * 1.08;
  lines.forEach((line, i) => {
    const y = (i - (lines.length - 1) / 2) * gap;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 13 * k; ctx.strokeText(line, 0, y);
    ctx.strokeStyle = C.line; ctx.lineWidth = 6 * k; ctx.strokeText(line, 0, y);
    ctx.fillStyle = color; ctx.fillText(line, 0, y);
  });
  ctx.restore();
}

/** 画一帧。opt: { size, text, color } */
export async function drawFrame(ctx, st, t, opt = {}) {
  const size = opt.size || SIZE;
  const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup(st, t, size)));
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  drawCaption(ctx, opt.text ?? st.text, opt.color || st.color, st.textAnim ? st.textAnim(t) : null, size);
}

/** 把所有帧画出来（RGBA 数据），给预览和 GIF 用 */
export async function renderFrames(st, opt = {}) {
  const size = opt.size || SIZE;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const out = [];
  for (let i = 0; i < st.frames; i++) {
    await drawFrame(ctx, st, i / st.frames, { ...opt, size });
    out.push(ctx.getImageData(0, 0, size, size));
  }
  return out;
}

/** 编码成透明背景、循环播放的 GIF（所有帧共用一套调色板，不闪） */
export function encodeGIF(frames, delay) {
  const { width: w, height: h } = frames[0], px = w * h;
  let count = 0;
  for (const f of frames) for (let q = 3; q < f.data.length; q += 4) if (f.data[q] >= 128) count++;
  const sample = new Uint8Array(Math.max(4, count * 4));
  let j = 0;
  for (const f of frames) {
    const d = f.data;
    for (let q = 0; q < d.length; q += 4) {
      if (d[q + 3] >= 128) { sample[j] = d[q]; sample[j + 1] = d[q + 1]; sample[j + 2] = d[q + 2]; sample[j + 3] = 255; j += 4; }
    }
  }
  const pal = quantize(sample, 255);
  const TI = pal.length;
  const palette = [...pal, [0, 0, 0]];
  const gif = GIFEncoder();
  frames.forEach((f, i) => {
    const idx = applyPalette(new Uint8Array(f.data), pal);
    for (let p = 0, q = 3; p < px; p++, q += 4) if (f.data[q] < 128) idx[p] = TI;
    gif.writeFrame(idx, w, h, { palette: i === 0 ? palette : undefined, delay, transparent: true, transparentIndex: TI, dispose: 2 });
  });
  gif.finish();
  return gif.bytes();
}

export async function makeGIF(st, opt = {}) {
  return encodeGIF(await renderFrames(st, opt), st.delay);
}

/** 高清静态 PNG（默认 480×480，保留柔和的透明边缘） */
export async function makePNG(st, opt = {}) {
  const size = opt.size || 480;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  await drawFrame(cv.getContext('2d'), st, opt.t ?? st.still ?? 0, { ...opt, size });
  return new Promise(res => cv.toBlob(res, 'image/png'));
}
