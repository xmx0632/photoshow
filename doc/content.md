# photoshow开发

## 目的

最近看到Gemini 的生成图片API开放出来了，额度还挺高。所以我想白嫖一下，开发一个使用 Gemini 图片生成的网站看看效果如何，顺便记录一下整个开发过程。

以下实践都是按照先列计划，再开发的流程来执行，完整记录整个开发到发布上线的过程。尽量能够根据这个步骤可以重现整个过程的效果。

## 文档编写

### 1. 首先我创建了一个文件 DESIGN.md
### 2. 让AI帮我写文档
**提示词：**

@DESIGN.md 帮我修改文档迭代计划，我需要尽快发布一个最小可用的mvp版本，使用nextjs 和 tailwind css 等开源组件，提供使用gemini 生成图片api 实现突破生成和浏览功能，代码遵循谷歌规范，模块划分清楚，方便功能扩展。并且马上可以发布到vercel查看效果。然后再考虑存储和页面美化。我需要能够按照这个文档马上进入开发工作。


![让AI帮我写设计文档](https://fastly.jsdelivr.net/gh/bucketio/img3@main/2025/03/22/1742646117862-4eba72e0-2223-4c2c-9076-4394123ba362.png)

这是写好的文档的样子：

![设计文档](https://fastly.jsdelivr.net/gh/bucketio/img15@main/2025/03/22/1742646226660-ae1cc073-7a5a-4fd4-8649-3282fc634425.png)

完整的文档内容如下：

```markdown
# PhotoShow MVP 开发计划

## 一、MVP版本开发规划（1周内完成）

### 目标
构建一个最小可用版本(MVP)，实现AI图片生成和浏览的核心功能，并能够快速部署到Vercel展示效果。

### 技术栈选择
- **前端框架**：Next.js 14+ (App Router)
- **样式方案**：Tailwind CSS
- **AI接口**：Google Gemini API
- **部署平台**：Vercel

### 核心功能模块

#### 1. 基础架构搭建（1-2天）
- 初始化Next.js项目，配置Tailwind CSS
- 设计简洁的项目结构，遵循谷歌代码规范
- 创建核心组件：布局(Layout)、导航栏(Navbar)、页脚(Footer)
- 实现响应式设计，确保移动端和桌面端良好体验

#### 2. AI图片生成功能（2-3天）
- 集成Google Gemini API，配置环境变量
- 创建图片生成表单组件，包含提示词输入区和生成按钮
- 实现Next.js API路由封装Gemini请求逻辑
- 添加生成状态指示器（加载动画、进度条）
- 展示生成结果，支持查看大图和下载

#### 3. 图片浏览功能（1-2天）
- 实现简单网格布局展示已生成的图片
- 添加图片预览功能，点击可查看大图
- 实现基础的分页或加载更多功能

#### 4. Vercel部署（半天）
- 配置项目环境变量（Gemini API密钥等）
- 部署到Vercel，确保正常运行
- 测试所有功能，修复潜在问题

## 二、后续迭代计划

### 迭代1：存储优化（1-2周）
- 集成云存储方案（如Cloudflare R2或Vercel Blob Storage）
- 实现图片元数据管理
- 添加图片分类和标签功能

### 迭代2：UI/UX增强（1-2周）
- 实现瀑布流布局展示图片
- 优化移动端体验
- 添加深色模式支持
- 实现图片懒加载和优化

### 迭代3：功能扩展（2-3周）
- 添加用户认证系统
- 实现图片收藏和分享功能
- 添加更多AI模型选项
- 实现图片编辑功能

## 三、项目结构设计

photoshow/
├── app/                     # Next.js App Router
│   ├── api/                 # API路由
│   │   └── generate/       # 图片生成API
│   │       └── route.js    # 处理生成请求
│   ├── browse/             # 浏览页面
│   │   └── page.js
│   ├── create/             # 创建页面
│   │   └── page.js
│   ├── layout.js           # 全局布局
│   └── page.js             # 首页
├── components/             # 共享组件
│   ├── ui/                 # UI组件
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   └── ...
│   ├── layout/             # 布局组件
│   │   ├── Navbar.jsx
│   │   └── Footer.jsx
│   └── features/           # 功能组件
│       ├── ImageGenerator.jsx
│       └── ImageGrid.jsx
├── lib/                    # 工具函数和服务
│   ├── gemini.js           # Gemini API封装
│   └── utils.js            # 通用工具函数
├── public/                 # 静态资源
├── styles/                 # 全局样式
├── .env.local              # 环境变量
├── next.config.js          # Next.js配置
├── tailwind.config.js      # Tailwind配置
└── package.json            # 项目依赖


## 四、技术实现要点

### Gemini API集成
- 使用Google官方Node.js SDK
- 实现图片生成请求的异步处理
- 添加错误处理和重试机制

### 前端组件设计
- 采用原子设计思想构建UI组件
- 使用Tailwind CSS实现响应式设计
- 组件间通信采用Props和Context API

### 性能优化
- 使用Next.js的Image组件优化图片加载
- 实现组件懒加载
- 优化首屏加载速度

## 五、MVP验收标准

1. 用户能够输入提示词生成图片
2. 生成的图片能够正确显示和浏览
3. 界面在移动端和桌面端均有良好体验
4. 成功部署到Vercel并可访问
5. 代码结构清晰，遵循谷歌规范
6. 模块划分合理，便于后续功能扩展

## 六、开发时间表

| 阶段 | 时间 | 任务概要 | 输出成果 |
|------|------|---------|----------|
| 基础架构 | 1-2天 | Next.js项目初始化，Tailwind配置 | 项目骨架，基础UI组件 |
| 生成功能 | 2-3天 | Gemini API集成，图片生成逻辑 | 可用的图片生成功能 |
| 浏览功能 | 1-2天 | 图片展示，基础交互 | 图片浏览页面 |
| 部署上线 | 0.5天 | Vercel配置与部署 | 可访问的线上MVP版本 |

```

可以看到上面 AI 列的文档还是挺完整的。

因为写提示词有时候比较随性，容易写着写着就跑偏了。所以我比较习惯把提示词按照计划写在文件里先，等开发过程中再慢慢调整。所以我创建了一个 prompt.md 文件记录整个过程的提示词。

![提示词文档](https://fastly.jsdelivr.net/gh/bucketio/img10@main/2025/03/22/1742647299539-e015ecfb-46c0-4e89-b649-ab7fc34bc8e6.png)

然后空着的部分还是让 AI 帮我补充上去：


![](https://fastly.jsdelivr.net/gh/bucketio/img7@main/2025/03/22/1742647367323-4c181625-5d80-4838-8988-4c6c05c9daeb.png)

下面这就是 AI 帮我补充的提示词文档全文：

```
# 图片生成网站开发

## 1. 计划方案编写

@DESIGN.md 帮我修改文档迭代计划，我需要尽快发布一个最小可用的mvp版本，使用nextjs 和 tailwind css 等开源组件，提供使用gemini 生成图片api 实现突破生成和浏览功能，代码遵循谷歌规范，模块划分清楚，方便功能扩展。并且马上可以发布到vercel查看效果。然后再考虑存储和页面美化。我需要能够按照这个文档马上进入开发工作。

@prompt.md 帮我晚上提示词编写，我需要能够按照这个文档马上进入开发工作。

## 2. 迭代1-MVP 版本

### 开发

# 初始化项目
创建一个新的Next.js项目，使用App Router和Tailwind CSS。项目结构遵循谷歌规范，模块化设计，便于后续扩展。

# 基础组件开发
创建布局组件（Layout）、导航栏（Navbar）和页脚（Footer），使用Tailwind CSS实现响应式设计，确保在移动端和桌面端都有良好的显示效果。

# Gemini API集成
注册Google AI Studio账号，获取Gemini API密钥。创建环境变量文件（.env.local）存储API密钥。使用Google官方Node.js SDK集成Gemini API，实现图片生成功能。

# 图片生成组件
创建图片生成表单组件，包含提示词输入框、生成按钮和生成状态指示器。实现Next.js API路由，封装Gemini API调用逻辑。添加错误处理和加载状态管理。

# 图片浏览组件
创建图片网格组件，展示生成的图片。实现图片预览功能，点击图片可查看大图。添加基础的分页或“加载更多”功能。

# 本地存储
使用浏览器localStorage或IndexedDB实现简单的本地存储，保存生成的图片和提示词历史记录，便于用户查看历史生成结果。

# 测试与调试
对所有功能进行全面测试，确保图片生成和浏览功能正常工作。测试不同设备和浏览器的兼容性，修复可能出现的问题。

### 发布

# Vercel部署准备
注册Vercel账号，并将项目代码推送到GitHub仓库。确保项目包含必要的配置文件：next.config.js、package.json和tailwind.config.js等。

# 环境变量配置
在Vercel项目设置中添加必要的环境变量，如Gemini API密钥等。确保所有敏感信息都存储在环境变量中，而非硬编码在代码中。

# 自动部署配置
将Vercel项目与GitHub仓库关联，配置自动部署。每次推送到主分支时，Vercel将自动构建和部署新版本。

# 域名配置（可选）
如果有自定义域名，可以在Vercel中配置并绑定。否则使用Vercel提供的默认域名（项目名.vercel.app）。

# 测试部署结果
部署完成后，访问部署后的网站URL，测试所有功能是否正常工作。特别测试Gemini API集成是否正常，图片生成和浏览功能是否可用。

# 性能监控
使用Vercel Analytics监控网站性能和用户访问情况。关注页面加载时间、API响应时间等指标，为后续优化提供依据。


## 3. 迭代2-存储优化

# 云存储方案选择
评估并选择适合的云存储方案，如Cloudflare R2、Vercel Blob Storage或AWS S3。比较各方案的价格、性能和使用便利性，选择最适合的方案。

# 存储服务集成
安装并配置选定云存储服务的SDK或客户端库。创建存储桶或容器，设置适当的访问权限和生命周期规则。将存储服务的访问凭证添加到环境变量中。

# 图片上传功能
实现图片上传到云存储的功能。创建上传API路由，处理文件上传、格式验证和存储逻辑。添加上传进度指示器和错误处理机制。

# 图片元数据管理
设计图片元数据结构，包含图片URL、生成时间、提示词、标签等信息。实现元数据的存储和检索功能，可使用简单的JSON文件或轻量级数据库如SQLite。

# 存储容量管理
实现存储容量监控功能，定期检查存储使用量。设置存储限额，当接近限额时发出警告。实现自动清理策略，如根据时间或访问频率删除旧文件。

# 图片分类与标签
实现图片分类和标签功能，便于用户组织和查找图片。创建标签管理界面，允许用户添加、编辑和删除标签。实现按标签筛选图片的功能。

# 数据备份与恢复
设计数据备份机制，定期备份图片元数据。实现数据恢复功能，允许在数据丢失时进行恢复。测试备份和恢复过程，确保数据安全。

## 4. 迭代3-UI/UX增强

# 瀑布流布局实现
实现瀑布流布局展示图片，提升视觉效果和空间利用率。可使用React瀑布流库（如react-masonry-css或react-responsive-masonry），或自定义CSS Grid实现。确保布局在不同屏幕尺寸下自适应。

# 深色模式支持
添加深色模式支持，提升用户在低光环境下的使用体验。使用Tailwind CSS的暗色模式类或CSS变量实现主题切换。添加主题切换按钮，并保存用户主题偏好到本地存储。

# 图片懒加载优化
实现图片懒加载，仅在图片进入视口时加载，提升页面加载速度和性能。使用IntersectionObserver API或React懒加载库（如react-lazyload）实现。添加加载占位图或模糊预览效果。

# 动画与过渡效果
添加页面过渡和元素动画，提升用户体验和视觉效果。可使用Framer Motion或React Spring实现流畅的动画效果。为图片加载、页面切换和模态框添加适当的动画。

# 移动端体验优化
优化移动端界面，确保在小屏幕设备上的良好体验。调整导航菜单、按钮大小和输入控件，使其更适合触摸操作。测试不同移动设备上的布局和交互。

# 图片查看体验优化
改进图片查看体验，实现全屏图片预览、缩放和幻灯片模式。可使用Lightbox组件（如react-image-lightbox或yet-another-react-lightbox）实现。添加手势支持，如滑动切换图片。

# 用户界面美化
使用现代化的UI组件库（如shadcn/ui或Headless UI）改进界面外观。优化颜色方案、排版和组件间距。添加微交互和反馈效果，提升用户体验。

## 5. 迭代4-功能扩展

# 用户认证系统
实现用户认证系统，支持注册、登录和个人资料管理。可使用NextAuth.js或Clerk等身份验证服务。添加社交媒体登录选项（如Google、GitHub）和邮箱密码登录。实现用户权限管理和访问控制。

# 图片收藏与分享
实现图片收藏功能，允许用户保存喜欢的图片到个人收藏夹。添加图片分享功能，支持生成分享链接或直接分享到社交平台。实现收藏夹管理，允许用户创建、编辑和删除收藏夹。

# 更多AI模型选项
集成更多AI图片生成模型，如Stable Diffusion、DALL-E或Midjourney API。创建模型选择界面，允许用户选择不同模型生成图片。实现模型参数调整，如生成步数、图片尺寸和提示词权重等。

# 图片编辑功能
添加基本的图片编辑功能，如裁剪、旋转、调整亮度/对比度和添加滤镜。可使用浏览器端图片编辑库（如tui-image-editor或react-image-crop）实现。添加撤销/重做功能和编辑历史记录。

# 提示词管理与分享
实现提示词管理系统，允许用户保存、编辑和分类自己的提示词。创建提示词库，包含常用提示词模板。添加提示词分享功能，允许用户分享成功的提示词配置。

# 批量生成与任务队列
实现批量图片生成功能，允许用户一次生成多张图片或使用多个提示词。创建任务队列系统，管理生成请求并避免资源竞争。添加任务进度监控和通知功能。

# API集成与扩展
开发公共API，允许第三方应用集成图片生成功能。创建开发者文档，说明如何使用API。实现API密钥管理和访问限制，确保系统安全。


## 6. 迭代5-性能优化

# 前端代码拆分与懒加载
实现前端代码拆分，使用Next.js的dynamic import和React.lazy实现组件懒加载。对路由进行拆分，仅加载当前页面所需的代码。优化首次加载时间，提升用户体验。

# 图片优化与缓存
实现图片格式优化，使用WebP或AVIF等现代图片格式。添加响应式图片加载，根据设备屏幕尺寸加载不同大小的图片。实现多层缓存策略，包括浏览器缓存、CDN缓存和服务端缓存。

# API性能优化
对API请求进行优化，实现请求合并和批处理。添加API缓存层，减少重复请求。实现请求限流和防抖动，避免过多请求导致系统负载过高。优化API响应时间，提升用户体验。

# 服务端渲染与静态生成
充分利用Next.js的服务端渲染(SSR)和静态站点生成(SSG)特性。对静态页面使用SSG，提升加载速度和SEO效果。对动态内容使用SSR，确保内容的实时性。实现增量静态再生成(ISR)，平衡静态生成和内容更新。

# 数据库优化
对数据库查询进行优化，添加适当的索引和查询缓存。实现数据库连接池，提高连接效率。对大量数据实现分页和分块查询，避免内存溢出。定期清理无用数据，保持数据库性能。

# 监控与日志
实现全面的应用监控，使用Sentry或New Relic等工具跟踪错误和性能问题。添加结构化日志，记录关键操作和错误信息。创建性能仪表盘，实时监控系统关键指标。设置警报规则，在出现异常时及时通知。

# 安全性强化
实施安全最佳实践，包括CSRF保护、XSS防御和SQL注入防御。添加内容安全策略(CSP)，限制资源加载。定期更新依赖包，修复安全漏洞。实现用户输入验证和清洗，防止恶意输入。

```

在最后还自动帮我生成了 gitlog（通过设置windsurf global rules实现）

![生成了 gitlog](https://fastly.jsdelivr.net/gh/bucketio/img11@main/2025/03/22/1742647828776-e5c6364f-bd22-4563-96a9-1eb0f4ad6cab.png)

## 迭代1-MVP 版本

### 开发

提示词：
```
# 初始化项目
创建一个新的Next.js项目，使用App Router和Tailwind CSS。项目结构遵循谷歌规范，模块化设计，便于后续扩展。

# 基础组件开发
创建布局组件（Layout）、导航栏（Navbar）和页脚（Footer），使用Tailwind CSS实现响应式设计，确保在移动端和桌面端都有良好的显示效果。

# Gemini API集成
注册Google AI Studio账号，获取Gemini API密钥。创建环境变量文件（.env.local）存储API密钥。使用Google官方Node.js SDK集成Gemini API，实现图片生成功能。

# 图片生成组件
创建图片生成表单组件，包含提示词输入框、生成按钮和生成状态指示器。实现Next.js API路由，封装Gemini API调用逻辑。添加错误处理和加载状态管理。

# 图片浏览组件
创建图片网格组件，展示生成的图片。实现图片预览功能，点击图片可查看大图。添加基础的分页或“加载更多”功能。

# 本地存储
使用浏览器localStorage或IndexedDB实现简单的本地存储，保存生成的图片和提示词历史记录，便于用户查看历史生成结果。

# 测试与调试
对所有功能进行全面测试，确保图片生成和浏览功能正常工作。测试不同设备和浏览器的兼容性，修复可能出现的问题。
```


![迭代1-MVP 版本](https://fastly.jsdelivr.net/gh/bucketio/img16@main/2025/03/22/1742648101191-df15602a-1dec-4587-ae35-0813d1a0a968.png)

生成初始代码如下：

![生成初始代码](https://fastly.jsdelivr.net/gh/bucketio/img11@main/2025/03/22/1742648638876-d02b0a52-6d0f-4815-a157-d4ba851ce675.png)



![自动生成memories，记录项目结构](https://fastly.jsdelivr.net/gh/bucketio/img14@main/2025/03/22/1742648429750-58cd95a2-f06a-4641-90b3-38860746e00f.png)


![memories项目组件结构](https://fastly.jsdelivr.net/gh/bucketio/img4@main/2025/03/22/1742648507900-f9700515-1268-496f-8f5d-1e43c1a38415.png)


![memories技术栈和结构](https://fastly.jsdelivr.net/gh/bucketio/img0@main/2025/03/22/1742648527529-36989d48-e9b8-405c-8300-cd094df05de8.png)


先运行一下看看能不能跑吧。让AI继续干活～

![继续开发](https://fastly.jsdelivr.net/gh/bucketio/img6@main/2025/03/22/1742648887149-4793c6f5-ffd0-4990-ae72-9be962276568.png)

稍等片刻，AI一顿输出之后还用 puppeteer MCP 帮我打开了浏览器

![](https://fastly.jsdelivr.net/gh/bucketio/img2@main/2025/03/22/1742649046218-5614a7bf-f1d1-489a-abeb-694167bdf986.png)

现在看到左侧版本控制窗口里有10000+文件变更，千万不要Commit。

![](https://fastly.jsdelivr.net/gh/bucketio/img6@main/2025/03/22/1742649227800-6f684343-5db2-4647-b0ee-e66ed4c52959.png)

现在需要自己加个 .gitignore 文件，给文件里加上三行排除掉一些编译出来的非源代码文件和目录：
```
node_modules
.env.local
.next
```

其中 .env.local 里保存你的配置信息，比如 Gemini API密钥 是不能随便乱丢到网上的。

现在看到要提交的代码减少到20个

![](https://fastly.jsdelivr.net/gh/bucketio/img13@main/2025/03/22/1742649733228-30d93ae0-12e8-4bba-84b3-1f6fdad604e5.png)

继续复制 gitlog 内容，提交到本地仓库里

```
- feat(init): 初始化Next.js项目，配置Tailwind CSS和项目结构
- feat(layout): 创建基础布局组件，包括导航栏和页脚
- feat(api): 集成Gemini API，实现图片生成功能
- feat(components): 开发图片生成表单和图片浏览组件
- feat(pages): 创建首页、图片生成页面和图片浏览页面
```

现在可以再看看运行的效果了。

执行命令：npm run dev

```bash
 ~/aivideo/photoshow > npm run dev

> photoshow@0.1.0 dev
> next dev

  ▲ Next.js 14.2.25
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 2.1s
 ○ Compiling / ...
 ✓ Compiled / in 1598ms (503 modules)
 ✓ Compiled in 211ms (258 modules)
 GET / 200 in 1830ms
```

打开浏览器访问：http://localhost:3000
可以看到效果还行，功能不知道能不能用。

![迭代1页面](https://fastly.jsdelivr.net/gh/bucketio/img13@main/2025/03/22/1742650004512-13d0e32c-a9a0-4185-93ab-f4bf40049ed2.png)


![创建图片](https://fastly.jsdelivr.net/gh/bucketio/img16@main/2025/03/22/1742650103930-35d526aa-1ee1-426c-b91c-8eee96eff9d3.png)


![生成图片](https://fastly.jsdelivr.net/gh/bucketio/img7@main/2025/03/22/1742650139363-fa68defb-7542-447f-83d3-beb2c5d65444.png)


![生成图片报错](https://fastly.jsdelivr.net/gh/bucketio/img1@main/2025/03/22/1742650183666-97112b13-6b63-4f0c-ad29-3bc8b2343d6d.png)

