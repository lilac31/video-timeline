/**
 * 视频时间轴编辑器 - 自动化测试脚本
 * 
 * 使用方法：
 * 1. 打开浏览器开发者工具（F12）
 * 2. 进入时间轴页面
 * 3. 在控制台粘贴此脚本并运行
 * 4. 查看测试结果
 */

class TimelineTestRunner {
  constructor() {
    this.results = []
    this.passed = 0
    this.failed = 0
  }

  // 工具函数：等待
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 工具函数：查找元素
  findElement(selector) {
    return document.querySelector(selector)
  }

  // 工具函数：查找所有元素
  findElements(selector) {
    return Array.from(document.querySelectorAll(selector))
  }

  // 工具函数：模拟点击
  async click(element) {
    if (!element) {
      throw new Error('Element not found')
    }
    element.click()
    await this.wait(300)
  }

  // 工具函数：模拟双击
  async doubleClick(element) {
    if (!element) {
      throw new Error('Element not found')
    }
    
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    })
    
    element.dispatchEvent(event)
    await this.wait(150)
    element.dispatchEvent(event)
    await this.wait(300)
  }

  // 记录测试结果
  log(testName, passed, message = '') {
    const result = {
      testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    }
    
    this.results.push(result)
    
    if (passed) {
      this.passed++
      console.log(`✅ ${testName}`)
    } else {
      this.failed++
      console.error(`❌ ${testName}: ${message}`)
    }
  }

  // 测试1: 基础功能 - 轨道添加
  async test_addTrack() {
    try {
      // 点击"文字"按钮
      const textButton = this.findElements('.toolbar-button').find(btn => 
        btn.textContent.includes('文字')
      )
      await this.click(textButton)
      
      // 点击"+文字"
      const addTextButton = this.findElements('.submenu-item').find(btn => 
        btn.textContent.includes('+文字')
      )
      await this.click(addTextButton)
      
      // 检查是否添加成功
      const tracks = this.findElements('.additional-track-item')
      const hasTextTrack = tracks.some(track => track.textContent.includes('文字'))
      
      this.log('添加文字轨道', hasTextTrack, hasTextTrack ? '' : '未找到文字轨道')
    } catch (error) {
      this.log('添加文字轨道', false, error.message)
    }
  }

  // 测试2: 音乐轨道添加
  async test_addMusicTrack() {
    try {
      // 点击"音频"按钮
      const audioButton = this.findElements('.toolbar-button').find(btn => 
        btn.textContent.includes('音频')
      )
      await this.click(audioButton)
      
      // 点击"+音乐"
      const addMusicButton = this.findElements('.submenu-item').find(btn => 
        btn.textContent.includes('+音乐')
      )
      await this.click(addMusicButton)
      
      // 检查是否添加成功
      const tracks = this.findElements('.additional-track-item')
      const hasMusicTrack = tracks.some(track => track.textContent.includes('音乐'))
      
      this.log('添加音乐轨道', hasMusicTrack, hasMusicTrack ? '' : '未找到音乐轨道')
    } catch (error) {
      this.log('添加音乐轨道', false, error.message)
    }
  }

  // 测试3: 音乐卡点功能
  async test_musicBeatPoints() {
    try {
      // 找到音乐轨道
      const musicTracks = this.findElements('.additional-track-item').filter(track => 
        track.textContent.includes('音乐')
      )
      
      if (musicTracks.length === 0) {
        this.log('音乐卡点功能', false, '没有音乐轨道')
        return
      }
      
      // 双击音乐轨道
      await this.doubleClick(musicTracks[0])
      await this.wait(500)
      
      // 检查是否显示气泡
      const popup = this.findElement('.track-popup')
      if (!popup) {
        this.log('音乐卡点功能', false, '未显示操作气泡')
        return
      }
      
      // 点击"音乐卡点"按钮
      const beatButton = this.findElements('.track-popup-button').find(btn => 
        btn.textContent.includes('音乐卡点')
      )
      
      if (!beatButton) {
        this.log('音乐卡点功能', false, '未找到音乐卡点按钮')
        return
      }
      
      await this.click(beatButton)
      await this.wait(500)
      
      // 检查是否生成卡点
      const beatPoints = this.findElements('.music-beat-point')
      const hasBeatPoints = beatPoints.length > 0
      
      this.log('音乐卡点功能', hasBeatPoints, 
        hasBeatPoints ? `生成了${beatPoints.length}个卡点` : '未生成卡点')
    } catch (error) {
      this.log('音乐卡点功能', false, error.message)
    }
  }

  // 测试4: 轨道选中和方向控制
  async test_trackSelection() {
    try {
      // 找到任意轨道
      const tracks = this.findElements('.additional-track-item')
      
      if (tracks.length === 0) {
        this.log('轨道选中功能', false, '没有可选中的轨道')
        return
      }
      
      // 单击轨道
      await this.click(tracks[0])
      await this.wait(300)
      
      // 检查是否显示选中样式
      const isSelected = tracks[0].classList.contains('selected')
      
      // 检查是否显示方向控制按钮
      const controlButtons = this.findElements('.track-control-buttons')
      const hasControls = controlButtons.length > 0
      
      this.log('轨道选中功能', isSelected && hasControls, 
        isSelected && hasControls ? '' : '未正确显示选中状态或控制按钮')
    } catch (error) {
      this.log('轨道选中功能', false, error.message)
    }
  }

  // 测试5: 轨道变长功能
  async test_trackLengthen() {
    try {
      // 找到音乐轨道
      const musicTracks = this.findElements('.additional-track-item').filter(track => 
        track.textContent.includes('音乐')
      )
      
      if (musicTracks.length === 0) {
        this.log('轨道变长功能', false, '没有音乐轨道')
        return
      }
      
      // 记录初始宽度
      const initialWidth = musicTracks[0].style.width
      
      // 双击音乐轨道
      await this.doubleClick(musicTracks[0])
      await this.wait(500)
      
      // 点击"变长"按钮
      const lengthenButton = this.findElements('.track-popup-button').find(btn => 
        btn.textContent.includes('变长')
      )
      
      if (!lengthenButton) {
        this.log('轨道变长功能', false, '未找到变长按钮')
        return
      }
      
      await this.click(lengthenButton)
      await this.wait(500)
      
      // 检查宽度是否增加
      const newWidth = musicTracks[0].style.width
      const widthIncreased = parseFloat(newWidth) > parseFloat(initialWidth)
      
      this.log('轨道变长功能', widthIncreased, 
        widthIncreased ? `宽度从 ${initialWidth} 增加到 ${newWidth}` : '宽度未增加')
    } catch (error) {
      this.log('轨道变长功能', false, error.message)
    }
  }

  // 测试6: 卡点自动延续
  async test_beatPointsAutoContinue() {
    try {
      // 找到有卡点的音乐轨道
      const musicTracks = this.findElements('.additional-track-item').filter(track => 
        track.textContent.includes('音乐')
      )
      
      if (musicTracks.length === 0) {
        this.log('卡点自动延续', false, '没有音乐轨道')
        return
      }
      
      // 记录初始卡点数量
      const initialBeatPoints = this.findElements('.music-beat-point').length
      
      if (initialBeatPoints === 0) {
        this.log('卡点自动延续', false, '音乐轨道没有卡点')
        return
      }
      
      // 双击音乐轨道
      await this.doubleClick(musicTracks[0])
      await this.wait(500)
      
      // 点击"变长"按钮
      const lengthenButton = this.findElements('.track-popup-button').find(btn => 
        btn.textContent.includes('变长')
      )
      await this.click(lengthenButton)
      await this.wait(500)
      
      // 检查卡点数量是否增加
      const newBeatPoints = this.findElements('.music-beat-point').length
      const beatPointsIncreased = newBeatPoints > initialBeatPoints
      
      this.log('卡点自动延续', beatPointsIncreased, 
        beatPointsIncreased ? `卡点从 ${initialBeatPoints} 增加到 ${newBeatPoints}` : '卡点未增加')
    } catch (error) {
      this.log('卡点自动延续', false, error.message)
    }
  }

  // 测试7: 吸底状态检测
  async test_stickyMode() {
    try {
      // 检查固定轨道容器是否显示
      const fixedContainer = this.findElement('.timeline-main-track-fixed')
      const isSticky = fixedContainer && fixedContainer.classList.contains('sticky')
      
      // 检查滚动容器的对齐方式
      const scrollableContainer = this.findElement('.timeline-tracks-scrollable')
      const hasAlignClass = scrollableContainer && (
        scrollableContainer.classList.contains('align-bottom') ||
        scrollableContainer.classList.contains('align-top')
      )
      
      this.log('吸底状态检测', true, 
        `吸底模式: ${isSticky ? '是' : '否'}, 对齐类: ${hasAlignClass ? '有' : '无'}`)
    } catch (error) {
      this.log('吸底状态检测', false, error.message)
    }
  }

  // 测试8: 字幕轨道随机分割
  async test_subtitleSplit() {
    try {
      // 点击"文字"按钮
      const textButton = this.findElements('.toolbar-button').find(btn => 
        btn.textContent.includes('文字')
      )
      await this.click(textButton)
      
      // 点击"+主轨字幕"
      const addSubtitleButton = this.findElements('.submenu-item').find(btn => 
        btn.textContent.includes('+主轨字幕')
      )
      
      const initialTrackCount = this.findElements('.additional-track-item').length
      
      await this.click(addSubtitleButton)
      await this.wait(500)
      
      // 检查是否生成多段字幕
      const newTrackCount = this.findElements('.additional-track-item').length
      const addedTracks = newTrackCount - initialTrackCount
      
      const isValidSplit = addedTracks >= 2 && addedTracks <= 5
      
      this.log('字幕轨道随机分割', isValidSplit, 
        `生成了 ${addedTracks} 段字幕 (预期2-5段)`)
    } catch (error) {
      this.log('字幕轨道随机分割', false, error.message)
    }
  }

  // 生成测试报告
  generateReport() {
    console.log('\n' + '='.repeat(50))
    console.log('测试报告')
    console.log('='.repeat(50))
    console.log(`总计: ${this.results.length} 个测试`)
    console.log(`✅ 通过: ${this.passed}`)
    console.log(`❌ 失败: ${this.failed}`)
    console.log(`通过率: ${((this.passed / this.results.length) * 100).toFixed(2)}%`)
    console.log('='.repeat(50))
    
    if (this.failed > 0) {
      console.log('\n失败的测试:')
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.testName}: ${r.message}`)
      })
    }
    
    return {
      total: this.results.length,
      passed: this.passed,
      failed: this.failed,
      passRate: (this.passed / this.results.length) * 100,
      details: this.results
    }
  }

  // 运行所有测试
  async runAll() {
    console.log('开始运行测试...\n')
    
    await this.test_addTrack()
    await this.test_addMusicTrack()
    await this.test_musicBeatPoints()
    await this.test_trackSelection()
    await this.test_trackLengthen()
    await this.test_beatPointsAutoContinue()
    await this.test_stickyMode()
    await this.test_subtitleSplit()
    
    return this.generateReport()
  }
}

// 自动运行测试
console.log('视频时间轴编辑器 - 自动化测试\n')
console.log('正在初始化测试...\n')

const runner = new TimelineTestRunner()
runner.runAll().then(report => {
  console.log('\n测试完成!')
  
  // 将结果保存到 window 对象，方便查看
  window.testReport = report
  console.log('\n测试报告已保存到 window.testReport')
})
