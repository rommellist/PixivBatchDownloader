//初始化 artwork 作品页
import { InitPageBase } from '../InitPageBase'
import { Colors } from '../Colors'
import { EVT } from '../EVT'
import { lang } from '../Lang'
import { options } from '../setting/Options'
import { store } from '../Store'
import { QuickBookmark } from '../QuickBookmark'
import { ImageViewer } from '../ImageViewer'
import { userWorksType } from '../CrawlArgument'
import { DOM } from '../DOM'
import { API } from '../API'
import { log } from '../Log'
import { Tools } from '../Tools'

class InitArtworkPage extends InitPageBase {
  constructor() {
    super()
    this.init()
  }

  private crawlDirection: number = 0 // 抓取方向，指示抓取新作品还是旧作品
  /*
  -1 抓取新作品
  0 不设置抓取方向
  1 抓取旧作品
  */

  private crawlRelated: boolean = false // 是否下载相关作品

  protected initAny() {
    // 初始化快速收藏功能和图片查看器
    this.initQuickBookmark()
    this.initImgViewer()

    // 页面切换再次初始化
    window.addEventListener(
      EVT.list.pageSwitchedTypeNotChange,
      this.initQuickBookmark
    )
    window.addEventListener(
      EVT.list.pageSwitchedTypeNotChange,
      this.initImgViewer
    )
  }

  private initImgViewer() {
    new ImageViewer({
      showImageList: true,
      imageListId: 'viewerWarpper',
      insertTarget: 'main figcaption',
      insertPostion: 'beforebegin',
      showDownloadBtn: true,
    })
  }

  private initQuickBookmark() {
    new QuickBookmark()
  }

  protected addCrawlBtns() {
    DOM.addBtn(
      'crawlBtns',
      Colors.bgBlue,
      lang.transl('_从本页开始抓取new')
    ).addEventListener('click', () => {
      this.crawlDirection = -1
      this.readyCrawl()
    })

    DOM.addBtn(
      'crawlBtns',
      Colors.bgBlue,
      lang.transl('_从本页开始抓取old')
    ).addEventListener('click', () => {
      this.crawlDirection = 1
      this.readyCrawl()
    })

    const downRelatedBtn = DOM.addBtn(
      'crawlBtns',
      Colors.bgBlue,
      lang.transl('_抓取相关作品')
    )
    downRelatedBtn.addEventListener(
      'click',
      () => {
        this.crawlRelated = true
        this.readyCrawl()
      },
      false
    )
  }

  protected setFormOption() {
    // 个数/页数选项的提示
    options.setWantPageTip({
      text: lang.transl('_个数'),
      tip:
        lang.transl('_从本页开始下载提示') +
        '<br>' +
        lang.transl('_相关作品大于0'),
      rangTip: lang.transl('_数字提示1'),
    })
  }

  protected destroy() {
    DOM.clearSlot('crawlBtns')
    DOM.clearSlot('otherBtns')

    // 解除切换页面时绑定的事件
    window.removeEventListener(
      EVT.list.pageSwitchedTypeNotChange,
      this.initQuickBookmark
    )

    window.removeEventListener(
      EVT.list.pageSwitchedTypeNotChange,
      this.initImgViewer
    )
  }

  protected getWantPage() {
    // 检查下载页数的设置
    if (!this.crawlRelated) {
      const crawlAllTip =
        this.crawlDirection === -1
          ? lang.transl('_从本页开始抓取new')
          : lang.transl('_从本页开始抓取old')
      this.crawlNumber = this.checkWantPageInput(
        lang.transl('_从本页开始下载x个'),
        crawlAllTip
      )
    } else {
      // 相关作品的提示
      this.crawlNumber = this.checkWantPageInput(
        lang.transl('_下载x个相关作品'),
        lang.transl('_下载所有相关作品')
      )
    }
  }

  protected nextStep() {
    // 下载相关作品
    if (this.crawlRelated) {
      this.getRelatedList()
    } else {
      // 向前向后下载
      this.getIdList()
    }
  }

  protected async getIdList() {
    let type: userWorksType[] = ['illusts', 'manga']
    let idList = await API.getUserWorksByType(DOM.getUserId(), type)

    // 储存符合条件的 id
    let nowId = parseInt(Tools.getIllustId(window.location.href))
    idList.forEach((id) => {
      let idNum = parseInt(id.id)
      // 新作品
      if (idNum >= nowId && this.crawlDirection === -1) {
        store.idList.push(id)
      } else if (idNum <= nowId && this.crawlDirection === 1) {
        // 旧作品
        store.idList.push(id)
      }
    })

    // 当设置了下载个数时，进行裁剪
    if (this.crawlNumber !== -1) {
      // 新作品 升序排列
      if (this.crawlDirection === -1) {
        store.idList.sort(Tools.sortByProperty('id')).reverse()
      } else {
        // 旧作品 降序排列
        store.idList.sort(Tools.sortByProperty('id'))
      }

      store.idList = store.idList.splice(0, this.crawlNumber)
    }

    this.getIdListFinished()
  }

  // 下载相关作品时使用
  private async getRelatedList() {
    let data = await API.getRelatedData(Tools.getIllustId())
    // 相关作品的列表由两部分构成，所以要组合起来
    let ids: string[] = []
    for (const illust of data.body.illusts) {
      if (illust.isAdContainer) {
        continue
      }
      ids.push(illust.id)
    }
    ids = ids.concat(data.body.nextIds)

    // 当设置了下载个数时，进行裁剪
    if (this.crawlNumber !== -1) {
      ids = ids.slice(0, this.crawlNumber)
    }

    for (const id of ids) {
      store.idList.push({
        type: 'unknown',
        id,
      })
    }

    log.log(lang.transl('_相关作品抓取完毕', store.idList.length.toString()))
    this.getIdListFinished()
  }

  protected resetGetIdListStatus() {
    this.crawlDirection = 0 // 解除下载方向的标记
    this.crawlRelated = false // 解除下载相关作品的标记
  }
}
export { InitArtworkPage }
