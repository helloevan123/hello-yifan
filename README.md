# 产品参数总表

网页地址:https://helloevan123.github.io/hello-yifan/

页面文件是 `index.html`,由 GitHub Pages 直接发布。

## 橘团表情包

网页地址:https://helloevan123.github.io/hello-yifan/stickers/

一只圆滚滚的小橘猫,16 张会动的表情(你好呀、收到、哈哈哈哈、爱你、谢谢老板、在吗、晚安、委屈、无语、加油、吃瓜、震惊、哼、拜托拜托、躺平、抱抱)。网页上可以看大图、下载,也可以换动作、改成自己想说的话再生成。

- `stickers/gif/`:240×240 透明背景动图,微信表情的标准尺寸
- `stickers/png/`:480×480 高清静态图
- `stickers/judan-stickers.zip`:上面两样打包,带使用说明
- `stickers/judan.js`:角色和每张表情的画法、动画,网页和构建脚本共用

改了 `judan.js` 之后重新生成图片(需要 Node 和 Playwright):

```bash
node tools/build-stickers.mjs
```

文字字体是站酷快乐体(ZCOOL KuaiLe,SIL Open Font License 1.1),GIF 编码用的是 gifenc(MIT),许可证都放在对应目录里。
