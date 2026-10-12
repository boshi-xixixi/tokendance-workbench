export interface PresetMedia {
  field: string
  min: number
  max: number
  accept: 'image' | 'video' | 'both'
}

export interface Preset {
  id: string
  label: string
  group: string
  capId: string
  hint: string
  prompt: string
  media?: PresetMedia
}

/**
 * 预设 = 能力 + 写好的提示词 + 素材要求。图片类提示词的结构（视觉锚点前置、
 * 媒介边界说清、负面词单列、不依赖品牌名）参考了 GitHub 上的
 * wuyoscar/GPT-Image2-Skill 的 get-prompt-from-image，这里是重写不是照搬。
 */
export const presets: Preset[] = [
  {
    id: 'sketch-to-polish',
    label: '草图渲染成品',
    group: '图片生成',
    capId: 'image-ark',
    hint: '丢一张线稿或随手涂鸦，保留构图只补质感',
    media: { field: 'refs', min: 1, max: 1, accept: 'image' },
    prompt:
      '把这张草图渲染成完整成品图。严格保留原图的构图、主体轮廓、比例、透视关系和各元素的前后位置，不要新增或移动主体。在此基础上补全：主体的材质与表面细节、来自画面左上方的柔和主光加环境补光、主体与背景的色彩关系（主色沉稳、点缀色克制）、前景中景背景三层空间、浅景深带来的主体分离。目标媒介是写实摄影质感，不是插画或 3D 渲染；避免出现线稿残留线条、多余肢体、结构错位、文字与水印。',
  },
  {
    id: 'restyle-keep-subject',
    label: '换风格不换主体',
    group: '图片生成',
    capId: 'image-ark',
    hint: '主体、姿态、构图锁死，只改画风和光线',
    media: { field: 'refs', min: 1, max: 1, accept: 'image' },
    prompt:
      '保留原图中主体的身份、姿态、朝向和构图位置，只重绘风格与光线：改成胶片质感的黄昏逆光风格，颗粒细腻，高光柔和溢出，暗部偏暖。原图的背景元素类型保持不变但重新绘制，不要保留原有的平面感。目标媒介是摄影，不是插画；避免主体变形、比例改变、新增装饰物、任何可读文字。',
  },
  {
    id: 'multi-ref-compose',
    label: '多参考图合成',
    group: '图片生成',
    capId: 'image-ark',
    hint: '图1 出主体，图2 出配色和款式',
    media: { field: 'refs', min: 2, max: 3, accept: 'image' },
    prompt:
      '以图1 的主体为唯一主体，保持它的轮廓、比例和姿态；采用图2 的配色方案、材质和款式语言；画面环境取图2 的光线氛围。构图上主体居中偏左，最近镜头的是主体本身，背景做适度虚化。成品为商业摄影质感，避免直接复制图2 中的具体对象、品牌标识和任何可读文字。',
  },
  {
    id: 'product-shot',
    label: '产品白底图',
    group: '图片生成',
    capId: 'image-ark',
    hint: '随手拍的商品照变成电商主图',
    media: { field: 'refs', min: 1, max: 1, accept: 'image' },
    prompt:
      '把这张商品照片重绘成电商主图：主体居中，占画面高度约七成，纯白背景，柔光箱打光，主光在左上、右侧补光减弱阴影，底部有自然的接触阴影和极淡的反射。材质细节要真实可信，边缘干净无杂色。避免出现人手、桌面杂物、环境反射、任何文字和 logo。',
  },
  {
    id: 'prompt-from-image',
    label: '反推生图提示词',
    group: '图片理解',
    capId: 'vision',
    hint: '给一张目标图，产出可直接用的长提示词',
    media: { field: 'images', min: 1, max: 1, accept: 'image' },
    prompt:
      '分析这张图，反推出可以直接用于 AI 生图的高保真提示词。只描述画面里确实存在的内容，不要编造看不清的物体、身份、品牌、焦距或光圈值；不确定时描述可见的视觉效果。先挑出最影响还原度的 3 到 5 个视觉锚点（构图、主体特征、光线、材质、色彩关系、空间层次里选），把它们放在提示词前三分之一。把品牌和 IP 翻译成形状、配色、轮廓、材质和设计语言，不要出现受保护的名称。按下面两段输出，不要加分析和总结：\n\n1. 正向提示词：一段 450 到 700 字的连续中文自然语言（不是关键词罗列），依次覆盖主体与特征、视觉锚点、构图与空间关系、机位与透视、光线方向与软硬、主色辅色点缀色、材质、前后景层次、场景与氛围、后期质感、目标媒介及其边界。\n2. 负面提示词：10 到 15 个英文词或短语，逗号分隔，排除错误媒介、错误构图、结构变形和常见生成缺陷。',
  },
  {
    id: 'screenshot-review',
    label: '截图找问题',
    group: '图片理解',
    capId: 'vision',
    hint: '界面截图、报错弹窗、设计稿都能用',
    media: { field: 'images', min: 1, max: 4, accept: 'image' },
    prompt:
      '看这张界面截图，按严重程度列出问题：可读性与对比度、间距与对齐、层级与视觉引导、状态缺失（加载/空/错误）、文案歧义。每条指出具体位置，给一句可执行的改法，不要泛泛而谈。最后说这个界面最影响使用的一处是什么。',
  },
  {
    id: 'chart-reading',
    label: '图表读数',
    group: '图片理解',
    capId: 'vision',
    hint: '把图里的数字和趋势读出来',
    media: { field: 'images', min: 1, max: 2, accept: 'image' },
    prompt:
      '读出这张图表：坐标轴含义、单位、能确认的关键数值和拐点、总体趋势、异常点。图上没有的信息不要推测；看不清的数值直接说看不清。最后用三句话给出这张图想表达的结论。',
  },
  {
    id: 'video-analysis',
    label: '视频内容分析',
    group: '视频',
    capId: 'vision',
    hint: '本地视频抽 8 帧，原片不出这台机器',
    media: { field: 'images', min: 1, max: 1, accept: 'video' },
    prompt:
      '这是同一个视频按时间顺序均匀抽取的若干帧。请按帧序说明：视频在讲什么、主体及其动作变化、镜头运动与景别切换、画面风格（色彩、光线、质感）、可判断的场景与道具。然后指出最抓人的一帧是哪一帧、为什么。最后给一段能复现这个视频观感的中文提示词，控制在 200 字内。看不清的信息不要编。',
  },
  {
    id: 'image-to-video',
    label: '图生视频',
    group: '视频',
    capId: 'video',
    hint: '给一张首帧，让它动起来',
    media: { field: 'frames', min: 1, max: 2, accept: 'image' },
    prompt:
      '让这张图自然动起来：主体动作连贯、幅度小、不改变身份和构图，镜头保持静止并缓慢推进，光影与原图一致，画面无抖动和形变。',
  },
  {
    id: 'text-to-video',
    label: '文生视频',
    group: '视频',
    capId: 'video',
    hint: '一句话出一段 5 秒短片',
    prompt:
      '夜空中的烟花倒映在湖面，镜头从水面缓慢上升拉开，前景是平静的湖水反光，中景是烟花炸开的光斑，背景为远山剪影，色调冷暖对比克制，画面稳定无抖动。',
  },
]

export function presetsFor(capId: string): Preset[] {
  return presets.filter((p) => p.capId === capId)
}
