import { EVT } from '../EVT'
import { lang } from '../Lang'
import { store } from '../Store'
import { Tools } from '../Tools'
import config from '../Config'
import { theme } from '../Theme'
import { toast } from '../Toast'

// 输出面板
class OutputPanel {
  constructor() {
    this.addOutPutPanel()

    theme.register(this.outputPanel)

    this.bindEvents()
  }

  private outputPanel!: HTMLDivElement // 输出面板

  private outputTitle!: HTMLDivElement // 输出面板的标题容器

  private outputContent!: HTMLDivElement // 输出文本的容器元素

  private copyBtn!: HTMLButtonElement

  private closeBtn!: HTMLDivElement

  private bindEvents() {
    this.closeBtn.addEventListener('click', () => {
      this.close()
    })

    this.outputPanel.addEventListener('click', (e) => {
      const ev = e || window.event
      ev.stopPropagation()
    })

    document.addEventListener('click', () => {
      if (this.outputPanel.style.display !== 'none') {
        this.close()
      }
    })

    window.addEventListener(EVT.list.closeCenterPanel, () => {
      this.close()
    })

    // 复制输出内容
    this.copyBtn.addEventListener('click', () => {
      const range = document.createRange()
      range.selectNodeContents(this.outputContent)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      document.execCommand('copy')

      // 改变提示文字
      this.copyBtn.textContent = lang.transl('_已复制到剪贴板')
      setTimeout(() => {
        window.getSelection()!.removeAllRanges()
        this.copyBtn.textContent = lang.transl('_复制')
      }, 1000)
    })

    window.addEventListener(EVT.list.output, (ev: CustomEventInit) => {
      this.output(ev.detail.data.content, ev.detail.data.title)
    })
  }

  private addOutPutPanel() {
    const html = `
    <div class="outputWrap">
    <div class="outputClose" title="${lang.transl('_关闭')}">×</div>
    <div class="outputTitle">${lang.transl('_输出信息')}</div>
    <div class="outputContent beautify_scrollbar"></div>
    <div class="outputFooter">
    <button class="outputCopy" title="">${lang.transl('_复制')}</button>
    </div>
    </div>
    `
    document.body.insertAdjacentHTML('beforeend', html)

    this.outputPanel = document.querySelector('.outputWrap')! as HTMLDivElement

    this.outputTitle = this.outputPanel.querySelector(
      '.outputTitle'
    )! as HTMLDivElement

    this.outputContent = this.outputPanel.querySelector(
      '.outputContent'
    )! as HTMLDivElement

    this.copyBtn = this.outputPanel.querySelector(
      '.outputCopy'
    )! as HTMLButtonElement

    this.closeBtn = this.outputPanel.querySelector(
      '.outputClose'
    )! as HTMLDivElement
  }

  // 输出内容
  private output(content: string, title = lang.transl('_输出信息')) {
    // 如果结果较多，则不直接输出，改为保存 txt 文件
    if (store.result.length > config.outputMax) {
      const con = content.replace(/<br>/g, '\n') // 替换换行符
      const file = new Blob([con], {
        type: 'text/plain',
      })
      const url = URL.createObjectURL(file)
      const fileName = new Date().toLocaleString() + '.txt'

      Tools.downloadFile(url, fileName)

      // 禁用复制按钮
      this.copyBtn.disabled = true
      content = lang.transl('_输出内容太多已经为你保存到文件')
    } else {
      this.copyBtn.disabled = false
    }

    if (content) {
      this.outputContent.innerHTML = content
      this.outputPanel.style.display = 'block'
      this.outputTitle.textContent = title
    } else {
      return toast.error(lang.transl('_没有数据可供使用'))
    }
  }

  // 关闭输出面板
  private close() {
    this.outputPanel.style.display = 'none'
    this.outputContent.innerHTML = ''
  }
}

new OutputPanel()
