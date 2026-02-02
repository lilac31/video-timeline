import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './Timeline.css'

// 轨道颜色配置
const TRACK_COLORS = {
  '文字': '#348CFF',
  '主轨字幕': '#21B7F1',
  '歌词字幕': '#0CD2D9',
  '音乐字幕': '#0CD2D9',
  '画中画字幕': '#21B7F1',
  '音效': '#FF34C9',
  '录音': '#FD2C75',
  '录音字幕': '#21B7F1',
  '提取音频': '#B71CFE',
  '主轨原声': '#B71CFE',
  '画中画原声': '#B71CFE',
  '音乐': '#8E34FF',
  '特效': '#FF7F39',
  '贴纸': '#FF6247',
  'TTS': '#FF34C9',
  '画中画': '#21B7F1'
}

function Timeline() {
  const navigate = useNavigate()
  const location = useLocation()
  const [media, setMedia] = useState([])
  const [additionalTracks, setAdditionalTracks] = useState([])
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [selectedItemType, setSelectedItemType] = useState(null) // 'main' or 'additional'
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentPreview, setCurrentPreview] = useState(null)
  const [previewHeight, setPreviewHeight] = useState(35)
  const [isDraggingDivider, setIsDraggingDivider] = useState(false)
  const [activeSubmenu, setActiveSubmenu] = useState(null)
  const [activeThirdMenu, setActiveThirdMenu] = useState(null) // 三级菜单状态
  const [showPopup, setShowPopup] = useState(null) // 存储当前显示气泡的项ID
  const [isDraggingTrack, setIsDraggingTrack] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartOffset, setDragStartOffset] = useState(0)
  const [draggingItemId, setDraggingItemId] = useState(null) // 正在拖动的项目ID（不显示选中样式）
  const [draggingItemType, setDraggingItemType] = useState(null)
  const [showSchemeMenu, setShowSchemeMenu] = useState(false)
  const [currentScheme, setCurrentScheme] = useState('1.2-主轨方案')
  const [shouldStickMainTrack, setShouldStickMainTrack] = useState(false) // 默认不吸底
  const [userManuallyExpanded, setUserManuallyExpanded] = useState(false) // 用户是否手动展开
  const [lastClickTime, setLastClickTime] = useState(0)
  const [lastClickId, setLastClickId] = useState(null)
  const [userExpandedMusicTracks, setUserExpandedMusicTracks] = useState(new Set()) // 记录用户双击展开的音乐轨道
  const [musicBeatPoints, setMusicBeatPoints] = useState({}) // 记录每个音乐轨道的卡点 { trackId: [position1, position2, ...] }
  const [projectName, setProjectName] = useState('') // 项目名称
  const [showSaveDialog, setShowSaveDialog] = useState(false) // 显示保存对话框
  const [showDerivativeToolbar, setShowDerivativeToolbar] = useState(null) // 显示派生工具栏 { itemId, itemType, trackName }
  const [showRowArrows, setShowRowArrows] = useState(null) // 显示行移动箭头的rowIndex { position: 'above'|'below', rowIndex: number }
  const [rulerScrollLeft, setRulerScrollLeft] = useState(0) // 标尺滚动位置
  const [savedSchemes, setSavedSchemes] = useState({}) // 保存的方案 { '1': {...}, '2': {...}, ... }
  const [currentSchemeId, setCurrentSchemeId] = useState(null) // 当前选中的方案ID
  const [schemeNames, setSchemeNames] = useState({}) // 方案自定义名称 { '1': '方案名', '2': '方案名', ... }
  const [editingSchemeId, setEditingSchemeId] = useState(null) // 正在编辑名称的方案ID
  const [schemeMarkers, setSchemeMarkers] = useState([]) // 方案标记点 [{ schemeId, time, schemeName }]
  const [showSchemeConfirm, setShowSchemeConfirm] = useState(null) // 显示方案确认对话框 { schemeId, action: 'save'|'switch' }
  const [schemeSwitcherCollapsed, setSchemeSwitcherCollapsed] = useState(false) // 方案切换器是否收起
  const [showShortenMenu, setShowShortenMenu] = useState(false) // 显示"变短"子菜单
  
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const timelineSectionRef = useRef(null)
  const tracksRef = useRef(null)
  const scrollableTracksRef = useRef(null)
  const fixedTracksRef = useRef(null)
  const fileInputRef = useRef(null) // 用于重新选择媒体文件

  // 计算总时长 - 使用 useMemo 缓存，避免在 useEffect 中访问未定义的值
  const totalDuration = useMemo(() => {
    return media.reduce((acc, m) => acc + (m.duration || 0), 0)
  }, [media])

  // 尝试从 localStorage 恢复项目（仅当是从工程包进入时）
  useEffect(() => {
    // 检查是否是从工程包恢复
    if (location.state?.restoreProject) {
      const savedProject = localStorage.getItem('currentProject')
      if (savedProject) {
        try {
          const project = JSON.parse(savedProject)
          console.log('🔄 恢复工程包:', project.projectName, '| 保存时间:', project.savedAt)
          
          // 检查媒体文件URL是否有效
          const hasValidMedia = project.media && project.media.length > 0
          if (hasValidMedia) {
            // 尝试检查第一个媒体的URL是否有效
            const firstMedia = project.media[0]
            if (firstMedia.url && !firstMedia.url.startsWith('blob:')) {
              console.warn('⚠️ 媒体文件URL可能已失效')
              alert('提示：工程包中的媒体文件已失效，无法播放预览。\n\n原因：浏览器的安全限制导致文件引用在关闭页面后失效。\n\n建议：保留原始素材文件，需要时重新选择导入。')
            }
          }
          
          // 恢复状态
          setMedia(project.media || [])
          setAdditionalTracks(project.additionalTracks || [])
          setCurrentScheme(project.currentScheme || '1.2-主轨方案')
          setMusicBeatPoints(project.musicBeatPoints || {})
          setUserExpandedMusicTracks(new Set(project.userExpandedMusicTracks || []))
          setProjectName(project.projectName || '')
          
          // 恢复方案数据
          if (project.savedSchemes) {
            setSavedSchemes(project.savedSchemes)
          }
          if (project.currentSchemeId) {
            setCurrentSchemeId(project.currentSchemeId)
          }
          if (project.schemeNames) {
            setSchemeNames(project.schemeNames)
          }
          if (project.schemeMarkers) {
            setSchemeMarkers(project.schemeMarkers)
          }
          
          // 恢复预览 - 延迟设置以确保媒体数据已加载
          if (project.media && project.media.length > 0) {
            // 立即设置
            setCurrentPreview(project.media[0])
            // 延迟再次确保
            setTimeout(() => {
              setCurrentPreview(project.media[0])
              console.log('✅ 预览已恢复（但文件可能已失效）:', project.media[0])
            }, 100)
          }
        } catch (e) {
          console.error('❌ 恢复项目失败:', e)
        }
      }
    } else if (location.state?.media && location.state.media.length > 0) {
      // 新项目：清空项目名
      setProjectName('')
    }
  }, [])

  useEffect(() => {
    if (location.state?.media && location.state.media.length > 0) {
      console.log('初始化媒体数据:', location.state.media)
      
      // 多次尝试获取容器，确保 DOM 已完全渲染
      const initializeMedia = () => {
        const tracksContainer = document.querySelector('.timeline-tracks-scrollable') || document.querySelector('.timeline-tracks')
        
        if (!tracksContainer) {
          console.log('容器未找到，重试中...')
          return false
        }
        
        const centerOffset = tracksContainer.clientWidth / 2
        console.log('容器宽度:', tracksContainer.clientWidth, '中心偏移:', centerOffset)
        
        // 为每个媒体项目获取实际时长
        const processMedia = async () => {
          const mediaWithDuration = await Promise.all(
            location.state.media.map((item, index) => {
              return new Promise((resolve) => {
                if (item.type === 'video') {
                  // 创建 video 元素获取真实时长
                  const video = document.createElement('video')
                  video.src = item.url
                  video.preload = 'metadata'
                  
                  // 超时保护
                  const timeout = setTimeout(() => {
                    console.log(`视频 ${index} 加载超时，使用默认时长`)
                    resolve({
                      ...item,
                      duration: 5,
                      startTime: 0,
                      offset: centerOffset
                    })
                  }, 5000)
                  
                  video.onloadedmetadata = () => {
                    clearTimeout(timeout)
                    const duration = Math.ceil(video.duration) || 5
                    console.log(`视频 ${index} 时长:`, duration)
                    resolve({
                      ...item,
                      duration: duration,
                      startTime: 0,
                      offset: centerOffset
                    })
                  }
                  
                  video.onerror = (e) => {
                    clearTimeout(timeout)
                    console.error(`视频 ${index} 加载错误:`, e)
                    resolve({
                      ...item,
                      duration: 5,
                      startTime: 0,
                      offset: centerOffset
                    })
                  }
                } else {
                  // 图片默认3秒
                  resolve({
                    ...item,
                    duration: 3,
                    startTime: 0,
                    offset: centerOffset
                  })
                }
              })
            })
          )
          
          // 计算每个项目的开始时间和累积偏移
          let accumulatedOffset = centerOffset
          const finalMedia = mediaWithDuration.map((item, index) => {
            const itemWithPosition = { 
              ...item, 
              offset: index === 0 ? centerOffset : accumulatedOffset,
              startTime: 0
            }
            // 下一个项目紧接着当前项目
            accumulatedOffset = itemWithPosition.offset + (item.duration * 40)
            return itemWithPosition
          })
          
          // 重新计算 startTime
          let currentTimeAcc = 0
          const finalMediaWithTime = finalMedia.map(item => {
            const itemWithTime = { ...item, startTime: currentTimeAcc }
            currentTimeAcc += item.duration
            return itemWithTime
          })
          
          console.log('最终媒体数据:', finalMediaWithTime)
          setMedia(finalMediaWithTime)
          
          if (finalMediaWithTime.length > 0) {
            setCurrentPreview(finalMediaWithTime[0])
          }
        }
        
        processMedia()
        return true
      }
      
      // 尝试初始化，如果失败则重试
      let retryCount = 0
      const maxRetries = 5
      
      const tryInit = () => {
        if (initializeMedia()) {
          console.log('媒体初始化成功')
        } else if (retryCount < maxRetries) {
          retryCount++
          console.log(`重试初始化 (${retryCount}/${maxRetries})`)
          setTimeout(tryInit, 200)
        } else {
          console.error('媒体初始化失败：无法找到容器')
        }
      }
      
      setTimeout(tryInit, 100)
    }
  }, [location.state])

  useEffect(() => {
    if (media.length > 0) {
      // 根据当前时间找到应该播放的媒体项
      const currentItem = media.find(m => 
        currentTime >= m.startTime && currentTime < m.startTime + m.duration
      )
      
      if (currentItem) {
        // 如果切换了媒体项，更新预览
        if (currentItem.id !== currentPreview?.id) {
          setCurrentPreview(currentItem)
        }
        
        // 如果是视频，更新视频的当前时间
        if (currentItem.type === 'video' && videoRef.current) {
          const videoTime = currentTime - currentItem.startTime
          if (Math.abs(videoRef.current.currentTime - videoTime) > 0.2) {
            videoRef.current.currentTime = videoTime
          }
        }
      }
    }
  }, [currentTime, media, currentPreview])

  // 确保恢复项目时有预览
  useEffect(() => {
    if (media.length > 0 && !currentPreview) {
      console.log('检测到媒体数据但预览为空，自动设置预览')
      setCurrentPreview(media[0])
    }
  }, [media, currentPreview])

  useEffect(() => {
    let interval
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const totalDuration = media.reduce((acc, m) => acc + m.duration, 0)
          const newTime = prev + 0.1
          if (newTime >= totalDuration) {
            setIsPlaying(false)
            return totalDuration
          }
          return newTime
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, media])

  // 视频播放同步
  useEffect(() => {
    if (isPlaying && currentPreview?.type === 'video' && videoRef.current) {
      const videoTime = currentTime - (currentPreview.startTime || 0)
      if (Math.abs(videoRef.current.currentTime - videoTime) > 0.2) {
        videoRef.current.currentTime = videoTime
      }
      videoRef.current.play().catch(e => console.log('Video play error:', e))
    } else if (videoRef.current && !isPlaying) {
      videoRef.current.pause()
    }
  }, [isPlaying, currentTime, currentPreview])

  // 防止安卓右滑返回手势
  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0
    let isEdgeSwipe = false

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      // 检测是否从屏幕右侧边缘开始滑动（右侧50px内）
      const windowWidth = window.innerWidth
      isEdgeSwipe = touchStartX > windowWidth - 50
    }

    const handleTouchMove = (e) => {
      if (!isEdgeSwipe) return
      
      const touchCurrentX = e.touches[0].clientX
      const touchCurrentY = e.touches[0].clientY
      const deltaX = touchCurrentX - touchStartX
      const deltaY = touchCurrentY - touchStartY
      
      // 如果是从右向左的水平滑动（返回手势），阻止默认行为
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -10) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const timelineContainer = containerRef.current
    if (timelineContainer) {
      timelineContainer.addEventListener('touchstart', handleTouchStart, { passive: true })
      timelineContainer.addEventListener('touchmove', handleTouchMove, { passive: false })
    }

    return () => {
      if (timelineContainer) {
        timelineContainer.removeEventListener('touchstart', handleTouchStart)
        timelineContainer.removeEventListener('touchmove', handleTouchMove)
      }
    }
  }, [])

  // 拖动分割线
  const handleDividerMouseDown = (e) => {
    setIsDraggingDivider(true)
    e.preventDefault()
  }

  const handleDividerTouchStart = (e) => {
    setIsDraggingDivider(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMove = (e) => {
      if (isDraggingDivider && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const headerHeight = 44
        const toolbarHeight = containerRect.height * 0.2
        const dividerHeight = 8
        const availableHeight = containerRect.height - headerHeight - toolbarHeight - dividerHeight
        
        // 支持触摸和鼠标
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        const mouseY = clientY - containerRect.top - headerHeight
        const newPreviewPercent = (mouseY / availableHeight) * 100
        
        if (newPreviewPercent > 15 && newPreviewPercent < 70) {
          setPreviewHeight(newPreviewPercent)
        }
      }
    }

    const handleEnd = () => {
      setIsDraggingDivider(false)
    }

    if (isDraggingDivider) {
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleMove, { passive: false })
      document.addEventListener('touchend', handleEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDraggingDivider])

  // 轨道拖动（支持水平和垂直）
  const handleTrackMouseDown = (e, itemId, itemType, currentOffset) => {
    console.log('Track mouse down:', itemId, itemType, currentOffset)
    e.preventDefault()
    e.stopPropagation()
    
    // 只有已选中的轨道才能拖动
    if (selectedItemId !== itemId) {
      console.log('未选中的轨道不能拖动')
      return
    }
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    // 使用 draggingItemId 而不是 selectedItemId，拖动不等于选中
    setDraggingItemId(itemId)
    setDraggingItemType(itemType)
    setIsDraggingTrack(true)
    setDragStartX(clientX)
    setDragStartOffset(currentOffset || 0)
    
    // 视频轨道不支持拖动，位置在选择素材时已固定
    if (itemType === 'main') {
      return
    }
    
    // 记录初始 Y 位置，用于垂直拖动
    if (itemType === 'additional') {
      const track = additionalTracks.find(t => t.id === itemId)
      if (track) {
        // 使用 state 保存初始拖动信息
        window.__dragStartY = clientY
        window.__dragStartRowIndex = track.rowIndex
        window.__dragTrackName = track.name
        
        // 禁用容器滚动，防止背景移动
        const tracksContainer = scrollableTracksRef.current || document.querySelector('.timeline-tracks-scrollable')
        if (tracksContainer) {
          window.__originalScrollLeft = tracksContainer.scrollLeft
          window.__originalScrollTop = tracksContainer.scrollTop
        }
      }
    }
  }

  useEffect(() => {
    const handleMove = (e) => {
      if (isDraggingTrack && draggingItemId && draggingItemType) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        
        // 视频轨道不支持拖动
        if (draggingItemType === 'main') {
          return
        }
        
        // 只在水平拖动时锁定容器滚动位置，垂直拖动时不锁定
        const tracksContainer = scrollableTracksRef.current || document.querySelector('.timeline-tracks-scrollable')
        if (tracksContainer && window.__originalScrollLeft !== undefined) {
          tracksContainer.scrollLeft = window.__originalScrollLeft
          // 不再锁定垂直滚动，允许用户在拖动时自由滚动查看轨道
          // tracksContainer.scrollTop = window.__originalScrollTop
        }
        
        // 处理垂直拖动（仅针对新增轨道）
        if (draggingItemType === 'additional' && window.__dragStartY !== undefined) {
          const deltaY = clientY - window.__dragStartY
          const rowHeight = 60 // 每行高度约60px
          const rowDelta = Math.round(deltaY / rowHeight)
          
          if (Math.abs(rowDelta) >= 1) {
            const currentTrack = additionalTracks.find(t => t.id === draggingItemId)
            if (!currentTrack) return
            
            const newRowIndex = Math.max(0, (window.__dragStartRowIndex || 0) - rowDelta)
            const oldRowIndex = window.__dragStartRowIndex || 0
            
            // 获取同类型的轨道（音频类 or 其他类）
            const audioTracks = ['音乐', '音效', '录音', 'TTS', '提取音频']
            const isAudioTrack = audioTracks.includes(currentTrack.name)
            const sameTypeTracks = additionalTracks.filter(t => 
              t.id !== draggingItemId && 
              (isAudioTrack ? audioTracks.includes(t.name) : !audioTracks.includes(t.name))
            )
            
            // 检查目标行是否有空间
            const targetRowTracks = sameTypeTracks.filter(t => t.rowIndex === newRowIndex)
            const currentTrackWidth = currentTrack.duration * 40
            const currentTrackStart = currentTrack.offset
            const currentTrackEnd = currentTrackStart + currentTrackWidth
            
            let hasConflict = false
            for (const track of targetRowTracks) {
              const trackStart = track.offset
              const trackEnd = track.offset + (track.duration * 40)
              
              // 检查是否有位置冲突
              if (currentTrackEnd > trackStart && currentTrackStart < trackEnd) {
                hasConflict = true
                break
              }
            }
            
            // 如果目标行有冲突，自动为其腾出空位
            if (hasConflict) {
              console.log(`目标行 ${newRowIndex} 有冲突，自动腾出空位`)
              
              // 将目标行及之后的所有同类型轨道下移一行
              setAdditionalTracks(prev => prev.map(track => {
                // 跳过当前拖动的轨道
                if (track.id === draggingItemId) {
                  return { ...track, rowIndex: newRowIndex, manuallyAdjusted: true }
                }
                
                // 只处理同类型的轨道
                const isSameType = isAudioTrack 
                  ? audioTracks.includes(track.name) 
                  : !audioTracks.includes(track.name)
                
                if (isSameType && track.rowIndex !== undefined && track.rowIndex >= newRowIndex) {
                  // 目标行及之后的轨道都下移一行
                  return { ...track, rowIndex: track.rowIndex + 1 }
                }
                
                return track
              }))
            } else {
              // 没有冲突，直接移动
              setAdditionalTracks(prev => prev.map(track => 
                track.id === draggingItemId 
                  ? { ...track, rowIndex: newRowIndex, manuallyAdjusted: true } 
                  : track
              ))
            }
            
            // 更新拖动起始点
            window.__dragStartY = clientY
            window.__dragStartRowIndex = newRowIndex
            return // 垂直拖动时不处理水平移动
          }
        }

        // 水平拖动
        const deltaX = clientX - dragStartX
        const newOffset = Math.max(0, dragStartOffset + deltaX) // 不允许移动到负数位置
        
        console.log('Dragging:', draggingItemType, deltaX, newOffset)

        // 直接更新位置，标记为已手动调整
        setAdditionalTracks(prev => prev.map(track => 
          track.id === draggingItemId 
            ? { ...track, offset: newOffset, manuallyAdjusted: true } 
            : track
        ))
        
        // 实时更新拖动起始点，保持跟手
        setDragStartX(clientX)
        setDragStartOffset(newOffset)
      }
    }

    const handleEnd = () => {
      // 清除垂直拖动的临时数据
      delete window.__dragStartY
      delete window.__dragStartRowIndex
      delete window.__dragTrackName
      delete window.__originalScrollLeft
      delete window.__originalScrollTop
      
      setIsDraggingTrack(false)
      setDraggingItemId(null)
      setDraggingItemType(null)
    }

    if (isDraggingTrack) {
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleMove, { passive: false })
      document.addEventListener('touchend', handleEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDraggingTrack, draggingItemId, draggingItemType, dragStartX, dragStartOffset, media, additionalTracks])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleStop = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.pause()
    }
  }

  // 播放逻辑：更新currentTime、同步视频、自动滚动时间轴
  useEffect(() => {
    if (!isPlaying || !totalDuration) return

    let animationFrameId = null
    let lastTimestamp = performance.now()

    const animate = (timestamp) => {
      const deltaTime = (timestamp - lastTimestamp) / 1000 // 转换为秒
      lastTimestamp = timestamp

      setCurrentTime(prevTime => {
        const newTime = prevTime + deltaTime
        
        // 如果播放到结尾，停止播放
        if (totalDuration && newTime >= totalDuration) {
          setIsPlaying(false)
          return totalDuration
        }

        // 更新视频预览的播放位置
        if (videoRef.current && currentPreview && currentPreview.type === 'video') {
          const videoTime = newTime - currentPreview.startTime
          if (videoTime >= 0 && videoTime <= currentPreview.duration) {
            // 只在时间偏差超过0.1秒时才同步，避免频繁设置
            if (Math.abs(videoRef.current.currentTime - videoTime) > 0.1) {
              videoRef.current.currentTime = videoTime
            }
            if (videoRef.current.paused) {
              videoRef.current.play().catch(e => console.log('视频播放失败:', e))
            }
          }
        }

        // 自动滚动时间轴，保持播放指针在屏幕中心
        const scrollContainer = shouldStickMainTrack && !userManuallyExpanded 
          ? fixedTracksRef.current 
          : scrollableTracksRef.current

        if (scrollContainer) {
          // 计算当前时间对应的像素位置 (40px = 1秒)
          const pixelPosition = newTime * 40
          
          // 容器宽度的一半，保持中心线位置
          const containerHalfWidth = scrollContainer.clientWidth / 2
          
          // 计算目标滚动位置：让pixelPosition在屏幕中心
          const targetScrollLeft = pixelPosition - containerHalfWidth
          
          // 设置滚动位置（不使用smooth，避免延迟）
          scrollContainer.scrollLeft = Math.max(0, targetScrollLeft)
        }

        // 检查是否需要切换预览的视频片段
        const currentMediaItem = media.find(m => 
          newTime >= m.startTime && newTime < m.startTime + m.duration
        )
        
        if (currentMediaItem && currentMediaItem.id !== currentPreview?.id) {
          setCurrentPreview(currentMediaItem)
          // 立即设置新视频的播放位置
          if (videoRef.current && currentMediaItem.type === 'video') {
            const videoTime = newTime - currentMediaItem.startTime
            videoRef.current.currentTime = videoTime
            videoRef.current.play().catch(e => console.log('视频播放失败:', e))
          }
        }

        return newTime
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      // 暂停视频
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, totalDuration, currentPreview, media, shouldStickMainTrack, userManuallyExpanded])

  const handleItemClick = (e, itemId, itemType) => {
    e.stopPropagation()
    
    const currentTime = Date.now()
    const timeDiff = currentTime - lastClickTime
    const isDoubleClick = timeDiff < 300 && lastClickId === itemId // 300ms 内双击同一个元素
    
    setLastClickTime(currentTime)
    setLastClickId(itemId)
    
    if (isDoubleClick) {
      // 双击：显示弹窗
      if (itemType === 'main') {
        // 双击主轨视频：显示弹窗（在当前点击位置显示，不滚动）
        const item = media.find(m => m.id === itemId)
        if (item) {
          setCurrentPreview(item)
          setCurrentTime(item.startTime)
          setShowPopup(itemId)
          setSelectedItemId(itemId)
          setSelectedItemType(itemType)
        }
      } else if (itemType === 'additional') {
        const track = additionalTracks.find(t => t.id === itemId)
        if (!track) return
        
        // 音乐轨道和主轨原声在吸底模式下的展开/折叠切换
        if ((track.name === '音乐' || track.name === '主轨原声') && track.position === 'below' && shouldStickMainTrack) {
          setUserExpandedMusicTracks(prev => {
            const newSet = new Set(prev)
            if (newSet.has(itemId)) {
              newSet.delete(itemId)
            } else {
              newSet.add(itemId)
            }
            return newSet
          })
          // 注意：仍然显示气泡，不要return
        }
        
        // 显示普通弹窗（在当前点击位置显示，不滚动）
        setShowPopup(itemId)
        setSelectedItemId(itemId)
        setSelectedItemType(itemType)
      }
    }
    // 单击：什么都不做，让拖动逻辑处理
  }

  const handleDeleteTrack = (e) => {
    e.stopPropagation()
    if (selectedItemType === 'additional') {
      setAdditionalTracks(prev => prev.filter(track => track.id !== selectedItemId))
      // 清除展开状态
      setUserExpandedMusicTracks(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedItemId)
        return newSet
      })
      // 清除卡点数据
      setMusicBeatPoints(prev => {
        const newPoints = { ...prev }
        delete newPoints[selectedItemId]
        return newPoints
      })
    }
    setShowPopup(null)
    setSelectedItemId(null)
    setSelectedItemType(null)
  }

  const handleDuplicateTrack = (e) => {
    e.stopPropagation()
    if (selectedItemType === 'additional') {
      const track = additionalTracks.find(t => t.id === selectedItemId)
      if (track) {
        const newTrack = {
          ...track,
          id: `${Date.now()}_${Math.random()}`,
          offset: (track.offset || 0) + 100,
          position: 'above',
          createdAt: Date.now(), // 新的时间戳，会插入到同组最上方
          manuallyAdjusted: true // 复制的轨道标记为已手动调整
        }
        setAdditionalTracks(prev => [...prev, newTrack])
      }
    } else if (selectedItemType === 'main') {
      const item = media.find(m => m.id === selectedItemId)
      if (item) {
        const newItem = {
          ...item,
          id: `${Date.now()}_${Math.random()}`,
          offset: (item.offset || 0) + 100
        }
        setMedia(prev => [...prev, newItem])
      }
    }
    setShowPopup(null)
  }

  // 重新加载主轨媒体文件
  const handleReloadMedia = (e, mediaItemId) => {
    e.stopPropagation()
    // 存储要替换的媒体项的ID
    window._reloadingMediaId = mediaItemId
    // 触发文件选择器
    fileInputRef.current?.click()
  }

  // 处理文件选择
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const mediaItemId = window._reloadingMediaId
    if (!mediaItemId) return

    const file = files[0]
    const fileType = file.type.startsWith('video/') ? 'video' : 'image'
    const fileURL = URL.createObjectURL(file)

    // 获取视频时长
    const getDuration = () => {
      return new Promise((resolve) => {
        if (fileType === 'video') {
          const video = document.createElement('video')
          video.src = fileURL
          video.preload = 'metadata'
          
          const timeout = setTimeout(() => {
            resolve(5) // 默认时长
          }, 5000)
          
          video.onloadedmetadata = () => {
            clearTimeout(timeout)
            resolve(Math.ceil(video.duration) || 5)
          }
          
          video.onerror = () => {
            clearTimeout(timeout)
            resolve(5)
          }
        } else {
          resolve(3) // 图片默认3秒
        }
      })
    }

    const duration = await getDuration()

    // 更新media数组
    setMedia(prev => prev.map(item => {
      if (item.id === mediaItemId) {
        return {
          ...item,
          url: fileURL,
          type: fileType,
          duration: duration,
          file: file,
          name: file.name
        }
      }
      return item
    }))

    // 更新预览
    const updatedItem = media.find(m => m.id === mediaItemId)
    if (updatedItem && currentPreview?.id === mediaItemId) {
      setCurrentPreview({
        ...updatedItem,
        url: fileURL,
        type: fileType,
        duration: duration
      })
    }

    console.log('✅ 媒体文件已重新加载:', file.name)
    alert(`已重新加载: ${file.name}`)
    
    // 清理
    window._reloadingMediaId = null
    e.target.value = '' // 清空input，允许选择同一文件
  }

  const handleLengthenTrack = (e) => {
    e.stopPropagation()
    if (selectedItemType === 'additional') {
      setAdditionalTracks(prev => prev.map(track => {
        if (track.id === selectedItemId) {
          const newDuration = track.duration + 3
          
          // 如果是音乐轨道且已有卡点，自动在新增的3秒内继续打卡点
          if (track.name === '音乐' && musicBeatPoints[track.id] && musicBeatPoints[track.id].length > 0) {
            const existingPoints = musicBeatPoints[track.id]
            const oldDurationSec = track.duration
            const newPoints = [...existingPoints]
            
            // 找出最后一个卡点的时间（秒）
            const lastPointPx = Math.max(...existingPoints)
            const lastPointSec = lastPointPx / 40
            
            // 计算从最后一个卡点到旧时长结束，经过了多少时间
            const timeSinceLastPoint = oldDurationSec - lastPointSec
            
            // 确定当前在 [1s, 1s, 1s, 3s] 循环中的哪个位置
            const intervals = [1, 1, 1, 3]
            let cyclePosition = 0
            let accumulatedTime = 0
            
            // 通过累加找到当前应该在循环的哪个位置
            for (let i = 0; i < existingPoints.length; i++) {
              accumulatedTime += intervals[cyclePosition % 4]
              cyclePosition++
            }
            
            // 从旧时长开始，继续按规律打卡点
            let currentTime = oldDurationSec
            
            // 如果距离最后一个卡点还没到下一个间隔时间，需要先等待
            const currentInterval = intervals[cyclePosition % 4]
            if (timeSinceLastPoint < currentInterval) {
              // 补齐剩余的时间
              currentTime = lastPointSec + currentInterval
              cyclePosition++
            }
            
            // 在新增的3秒内继续打卡点
            while (currentTime < newDuration) {
              const interval = intervals[cyclePosition % 4]
              if (currentTime >= oldDurationSec && currentTime < newDuration) {
                newPoints.push(currentTime * 40) // 转换为像素位置
              }
              currentTime += interval
              cyclePosition++
            }
            
            // 更新卡点
            setMusicBeatPoints(prev => ({
              ...prev,
              [track.id]: newPoints
            }))
          }
          
          return { ...track, duration: newDuration }
        }
        return track
      }))
    }
    // 保持气泡打开，方便连续调整
  }

  const handleShortenTrack = (e) => {
    e.stopPropagation()
    // 显示"变短"子菜单，而不是直接缩短
    setShowShortenMenu(true)
  }

  // 处理"变短"子菜单选项
  const handleShortenOption = (e, option) => {
    e.stopPropagation()
    setShowShortenMenu(false)
    
    if (selectedItemType === 'additional') {
      const track = additionalTracks.find(t => t.id === selectedItemId)
      if (!track) return
      
      let newDuration
      switch (option) {
        case '1s':
          newDuration = 1
          break
        case '3s':
          newDuration = 3
          break
        case '5s':
          newDuration = 5
          break
        case 'match':
          // 与主轨一样长度
          newDuration = totalDuration
          break
        default:
          return
      }
      
      setAdditionalTracks(prev => prev.map(t => 
        t.id === selectedItemId 
          ? { ...t, duration: newDuration }
          : t
      ))
    }
  }

  // 音乐卡点功能 - 为当前选中的音乐轨道添加卡点
  // 规律：1s、1s、1s、3s 循环
  const handleAddMusicBeatPoints = (e) => {
    e.stopPropagation()
    if (selectedItemType === 'additional') {
      const track = additionalTracks.find(t => t.id === selectedItemId)
      if (track && track.name === '音乐') {
        const trackDurationSec = track.duration // 总秒数
        const points = []
        
        let currentTime = 0 // 当前时间（秒）
        
        while (currentTime < trackDurationSec) {
          // 1s、1s、1s、3s 循环
          const intervals = [1, 1, 1, 3]
          
          for (const interval of intervals) {
            if (currentTime >= trackDurationSec) break
            points.push(currentTime * 40) // 转换为像素位置
            currentTime += interval
          }
        }
        
        setMusicBeatPoints(prev => ({
          ...prev,
          [selectedItemId]: points
        }))
      }
    }
    // 保持气泡打开
  }

  // 左移轨道（-1秒 = -40px）
  const handleMoveLeft = (e) => {
    e.stopPropagation()
    if (selectedItemType === 'additional') {
      setAdditionalTracks(prev => prev.map(track => 
        track.id === selectedItemId 
          ? { ...track, offset: Math.max(0, (track.offset || 0) - 40), manuallyAdjusted: true }
          : track
      ))
    }
  }

  // 右移轨道（+1秒 = +40px）
  const handleMoveRight = (e) => {
    e.stopPropagation()
    if (selectedItemType === 'additional') {
      setAdditionalTracks(prev => prev.map(track => 
        track.id === selectedItemId 
          ? { ...track, offset: (track.offset || 0) + 40, manuallyAdjusted: true }
          : track
      ))
    }
  }

  // 上移轨道（移动一层） - 智能推挤版本
  const handleMoveUp = (e) => {
    e.stopPropagation()
    if (selectedItemType === 'additional') {
      const currentTrack = additionalTracks.find(t => t.id === selectedItemId)
      if (!currentTrack) return
      
      // 如果当前在下方（below），向上移动意味着移到主轨上方（above）
      if (currentTrack.position === 'below') {
        console.log('从下方移动到上方')
        setAdditionalTracks(prev => prev.map(track => 
          track.id === selectedItemId 
            ? { ...track, position: 'above', rowIndex: 0, manuallyAdjusted: true }
            : track
        ))
        return
      }
      
      // 已经在上方（above），继续向上移动层级
      if (currentTrack.rowIndex === undefined) return
      
      const newRowIndex = currentTrack.rowIndex + 1
      const currentTrackStart = currentTrack.offset
      const currentTrackEnd = currentTrackStart + (currentTrack.duration * 40)
      
      // 获取当前轨道的优先级和区域信息
      const currentPriority = getTrackPriority(currentTrack.name, currentTrack)
      const mixedZonePriority = 250
      const pipZonePriorities = [100, 110, 120]
      const mainSubtitlePriority = 20
      
      // 判断当前轨道所属区域
      const isInMixedZone = currentPriority === mixedZonePriority
      const isInPipZone = pipZonePriorities.includes(currentPriority)
      const isMainSubtitle = currentPriority === mainSubtitlePriority
      
      // 获取所有在上方的轨道
      const allTracksAbove = additionalTracks.filter(t => t.position === 'above' && t.id !== selectedItemId)
      
      // 找出目标行及更高行的轨道
      const tracksInTargetRow = allTracksAbove.filter(t => t.rowIndex === newRowIndex)
      const tracksAboveTargetRow = allTracksAbove.filter(t => t.rowIndex !== undefined && t.rowIndex > newRowIndex)
      
      // 检查目标行是否有时间冲突
      let hasConflict = false
      for (const track of tracksInTargetRow) {
        const trackStart = track.offset
        const trackEnd = track.offset + (track.duration * 40)
        if (currentTrackEnd > trackStart && currentTrackStart < trackEnd) {
          hasConflict = true
          break
        }
      }
      
      if (!hasConflict) {
        // 无冲突，直接移动（同区域优先找空隙）
        console.log('✅ 目标行无冲突，直接移动')
        setAdditionalTracks(prev => prev.map(track => 
          track.id === selectedItemId 
            ? { ...track, rowIndex: newRowIndex, manuallyAdjusted: true }
            : track
        ))
        return
      }
      
      // 有冲突，需要判断推挤策略
      console.log('⚠️ 目标行有冲突，判断推挤策略...')
      
      // 获取目标行轨道的优先级
      const targetRowPriorities = tracksInTargetRow.map(t => getTrackPriority(t.name, t))
      const targetIsMainSubtitle = targetRowPriorities.some(p => p === mainSubtitlePriority)
      const targetIsPipZone = targetRowPriorities.some(p => pipZonePriorities.includes(p))
      const targetIsMixedZone = targetRowPriorities.some(p => p === mixedZonePriority)
      
      // 策略1：如果目标行是主轨字幕区域（独立行），整行及以上所有内容上移
      if (targetIsMainSubtitle) {
        console.log('📌 遇到主轨字幕区域（独立行），整行及以上所有内容上移')
        setAdditionalTracks(prev => prev.map(track => {
          if (track.id === selectedItemId) {
            return { ...track, rowIndex: newRowIndex, manuallyAdjusted: true }
          }
          if (track.position !== 'above') return track
          // 目标行及以上所有轨道上移
          if (track.rowIndex !== undefined && track.rowIndex >= newRowIndex) {
            return { ...track, rowIndex: track.rowIndex + 1 }
          }
          return track
        }))
        return
      }
      
      // 策略2：如果目标行是画中画区域，画中画及以上所有内容上移
      if (targetIsPipZone) {
        console.log('🎬 遇到画中画区域，画中画及以上所有内容上移')
        setAdditionalTracks(prev => prev.map(track => {
          if (track.id === selectedItemId) {
            return { ...track, rowIndex: newRowIndex, manuallyAdjusted: true }
          }
          if (track.position !== 'above') return track
          // 目标行及以上所有轨道上移
          if (track.rowIndex !== undefined && track.rowIndex >= newRowIndex) {
            return { ...track, rowIndex: track.rowIndex + 1 }
          }
          return track
        }))
        return
      }
      
      // 策略3：同区域内（混合区域）移动，首先判断上方是否有空间
      if (isInMixedZone && targetIsMixedZone) {
        console.log('🔄 混合区域内移动，优先找空隙')
        // 已经检查过newRowIndex有冲突，继续向上查找空隙
        const allMixedZoneTracks = allTracksAbove.filter(t => 
          getTrackPriority(t.name, t) === mixedZonePriority
        )
        const maxMixedRow = allMixedZoneTracks.length > 0 
          ? Math.max(...allMixedZoneTracks.map(t => t.rowIndex || 0))
          : newRowIndex
        
        // 从newRowIndex+1开始往上找空隙
        let foundEmptyRow = null
        for (let row = newRowIndex + 1; row <= maxMixedRow + 1; row++) {
          const tracksInRow = allMixedZoneTracks.filter(t => t.rowIndex === row)
          let hasConflictInRow = false
          for (const track of tracksInRow) {
            const trackStart = track.offset
            const trackEnd = track.offset + (track.duration * 40)
            if (currentTrackEnd > trackStart && currentTrackStart < trackEnd) {
              hasConflictInRow = true
              break
            }
          }
          if (!hasConflictInRow) {
            foundEmptyRow = row
            console.log(`✅ 找到空隙row=${row}`)
            break
          }
        }
        
        if (foundEmptyRow !== null) {
          // 找到空隙，移动到空隙
          setAdditionalTracks(prev => prev.map(track => 
            track.id === selectedItemId 
              ? { ...track, rowIndex: foundEmptyRow, manuallyAdjusted: true }
              : track
          ))
        } else {
          // 没有空隙，在最上方新增一行
          console.log('📝 没有空隙，在最上方新增一行')
          setAdditionalTracks(prev => prev.map(track => 
            track.id === selectedItemId 
              ? { ...track, rowIndex: maxMixedRow + 1, manuallyAdjusted: true }
              : track
          ))
        }
        return
      }
      
      // 策略4：跨区域移动或其他情况，整体上移
      console.log('🔀 跨区域移动，目标行及以上所有内容上移')
      setAdditionalTracks(prev => prev.map(track => {
        if (track.id === selectedItemId) {
          return { ...track, rowIndex: newRowIndex, manuallyAdjusted: true }
        }
        if (track.position !== 'above') return track
        if (track.rowIndex !== undefined && track.rowIndex >= newRowIndex) {
          return { ...track, rowIndex: track.rowIndex + 1 }
        }
        return track
      }))
    }
  }

  // 下移轨道（移动一层） - 智能推挤版本
  const handleMoveDown = (e) => {
    e.stopPropagation()
    if (selectedItemType === 'additional') {
      const currentTrack = additionalTracks.find(t => t.id === selectedItemId)
      if (!currentTrack) return
      
      // 已经在上方且 rowIndex > 0，继续向下移动层级
      if (currentTrack.position === 'above' && currentTrack.rowIndex !== undefined && currentTrack.rowIndex > 0) {
        const newRowIndex = currentTrack.rowIndex - 1
        const currentTrackStart = currentTrack.offset
        const currentTrackEnd = currentTrackStart + (currentTrack.duration * 40)
        
        // 获取当前轨道的优先级和区域信息
        const currentPriority = getTrackPriority(currentTrack.name, currentTrack)
        const mixedZonePriority = 250
        
        // 判断当前轨道是否在混合区域
        const isInMixedZone = currentPriority === mixedZonePriority
        
        // 获取所有在上方的轨道
        const allTracksAbove = additionalTracks.filter(t => t.position === 'above' && t.id !== selectedItemId)
        
        // 检查目标行是否有冲突
        const targetRowTracks = allTracksAbove.filter(t => t.rowIndex === newRowIndex)
        
        let hasConflict = false
        for (const track of targetRowTracks) {
          const trackStart = track.offset
          const trackEnd = track.offset + (track.duration * 40)
          if (currentTrackEnd > trackStart && currentTrackStart < trackEnd) {
            hasConflict = true
            break
          }
        }
        
        if (!hasConflict) {
          // 无冲突，直接移动
          console.log('✅ 目标行无冲突，直接向下移动')
          setAdditionalTracks(prev => prev.map(track => 
            track.id === selectedItemId 
              ? { ...track, rowIndex: newRowIndex, manuallyAdjusted: true }
              : track
          ))
        } else {
          // 有冲突
          console.log('⚠️ 目标行有冲突')
          
          // 如果是混合区域内移动，尝试找下方的空隙
          if (isInMixedZone) {
            const allMixedZoneTracks = allTracksAbove.filter(t => 
              getTrackPriority(t.name, t) === mixedZonePriority
            )
            
            // 从newRowIndex-1开始往下找空隙（但不能低于0）
            let foundEmptyRow = null
            for (let row = newRowIndex - 1; row >= 0; row--) {
              const tracksInRow = allMixedZoneTracks.filter(t => t.rowIndex === row)
              let hasConflictInRow = false
              for (const track of tracksInRow) {
                const trackStart = track.offset
                const trackEnd = track.offset + (track.duration * 40)
                if (currentTrackEnd > trackStart && currentTrackStart < trackEnd) {
                  hasConflictInRow = true
                  break
                }
              }
              if (!hasConflictInRow) {
                foundEmptyRow = row
                console.log(`✅ 找到下方空隙row=${row}`)
                break
              }
            }
            
            if (foundEmptyRow !== null) {
              // 找到空隙，移动到空隙
              setAdditionalTracks(prev => prev.map(track => 
                track.id === selectedItemId 
                  ? { ...track, rowIndex: foundEmptyRow, manuallyAdjusted: true }
                  : track
              ))
            } else {
              console.log('⚠️ 下方没有空隙，无法移动')
            }
          } else {
            console.log('⚠️ 非混合区域有冲突，无法移动')
          }
        }
        return
      }
      
      // 如果在上方（above）且 rowIndex 为 0，向下移动意味着移到主轨下方（below）
      if (currentTrack.position === 'above' && currentTrack.rowIndex === 0) {
        console.log('✅ 从上方移动到下方（允许所有轨道类型）')
        // 允许所有轨道移动到主轨下方（手动调整不限制类型）
        setAdditionalTracks(prev => prev.map(track => 
          track.id === selectedItemId 
            ? { ...track, position: 'below', rowIndex: 0, manuallyAdjusted: true }
            : track
        ))
        return
      }
    }
  }

  const handleToolbarClick = (menuName) => {
    if (['文字', '音频', '画面', '属性'].includes(menuName)) {
      // 点击一级菜单时，取消选中的轨道，回归一级菜单
      setShowPopup(null)
      setSelectedItemId(null)
      setSelectedItemType(null)
      setActiveSubmenu(activeSubmenu === menuName ? null : menuName)
    }
  }

  // 判断是否是字幕类型
  const isSubtitleTrack = (name) => {
    return ['主轨字幕', '歌词字幕', '画中画字幕', '录音字幕', '双语字幕', '文字'].includes(name)
  }

  // 判断是否是画中画
  const isPipTrack = (name) => {
    return name === '画中画'
  }

  // 获取轨道的层级优先级（数字越大越靠上）
  // 优先级系统：用于区域划分，同区域内按createdAt排序
  const getTrackPriority = (name, track = null) => {
    // 从上到下的优先级（rowIndex从大到小）：
    
    // 1. 特效区域 (最上层) - priority 400
    if (['特效', '全局特效', '局部特效', '滤镜', '轨道滤镜', '属性滤镜'].includes(name)) return 400
    
    // 2. 字幕/文字/录音混合区域 - priority 200~299 (按添加时间在这个区域内排序)
    // 这个区域的所有轨道共享同一个优先级范围，实际位置由createdAt决定
    if (['歌词字幕', '音乐字幕', '录音字幕', '录音', '文字', 'TTS', '贴纸', '音效'].includes(name)) {
      return 250 // 统一优先级，实际排序由createdAt决定
    }
    
    // 3. 画中画区域 - priority 100~120
    if (name === '画中画字幕') return 120
    if (name === '画中画') return 110
    if (name === '画中画原声') return 100
    
    // 4. 主轨字幕 - priority 20 (紧贴视频主轨上方)
    if (name === '主轨字幕') return 20
    
    // 双语字幕：优先级跟随源字幕，略低1
    if (name === '双语字幕' && track && track.sourceType) {
      const sourcePriority = getTrackPriority(track.sourceType)
      return sourcePriority - 1
    }
    if (name === '双语字幕') return 19 // 没有sourceType时默认在主轨字幕下方
    
    // 视频主轨 - priority 0
    // 以下是视频下方的轨道（负优先级）
    
    // 5. 主轨原声 - priority -10
    if (name === '主轨原声') return -10
    
    // 6. 音乐 - priority -20
    if (name === '音乐') return -20
    
    // 其他音频（提取音频）
    if (['提取音频'].includes(name)) return -100
    
    return 0
  }

  // 获取指定优先级范围内所有轨道的最小rowIndex (最接近视频主轨的行)
  const getMinRowIndexInPriorityRange = (minPriority, maxPriority) => {
    const tracksInRange = additionalTracks.filter(t => {
      const priority = getTrackPriority(t.name, t)
      return priority >= minPriority && priority <= maxPriority && t.position === 'above'
    })
    
    if (tracksInRange.length === 0) return null
    
    return Math.min(...tracksInRange.map(t => t.rowIndex !== undefined ? t.rowIndex : 0))
  }

  // 将指定行及以上的所有轨道整体上移一行
  const shiftTracksUpFrom = (startRow) => {
    setAdditionalTracks(prev => prev.map(track => {
      if (track.position === 'above' && track.rowIndex !== undefined && track.rowIndex >= startRow) {
        return { ...track, rowIndex: track.rowIndex + 1 }
      }
      return track
    }))
  }

  // 整行向上移动
  const moveRowUp = (position, rowIndex) => {
    console.log(`整行向上移动: position=${position}, row=${rowIndex}`)
    
    // 获取同一侧的所有轨道
    const sameSideTracks = additionalTracks.filter(t => t.position === position)
    
    // 获取当前行的所有轨道
    const currentRowTracks = sameSideTracks.filter(t => t.rowIndex === rowIndex)
    if (currentRowTracks.length === 0) return
    
    // 目标行
    const targetRow = rowIndex + 1
    
    // 获取目标行的所有轨道
    const targetRowTracks = sameSideTracks.filter(t => t.rowIndex === targetRow)
    
    // 交换两行
    setAdditionalTracks(prev => prev.map(track => {
      if (track.position !== position) return track
      
      if (track.rowIndex === rowIndex) {
        // 当前行移到目标行
        return { ...track, rowIndex: targetRow, manuallyAdjusted: true }
      } else if (track.rowIndex === targetRow) {
        // 目标行移到当前行
        return { ...track, rowIndex: rowIndex, manuallyAdjusted: true }
      }
      return track
    }))
    
    console.log(`✅ 行已交换: row ${rowIndex} ↔ row ${targetRow}`)
  }

  // 整行向下移动
  const moveRowDown = (position, rowIndex) => {
    console.log(`整行向下移动: position=${position}, row=${rowIndex}`)
    
    // 获取同一侧的所有轨道
    const sameSideTracks = additionalTracks.filter(t => t.position === position)
    
    // 获取当前行的所有轨道
    const currentRowTracks = sameSideTracks.filter(t => t.rowIndex === rowIndex)
    if (currentRowTracks.length === 0) return
    
    // 目标行
    const targetRow = rowIndex - 1
    if (targetRow < 0) {
      console.log('⚠️ 已经是最底层，无法下移')
      return
    }
    
    // 获取目标行的所有轨道
    const targetRowTracks = sameSideTracks.filter(t => t.rowIndex === targetRow)
    
    // 交换两行
    setAdditionalTracks(prev => prev.map(track => {
      if (track.position !== position) return track
      
      if (track.rowIndex === rowIndex) {
        // 当前行移到目标行
        return { ...track, rowIndex: targetRow, manuallyAdjusted: true }
      } else if (track.rowIndex === targetRow) {
        // 目标行移到当前行
        return { ...track, rowIndex: rowIndex, manuallyAdjusted: true }
      }
      return track
    }))
    
    console.log(`✅ 行已交换: row ${rowIndex} ↔ row ${targetRow}`)
  }

  // 处理派生轨道的添加
  const handleAddDerivativeTrack = (derivativeType) => {
    console.log('🔵 handleAddDerivativeTrack 被调用', { derivativeType, selectedItemId, selectedItemType })
    console.log('🔵 当前media:', media.length, '个')
    console.log('🔵 当前additionalTracks:', additionalTracks.length, '个')
    
    if (!selectedItemId || !selectedItemType) {
      console.log('❌ 没有选中的项目，退出')
      return
    }

    // 根据选中的轨道类型处理
    if (selectedItemType === 'main') {
      console.log('✅ 处理主轨派生')
      // 主轨视频的派生：主轨字幕或主轨原声
      const sourceItem = media.find(m => m.id === selectedItemId)
      if (!sourceItem) {
        console.log('❌ 找不到主轨视频，退出')
        return
      }

      const sourceOffset = sourceItem.offset || 0
      const sourceDuration = sourceItem.duration
      console.log('✅ 主轨信息:', { sourceOffset, sourceDuration, derivativeType })

      if (derivativeType === '主轨字幕') {
        console.log('✅ 调用 addMainSubtitles')
        addMainSubtitles(sourceOffset, sourceDuration)
      } else if (derivativeType === '提取音频') {
        console.log('✅ 调用 addExtractedAudio (主轨原声)')
        addExtractedAudio(sourceOffset, sourceDuration, '提取音频', 'main')
      }
    } else if (selectedItemType === 'additional') {
      console.log('✅ 处理附加轨道派生')
      const sourceTrack = additionalTracks.find(t => t.id === selectedItemId)
      console.log('🟢 找到源轨道:', sourceTrack)
      
      if (!sourceTrack) {
        console.log('❌ 找不到附加轨道，退出')
        return
      }

      const sourceOffset = sourceTrack.offset || 0
      const sourceDuration = sourceTrack.duration
      const sourceRowIndex = sourceTrack.rowIndex !== undefined ? sourceTrack.rowIndex : 0

      console.log('📍 轨道信息:', { name: sourceTrack.name, sourceOffset, sourceDuration, sourceRowIndex })

      if (sourceTrack.name === '文字') {
        // 文字的派生：TTS
        if (derivativeType === 'TTS') {
          console.log('✅ 即将调用 addTTS')
          addTTS(sourceOffset, sourceDuration, sourceRowIndex)
        }
      } else if (sourceTrack.name === '画中画') {
        // 画中画的派生：画中画字幕或画中画原声
        console.log('✅ 画中画派生，类型:', derivativeType)
        if (derivativeType === '画中画字幕') {
          console.log('✅ 调用 addPipSubtitles，targetRow:', sourceRowIndex + 1)
          addPipSubtitles(sourceOffset, sourceDuration, sourceRowIndex + 1)
        } else if (derivativeType === '提取音频') {
          console.log('✅ 调用 addExtractedAudio (画中画原声)，画中画row:', sourceRowIndex)
          addExtractedAudio(sourceOffset, sourceDuration, '画中画原声', sourceRowIndex)
        }
      } else if (sourceTrack.name === '音乐') {
        // 音乐的派生：音乐字幕
        if (derivativeType === '音乐字幕') {
          addMusicSubtitles(sourceOffset, sourceDuration, sourceRowIndex)
        }
      } else if (sourceTrack.name === '录音') {
        // 录音的派生：录音字幕
        if (derivativeType === '录音字幕') {
          addRecordingSubtitles(sourceOffset, sourceDuration, sourceRowIndex)
        }
      } else if (['主轨字幕', '画中画字幕', '音乐字幕', '录音字幕', '歌词字幕'].includes(sourceTrack.name)) {
        // 字幕的派生：双语字幕
        if (derivativeType === '双语字幕') {
          addBilingualSubtitle(sourceOffset, sourceDuration, sourceRowIndex - 1, sourceTrack.name)
        }
      }
    }

    // 关闭弹窗
    setShowPopup(null)
  }

  // 添加主轨字幕（多段）
  const addMainSubtitles = (baseOffset, totalDuration) => {
    // 字幕尽可能覆盖整个视频长度
    const minSegmentDuration = 3
    const maxSegmentDuration = 6
    const minGap = 0.5
    const maxGap = 1.5
    
    let currentTime = 0.5 // 从0.5秒开始
    
    // 使用优先级系统确定主轨字幕位置
    // 主轨字幕 priority=20，应该是视频上方最低的轨道
    const mainSubtitlePriority = 20
    const aboveTracks = additionalTracks.filter(t => t.position === 'above')
    
    // 找出所有优先级高于主轨字幕的轨道
    const higherPriorityTracks = aboveTracks.filter(t => {
      const trackPriority = getTrackPriority(t.name, t)
      return trackPriority > mainSubtitlePriority
    })
    
    let targetRowIndex = 0
    
    // 如果有更高优先级的轨道，计算需要上移的量
    if (higherPriorityTracks.length > 0) {
      const minHigherRow = Math.min(...higherPriorityTracks.map(t => t.rowIndex || 0))
      
      // 如果最低的高优先级轨道在row 0或更低，需要上移所有高优先级轨道
      if (minHigherRow <= 0) {
        const shiftAmount = 1 - minHigherRow // 确保最低的高优先级轨道至少在row 1
        console.log(`⚠️ 高优先级轨道占据了row 0，上移所有高优先级轨道 ${shiftAmount} 行`)
        
        setAdditionalTracks(prev => prev.map(track => {
          const trackPriority = getTrackPriority(track.name, track)
          if (track.position === 'above' && trackPriority > mainSubtitlePriority && track.rowIndex !== undefined) {
            return { ...track, rowIndex: track.rowIndex + shiftAmount }
          }
          return track
        }))
      }
    }
    
    console.log('✅ 主轨字幕使用优先级系统，targetRow:', targetRowIndex)
    
    const newTracks = []
    let segmentIndex = 0
    
    // 持续生成字幕段直到覆盖整个视频长度
    while (currentTime < totalDuration - 0.5) {
      const remainingTime = totalDuration - currentTime
      const segmentDuration = Math.min(
        Math.random() * (maxSegmentDuration - minSegmentDuration) + minSegmentDuration,
        remainingTime
      )
      
      const segmentOffset = baseOffset + (currentTime * 40)
      
      const newTrack = {
        id: `${Date.now()}_${Math.random()}_${segmentIndex}`,
        name: '主轨字幕',
        color: TRACK_COLORS['主轨字幕'],
        duration: segmentDuration,
        offset: segmentOffset,
        position: 'above',
        trackType: 'subtitle',
        rowIndex: targetRowIndex,
        createdAt: Date.now() + segmentIndex,
        manuallyAdjusted: false,
        isIndependentRow: false
      }
      
      newTracks.push(newTrack)
      currentTime += segmentDuration + (Math.random() * (maxGap - minGap) + minGap)
      segmentIndex++
    }
    
    console.log(`✅ 生成主轨字幕 ${newTracks.length} 段，覆盖时长: ${totalDuration}秒`)
    setAdditionalTracks(prev => [...prev, ...newTracks])
  }

  // 添加画中画字幕
  const addPipSubtitles = (baseOffset, totalDuration, suggestedRowIndex) => {
    // 使用优先级系统确定画中画字幕位置
    // 画中画字幕 priority=120，应该在画中画(priority=110)上方
    const pipSubtitlePriority = 120
    const aboveTracks = additionalTracks.filter(t => t.position === 'above')
    
    // 找出所有优先级低于画中画字幕的轨道
    const lowerPriorityTracks = aboveTracks.filter(t => {
      const trackPriority = getTrackPriority(t.name, t)
      return trackPriority < pipSubtitlePriority
    })
    
    // 找出所有优先级高于画中画字幕的轨道
    const higherPriorityTracks = aboveTracks.filter(t => {
      const trackPriority = getTrackPriority(t.name, t)
      return trackPriority > pipSubtitlePriority
    })
    
    // 画中画字幕必须在更低优先级轨道上方
    const lowerMaxRow = lowerPriorityTracks.length > 0 
      ? Math.max(...lowerPriorityTracks.map(t => t.rowIndex || 0))
      : -1
    
    // 画中画字幕必须在更高优先级轨道下方
    const higherMinRow = higherPriorityTracks.length > 0 
      ? Math.min(...higherPriorityTracks.map(t => t.rowIndex || 0))
      : Infinity
    
    // 使用建议的row（画中画row+1），但确保在允许范围内
    let targetRowIndex = suggestedRowIndex
    targetRowIndex = Math.max(targetRowIndex, lowerMaxRow + 1)
    if (higherMinRow !== Infinity) {
      targetRowIndex = Math.min(targetRowIndex, higherMinRow - 1)
    }
    
    console.log('✅ 画中画字幕（文字派生）使用优先级系统，targetRow:', targetRowIndex)
    
    // 生成多段画中画字幕
    const minSegmentDuration = 2
    const maxSegmentDuration = 4
    const minGap = 1
    const maxGap = 3
    const minStartTime = 1
    const maxStartTime = Math.min(5, totalDuration - minSegmentDuration)
    
    const segmentCount = Math.floor(Math.random() * 4) + 2
    let currentTime = Math.random() * (maxStartTime - minStartTime) + minStartTime
    
    const newTracks = []
    for (let i = 0; i < segmentCount; i++) {
      const segmentDuration = Math.random() * (maxSegmentDuration - minSegmentDuration) + minSegmentDuration
      
      if (currentTime + segmentDuration > totalDuration) {
        break
      }
      
      const segmentOffset = baseOffset + (currentTime * 40)
      
      const newTrack = {
        id: `${Date.now()}_${Math.random()}_${i}`,
        name: '画中画字幕',
        color: TRACK_COLORS['画中画字幕'],
        duration: segmentDuration,
        offset: segmentOffset,
        position: 'above',
        trackType: 'subtitle',
        rowIndex: targetRowIndex,
        createdAt: Date.now() + i,
        manuallyAdjusted: false,
        isIndependentRow: true
      }
      
      newTracks.push(newTrack)
      currentTime += segmentDuration + (Math.random() * (maxGap - minGap) + minGap)
    }
    
    setAdditionalTracks(prev => [...prev, ...newTracks])
  }

  // 添加TTS（紧贴文字下方）
  const addTTS = (baseOffset, duration, sourceRowIndex) => {
    console.log('=== 添加TTS ===')
    console.log('文字sourceRowIndex:', sourceRowIndex)
    
    // TTS需要紧贴在文字下方
    // 如果文字在row N，TTS应该在row N-1（即文字正下方）
    const targetRowIndex = sourceRowIndex - 1
    console.log('TTS targetRowIndex:', targetRowIndex)
    
    // 检查targetRowIndex这一行是否有其他非TTS轨道
    const conflictTracks = additionalTracks.filter(t => 
      t.position === 'above' && 
      t.rowIndex === targetRowIndex &&
      t.name !== 'TTS'  // 只检查非TTS轨道
    )
    
    console.log('目标行的冲突轨道:', conflictTracks.map(t => ({ name: t.name, rowIndex: t.rowIndex })))
    
    const newTrack = {
      id: `${Date.now()}_${Math.random()}`,
      name: 'TTS',
      color: TRACK_COLORS['TTS'],
      duration: duration,
      offset: baseOffset,
      position: 'above',
      trackType: 'audio',
      rowIndex: targetRowIndex,
      createdAt: Date.now(),
      manuallyAdjusted: false,
      isIndependentRow: false
    }
    
    // 如果目标行有非TTS轨道（如画中画），将它们下移
    if (conflictTracks.length > 0) {
      console.log('⚠️ 目标行有其他轨道，将row <=', targetRowIndex, '的所有轨道下移')
      setAdditionalTracks(prev => {
        const updatedTracks = prev.map(track => {
          // 将目标行及以下的所有轨道下移1行
          if (track.position === 'above' && 
              track.rowIndex !== undefined && 
              track.rowIndex <= targetRowIndex) {
            console.log('⬇️ 下移轨道:', track.name, '从row', track.rowIndex, '到row', track.rowIndex - 1)
            return { ...track, rowIndex: track.rowIndex - 1 }
          }
          return track
        })
        // 在同一次更新中添加新TTS
        console.log('✅ 添加TTS到row', targetRowIndex)
        return [...updatedTracks, newTrack]
      })
    } else {
      // 无冲突，直接添加
      console.log('✅ 无冲突，直接添加TTS到row', targetRowIndex)
      setAdditionalTracks(prev => [...prev, newTrack])
    }
  }

  // 添加提取音频
  const addExtractedAudio = (baseOffset, duration, trackName, sourceInfo = 'main') => {
    // sourceInfo: 'main' = 主轨原声(在主轨下方), 数字 = 画中画的rowIndex
    
    let position = 'below' // 默认在主轨下方
    let rowIndex = 0
    
    if (sourceInfo === 'main') {
      // 主轨原声：在主轨下方的 row 0（紧贴视频主轨）
      rowIndex = 0
      position = 'below'
      
      const newTrack = {
        id: `${Date.now()}_${Math.random()}`,
        name: '主轨原声', // 修改显示名称
        color: TRACK_COLORS[trackName] || TRACK_COLORS['提取音频'],
        duration: duration,
        offset: baseOffset,
        position: position,
        trackType: 'audio',
        rowIndex: rowIndex,
        createdAt: Date.now(),
        manuallyAdjusted: false,
        isIndependentRow: false
      }
      
      // 主轨原声应该在所有below轨道的最前面（紧贴视频主轨）
      // 因为below轨道的渲染顺序由数组顺序决定，不是rowIndex
      console.log('✅ 添加主轨原声到视频主轨下方（数组开头）')
      setAdditionalTracks(prev => {
        // 将主轨原声插入到所有below轨道的最前面
        const belowTracks = prev.filter(t => t.position === 'below')
        const aboveTracks = prev.filter(t => t.position === 'above')
        return [...aboveTracks, newTrack, ...belowTracks]
      })
      return
    } else {
      // 画中画原声：音频类派生，应该在画中画下方
      // 使用优先级系统：画中画原声 priority=100, 画中画 priority=110
      position = 'above'
      
      const pipAudioPriority = 100
      const aboveTracks = additionalTracks.filter(t => t.position === 'above')
      
      // 找出所有优先级低于画中画原声的轨道（如主轨字幕priority=20）
      const lowerPriorityTracks = aboveTracks.filter(t => {
        const trackPriority = getTrackPriority(t.name, t)
        return trackPriority < pipAudioPriority
      })
      
      // 找出所有优先级高于画中画原声的轨道（如画中画priority=110）
      const higherPriorityTracks = aboveTracks.filter(t => {
        const trackPriority = getTrackPriority(t.name, t)
        return trackPriority > pipAudioPriority
      })
      
      // 画中画原声必须在更低优先级轨道上方
      const lowerMaxRow = lowerPriorityTracks.length > 0 
        ? Math.max(...lowerPriorityTracks.map(t => t.rowIndex || 0))
        : -1
      
      // 画中画原声必须在更高优先级轨道下方
      const higherMinRow = higherPriorityTracks.length > 0 
        ? Math.min(...higherPriorityTracks.map(t => t.rowIndex || 0))
        : Infinity
      
      // 画中画原声应该紧贴画中画下方
      let pipRow = sourceInfo
      let audioRow = pipRow - 1
      
      // 确保在允许范围内
      audioRow = Math.max(audioRow, lowerMaxRow + 1)
      if (higherMinRow !== Infinity) {
        audioRow = Math.min(audioRow, higherMinRow - 1)
      }
      
      console.log('✅ 画中画原声（音频派生）在画中画下方，画中画row:', pipRow, '原声row:', audioRow)
      rowIndex = audioRow
    }

    const newTrack = {
      id: `${Date.now()}_${Math.random()}`,
      name: '画中画原声',
      color: TRACK_COLORS['画中画原声'] || TRACK_COLORS['提取音频'],
      duration: duration,
      offset: baseOffset,
      position: position,
      trackType: 'audio',
      rowIndex: rowIndex,
      createdAt: Date.now(),
      manuallyAdjusted: false,
      isIndependentRow: false
    }
    
    setAdditionalTracks(prev => [...prev, newTrack])
  }

  // 添加音乐字幕（多段，片段状）
  const addMusicSubtitles = (baseOffset, duration, sourceRowIndex) => {
    // 音乐字幕在混合区域（priority=250），按添加时间排序
    const musicSubtitlePriority = getTrackPriority('音乐字幕') // 250
    
    console.log('🎵 添加音乐字幕, 音乐row:', sourceRowIndex, '优先级:', musicSubtitlePriority)
    
    // 获取所有在视频上方的轨道
    const aboveTracks = additionalTracks.filter(t => t.position === 'above')
    
    // 创建轨道分析（与通用添加逻辑一致）
    const trackAnalysis = aboveTracks.map(t => ({
      track: t,
      priority: getTrackPriority(t.name, t),
      rowIndex: t.rowIndex !== undefined ? t.rowIndex : 0
    }))
    
    // 找出所有混合区域的轨道（priority=250）
    const mixedZoneTracks = trackAnalysis.filter(t => t.priority === 250)
    
    // 找出混合区域的最大row
    const maxRowInZone = mixedZoneTracks.length > 0 
      ? Math.max(...mixedZoneTracks.map(t => t.rowIndex))
      : -1
    
    // 计算混合区域的起始位置（与通用添加逻辑一致）
    // 混合区域应该紧贴在主轨字幕和画中画区域上方
    const mainSubtitles = trackAnalysis.filter(t => t.priority === 20)
    const pipTracks = trackAnalysis.filter(t => t.priority >= 100 && t.priority < 200)
    
    const mainSubtitleMaxRow = mainSubtitles.length > 0 ? Math.max(...mainSubtitles.map(t => t.rowIndex)) : -1
    const pipMaxRow = pipTracks.length > 0 ? Math.max(...pipTracks.map(t => t.rowIndex)) : -1
    
    // 混合区域的最小起始row
    const minAllowedRow = Math.max(mainSubtitleMaxRow, pipMaxRow) + 1
    
    // 音乐字幕应该在混合区域顶部（现有混合区域轨道之上）
    // 但不能低于minAllowedRow
    let targetRowIndex = Math.max(maxRowInZone + 1, minAllowedRow)
    
    console.log('✅ 音乐字幕在混合区域，mixedZoneMaxRow:', maxRowInZone, 'mainSubMaxRow:', mainSubtitleMaxRow, 'pipMaxRow:', pipMaxRow, 'minAllowedRow:', minAllowedRow, 'targetRow:', targetRowIndex)
    
    // 生成音乐字幕，覆盖整个音乐长度
    const minSegmentDuration = 3
    const maxSegmentDuration = 6
    const minGap = 0.5
    const maxGap = 1.5
    
    let currentTime = 0.5 // 从0.5秒开始
    
    const newTracks = []
    let segmentIndex = 0
    
    // 持续生成字幕段直到覆盖整个音乐长度
    while (currentTime < duration - 0.5) {
      const remainingTime = duration - currentTime
      const segmentDuration = Math.min(
        Math.random() * (maxSegmentDuration - minSegmentDuration) + minSegmentDuration,
        remainingTime
      )
      
      const segmentOffset = baseOffset + (currentTime * 40)
      
      const newTrack = {
        id: `${Date.now()}_${Math.random()}_${segmentIndex}`,
        name: '音乐字幕',
        color: TRACK_COLORS['音乐字幕'] || '#0CD2D9',
        duration: segmentDuration,
        offset: segmentOffset,
        position: 'above',
        trackType: 'subtitle',
        rowIndex: targetRowIndex,
        createdAt: Date.now() + segmentIndex,
        manuallyAdjusted: false,
        isIndependentRow: false
      }
      
      newTracks.push(newTrack)
      currentTime += segmentDuration + (Math.random() * (maxGap - minGap) + minGap)
      segmentIndex++
    }
    
    console.log(`✅ 生成音乐字幕 ${newTracks.length} 段，覆盖时长: ${duration}秒`)
    setAdditionalTracks(prev => [...prev, ...newTracks])
  }

  // 添加录音字幕（单段，紧贴录音上方）
  const addRecordingSubtitles = (baseOffset, duration, sourceRowIndex) => {
    // 录音字幕和录音都是priority=250，属于混合区域
    // 录音字幕应该紧贴录音上方（row + 1）
    const targetRowIndex = sourceRowIndex + 1
    
    console.log('🎤 添加录音字幕, 录音row:', sourceRowIndex, '录音字幕row:', targetRowIndex)
    
    const newTrack = {
      id: `${Date.now()}_${Math.random()}`,
      name: '录音字幕',
      color: TRACK_COLORS['录音字幕'],
      duration: duration,
      offset: baseOffset,
      position: 'above',
      trackType: 'subtitle',
      rowIndex: targetRowIndex,
      createdAt: Date.now(),
      manuallyAdjusted: false,
      isIndependentRow: false
    }
    
    setAdditionalTracks(prev => [...prev, newTrack])
  }

  // 添加双语字幕（紧贴源字幕下方）
  const addBilingualSubtitle = (baseOffset, duration, targetRowIndex, sourceSubtitleType) => {
    const newTrack = {
      id: `${Date.now()}_${Math.random()}`,
      name: '双语字幕',
      color: TRACK_COLORS['主轨字幕'] || '#21B7F1',
      duration: duration,
      offset: baseOffset,
      position: 'above',
      trackType: 'subtitle',
      rowIndex: targetRowIndex,
      createdAt: Date.now(),
      manuallyAdjusted: false,
      isIndependentRow: false,
      sourceType: sourceSubtitleType // 记录源字幕类型
    }
    
    setAdditionalTracks(prev => [...prev, newTrack])
  }

  const handleSubmenuClick = (trackName) => {
    // 处理三级菜单项
    if (['全局特效', '局部特效', '轨道滤镜', '属性滤镜'].includes(trackName)) {
      // 全局特效：添加到所有轨道最上方
      if (trackName === '全局特效') {
        console.log('添加全局特效轨道')
        
        // 获取所有在视频上方的轨道
        const aboveTracks = additionalTracks.filter(t => t.position === 'above')
        
        // 找到最大的rowIndex
        const maxRow = aboveTracks.length > 0 
          ? Math.max(...aboveTracks.map(t => t.rowIndex || 0))
          : -1
        
        // 全局特效在最上方
        const effectRowIndex = maxRow + 1
        
        // 计算视频主轨的总长度和起始位置
        const totalVideoDuration = media.reduce((acc, m) => acc + m.duration, 0)
        const startOffset = media.length > 0 ? (media[0].offset || 0) : 0
        
        const newTrack = {
          id: `${Date.now()}_${Math.random()}`,
          name: '全局特效',
          color: TRACK_COLORS['全局特效'] || '#FF6B9D',
          duration: totalVideoDuration,
          offset: startOffset,
          position: 'above',
          trackType: 'effect',
          rowIndex: effectRowIndex,
          createdAt: Date.now(),
          manuallyAdjusted: false,
          isIndependentRow: false
        }
        
        setAdditionalTracks(prev => [...prev, newTrack])
        console.log('✅ 全局特效轨道已添加到最上方，row:', effectRowIndex)
      } else {
        // 其他三级菜单项
        console.log('选择了三级菜单:', trackName)
        // TODO: 实现其他功能
      }
      
      setActiveSubmenu(null)
      setActiveThirdMenu(null)
      return
    }
    
    // 处理有三级菜单的二级菜单项（特效、滤镜）
    if (trackName === '特效' || trackName === '滤镜') {
      setActiveThirdMenu(activeThirdMenu === trackName ? null : trackName)
      return
    }
    
    // 移除旧的字幕轨道特殊处理（现在通过双击源轨道添加）
    // 歌词字幕可以独立添加（没有派生关系）
    // 录音字幕也可以独立添加，但会使用通用的优先级系统
    const independentSubtitleTracks = ['歌词字幕']
    if (independentSubtitleTracks.includes(trackName)) {
      // 计算视频主轨的总长度和起始位置
      const totalVideoDuration = media.reduce((acc, m) => acc + m.duration, 0)
      if (totalVideoDuration === 0) {
        alert('请先添加视频！')
        return
      }
      
      // 获取视频主轨的最小offset（最左边的位置）
      const minVideoOffset = media.length > 0 ? Math.min(...media.map(m => m.offset || 0)) : 0
      
      // 歌词字幕尽可能覆盖整个视频长度
      const minSegmentDuration = 3
      const maxSegmentDuration = 6
      const minGap = 0.5
      const maxGap = 1.5
      
      let currentTime = 0.5 // 从0.5秒开始
      
      const tracksContainer = scrollableTracksRef.current || document.querySelector('.timeline-tracks-scrollable')
      if (!tracksContainer) return
      
      // 检查是否有主轨字幕和画中画
      const mainSubtitleTracks = additionalTracks.filter(t => 
        t.name === '主轨字幕' && t.position === 'above'
      )
      const pipTracks = additionalTracks.filter(t => t.name === '画中画' && t.position === 'above')
      
      // 获取同类型字幕的最大行号
      const sameTypeSubtitles = additionalTracks.filter(t => t.name === trackName && t.position === 'above')
      let baseRow = sameTypeSubtitles.length > 0 
        ? Math.max(...sameTypeSubtitles.map(t => t.rowIndex !== undefined ? t.rowIndex : 0)) + 1
        : 0
      
      // 歌词字幕在混合区域（priority=250）内，需要找出该区域当前的最大row
      const mixedZoneTracks = additionalTracks.filter(t => {
        const priority = getTrackPriority(t.name, t)
        return priority === 250 && t.position === 'above'
      })
      
      const mixedZoneMaxRow = mixedZoneTracks.length > 0
        ? Math.max(...mixedZoneTracks.map(t => t.rowIndex !== undefined ? t.rowIndex : 0))
        : -1
      
      // 确保新字幕在混合区域的顶部
      baseRow = Math.max(baseRow, mixedZoneMaxRow + 1)
      
      // 检查是否有更高优先级的轨道（如特效）
      const aboveTracks = additionalTracks.filter(t => t.position === 'above')
      const higherPriorityTracks = aboveTracks.filter(t => {
        const trackPriority = getTrackPriority(t.name, t)
        return trackPriority > 250 // priority > 250的轨道（特效等）
      })
      
      const higherMinRow = higherPriorityTracks.length > 0 
        ? Math.min(...higherPriorityTracks.map(t => t.rowIndex || 0))
        : Infinity
      
      // 如果会和更高优先级轨道冲突，上移它们
      if (higherMinRow !== Infinity && baseRow >= higherMinRow) {
        const shiftAmount = baseRow - higherMinRow + 1
        console.log(`⚠️ 歌词字幕会和更高优先级轨道冲突，上移高优先级轨道 ${shiftAmount} 行`)
        setAdditionalTracks(prev => prev.map(track => {
          const trackPriority = getTrackPriority(track.name, track)
          if (track.position === 'above' && trackPriority > 250 && track.rowIndex !== undefined) {
            return { ...track, rowIndex: track.rowIndex + shiftAmount }
          }
          return track
        }))
      }
      
      console.log('✅ 歌词字幕在混合区域，baseRow:', baseRow, '混合区域最大row:', mixedZoneMaxRow)
      
      // 生成字幕段，尽可能覆盖整个视频长度
      const newTracks = []
      let segmentIndex = 0
      
      while (currentTime < totalVideoDuration - 0.5) {
        const remainingTime = totalVideoDuration - currentTime
        const segmentDuration = Math.min(
          Math.random() * (maxSegmentDuration - minSegmentDuration) + minSegmentDuration,
          remainingTime
        )
        
        const segmentOffset = minVideoOffset + (currentTime * 40)
        const targetRowIndex = baseRow + segmentIndex
        
        const newTrack = {
          id: `${Date.now()}_${Math.random()}_${segmentIndex}`,
          name: trackName,
          color: TRACK_COLORS[trackName],
          duration: segmentDuration,
          offset: segmentOffset,
          position: 'above',
          trackType: 'subtitle',
          rowIndex: targetRowIndex,
          createdAt: Date.now() + segmentIndex,
          manuallyAdjusted: false,
          isIndependentRow: false
        }
        
        newTracks.push(newTrack)
        currentTime += segmentDuration + (Math.random() * (maxGap - minGap) + minGap)
        segmentIndex++
      }
      
      console.log(`✅ 生成歌词字幕 ${newTracks.length} 段，覆盖时长: ${totalVideoDuration}秒`)
      setAdditionalTracks(prev => [...prev, ...newTracks])
      setActiveSubmenu(null)
      return
    }
    
    // 获取轨道容器 - 使用可滚动的容器
    const tracksContainer = scrollableTracksRef.current || document.querySelector('.timeline-tracks-scrollable')
    if (!tracksContainer) return
    
    // 计算视口中心相对于容器的位置（考虑滚动）
    const viewportCenterX = window.innerWidth / 2
    const containerRect = tracksContainer.getBoundingClientRect()
    // offset = 视口中心 - 容器左边缘 + 容器的水平滚动距离
    const centerOffset = viewportCenterX - containerRect.left + tracksContainer.scrollLeft
    
    // 新轨道的默认时长
    // 音乐的默认长度等于主轨视频的总长度
    let newTrackDuration = 3
    if (trackName === '音乐') {
      const totalVideoDuration = media.reduce((acc, m) => acc + m.duration, 0)
      newTrackDuration = totalVideoDuration
      console.log(`音乐轨道长度设置为主轨视频总长度: ${newTrackDuration}秒`)
    }
    
    let targetRowIndex = null
    
    // 获取新轨道的优先级
    const newTrackPriority = getTrackPriority(trackName)
    
    // 根据优先级判断轨道位置：优先级 < 0 的在视频下方，>= 0 的在视频上方
    let trackPosition = newTrackPriority < 0 ? 'below' : 'above'
    
    console.log(`\n========== 添加轨道: ${trackName} (priority: ${newTrackPriority}, position: ${trackPosition}) ==========`)
    
    // === 通用的基于优先级的轨道排布算法 ===
    
    // 定义可以共享行的轨道组
    const sharedRowGroups = {
      'textStickerTTS': ['文字', '贴纸', 'TTS'],  // 文字/贴纸/TTS可以共享行
      'pip': ['画中画'],  // 画中画可以在同一行有多个（时间不冲突）
      'mainSubtitle': ['主轨字幕'],  // 主轨字幕可以在同一行有多个（时间不冲突）
    }
    
    // 检查当前轨道属于哪个共享组
    let sharedGroup = null
    for (const [groupName, tracks] of Object.entries(sharedRowGroups)) {
      if (tracks.includes(trackName)) {
        sharedGroup = groupName
        break
      }
    }
    
    // 计算新轨道的位置范围
    const newTrackStartPos = centerOffset
    const newTrackEndPos = centerOffset + (newTrackDuration * 40)
    
    console.log(`新轨道位置: ${newTrackStartPos} - ${newTrackEndPos}px`)
    console.log(`共享组: ${sharedGroup || '无（独占行）'}`)
    
    // 获取所有在同一侧的轨道（上方或下方）
    const sameSideTracks = additionalTracks.filter(t => t.position === trackPosition)
    
    // 按优先级和rowIndex对现有轨道进行分析
    const trackAnalysis = sameSideTracks.map(t => ({
      track: t,
      priority: getTrackPriority(t.name, t),
      rowIndex: t.rowIndex !== undefined ? t.rowIndex : 0
    }))
    
    console.log('现有轨道分析:')
    trackAnalysis.forEach(t => {
      console.log(`  - ${t.track.name}: priority=${t.priority}, row=${t.rowIndex}`)
    })
    
    // 找出所有优先级相同的轨道（同一层级）
    const samePriorityTracks = trackAnalysis.filter(t => t.priority === newTrackPriority)
    
    // 找出所有优先级高于新轨道的轨道（应该在新轨道上方，即rowIndex更大）
    const higherPriorityTracks = trackAnalysis.filter(t => t.priority > newTrackPriority)
    const higherMinRow = higherPriorityTracks.length > 0 
      ? Math.min(...higherPriorityTracks.map(t => t.rowIndex))
      : Infinity
    
    // 找出所有优先级低于新轨道的轨道（应该在新轨道下方，即rowIndex更小）
    const lowerPriorityTracks = trackAnalysis.filter(t => t.priority < newTrackPriority)
    
    // 计算合理的minAllowedRow：
    // 不应该简单地使用lowerMaxRow+1，因为lower轨道的rowIndex可能被错误地设置得很大
    // 应该根据区域定义计算：
    // - 主轨字幕（priority=20）应该从row=0开始
    // - 画中画区域（priority=100-120）应该紧贴主轨字幕上方
    // - 混合区域（priority=250）应该紧贴画中画区域上方
    
    let minAllowedRow = 0
    
    if (newTrackPriority === 20) {
      // 主轨字幕：始终从row=0开始，不依赖其他轨道
      minAllowedRow = 0
      console.log(`主轨字幕区域起始row=0`)
    } else if (newTrackPriority >= 100 && newTrackPriority < 200) {
      // 画中画区域：应该紧贴主轨字幕上方
      // 找出当前所有主轨字幕占用的最大row
      const mainSubtitles = trackAnalysis.filter(t => t.priority === 20)
      const mainSubtitleMaxRow = mainSubtitles.length > 0 ? Math.max(...mainSubtitles.map(t => t.rowIndex)) : 0 // 即使没有主轨字幕，也预留row 0
      minAllowedRow = mainSubtitleMaxRow + 1 // 至少从row 1开始
      console.log(`画中画区域起始row计算: 主轨字幕maxRow=${mainSubtitleMaxRow}, minAllowedRow=${minAllowedRow}`)
    } else if (newTrackPriority === 250) {
      // 混合区域：应该紧贴在主轨字幕和画中画区域上方
      // 找出主轨字幕和画中画区域占用的最大row
      const mainSubtitles = trackAnalysis.filter(t => t.priority === 20)
      const pipTracks = trackAnalysis.filter(t => t.priority >= 100 && t.priority < 200)
      
      const mainSubtitleMaxRow = mainSubtitles.length > 0 ? Math.max(...mainSubtitles.map(t => t.rowIndex)) : 0 // 预留row 0给主轨字幕
      const pipMaxRow = pipTracks.length > 0 ? Math.max(...pipTracks.map(t => t.rowIndex)) : 0 // 没有画中画时，也至少要在row 1以上（预留row 0给主轨字幕）
      
      // 混合区域应该在主轨字幕和画中画区域的上方
      minAllowedRow = Math.max(mainSubtitleMaxRow, pipMaxRow) + 1
      
      console.log(`混合区域起始row计算: 主轨字幕maxRow=${mainSubtitleMaxRow}, 画中画maxRow=${pipMaxRow}, minAllowedRow=${minAllowedRow}`)
    } else {
      // 其他区域：使用传统的lowerMaxRow+1逻辑
      const lowerMaxRow = lowerPriorityTracks.length > 0 
        ? Math.max(...lowerPriorityTracks.map(t => t.rowIndex))
        : -1
      minAllowedRow = lowerMaxRow + 1
      console.log(`其他区域使用lowerMaxRow+1: ${minAllowedRow}`)
    }
    
    console.log(`优先级分析: 更高优先级最小row=${higherMinRow}, minAllowedRow=${minAllowedRow}`)
    console.log(`同优先级轨道数量: ${samePriorityTracks.length}`)
    if (samePriorityTracks.length > 0) {
      console.log(`同优先级轨道:`, samePriorityTracks.map(t => `${t.track.name}(row=${t.rowIndex})`).join(', '))
    }
    
    // 确定新轨道的基础位置：必须在minAllowedRow之上，更高优先级轨道下方
    let maxAllowedRow = higherMinRow === Infinity ? Infinity : higherMinRow - 1
    
    console.log(`允许的row范围: ${minAllowedRow} - ${maxAllowedRow}`)
    
    if (samePriorityTracks.length === 0) {
      // 没有同优先级的轨道，直接使用minAllowedRow
      targetRowIndex = Math.max(minAllowedRow, 0)
      console.log(`✅ 首次添加此优先级轨道，row=${targetRowIndex}`)
    } else if (newTrackPriority === 250) {
      // 特殊处理：字幕/文字/录音混合区域（priority=250）
      // 这个区域的轨道可以共享行，只要时间不冲突
      // 新轨道应该优先添加到区域顶部（向上添加）
      
      // 按row分组同区域的所有轨道
      const tracksByRow = {}
      samePriorityTracks.forEach(t => {
        const row = t.rowIndex
        if (!tracksByRow[row]) tracksByRow[row] = []
        tracksByRow[row].push(t.track)
      })
      
      // 从最高的row开始检查（从上往下），优先复用上方的空位
      const sortedRows = Object.keys(tracksByRow).map(Number).sort((a, b) => b - a) // 改为倒序：从高到低
      let foundAvailableRow = false
      
      console.log(`🔍 混合区域检查行复用（从上往下），现有行: ${sortedRows.join(', ')}`)
      
      for (const row of sortedRows) {
        if (row < minAllowedRow) {
          console.log(`  跳过row ${row}（低于minAllowedRow=${minAllowedRow}）`)
          continue
        }
        
        const tracksInRow = tracksByRow[row]
        let hasConflict = false
        
        // 检查时间冲突
        for (const track of tracksInRow) {
          const trackStartPos = track.offset
          const trackEndPos = track.offset + (track.duration * 40)
          
          if (newTrackEndPos > trackStartPos && newTrackStartPos < trackEndPos) {
            hasConflict = true
            console.log(`  ✗ row ${row} 有时间冲突 (${track.name})`)
            break
          }
        }
        
        if (!hasConflict) {
          targetRowIndex = row
          foundAvailableRow = true
          console.log(`  ✅ row ${row} 可复用（无时间冲突）`)
          break
        }
      }
      
      // 如果所有现有行都有冲突，在区域顶部新建行（向上添加）
      if (!foundAvailableRow) {
        const maxRowInZone = samePriorityTracks.length > 0 
          ? Math.max(...samePriorityTracks.map(t => t.rowIndex))
          : minAllowedRow - 1
        targetRowIndex = Math.max(maxRowInZone + 1, minAllowedRow)
        console.log(`  所有行都有冲突，在区域顶部新建row=${targetRowIndex}（向上添加）`)
      }
    } else if (sharedGroup) {
      // 可以共享行，检查时间冲突
      // 获取共享组内的所有轨道
      const groupTracks = sameSideTracks.filter(t => 
        sharedRowGroups[sharedGroup].includes(t.name)
      )
      
      // 按row分组
      const tracksByRow = {}
      groupTracks.forEach(track => {
        const row = track.rowIndex !== undefined ? track.rowIndex : 0
        if (!tracksByRow[row]) tracksByRow[row] = []
        tracksByRow[row].push(track)
      })
      
      // 主轨字幕从最低row开始检查（优先使用row 0），其他共享组从最低row开始但要遵守minAllowedRow
      const sortedRows = Object.keys(tracksByRow).map(Number).sort((a, b) => a - b)
      let foundAvailableRow = false
      
      console.log(`检查共享组(${sharedGroup})行: ${sortedRows.join(', ')}，minAllowedRow=${minAllowedRow}`)
      
      for (const row of sortedRows) {
        if (row < minAllowedRow || (maxAllowedRow !== Infinity && row > maxAllowedRow)) {
          console.log(`  跳过row ${row}（超出允许范围）`)
          continue
        }
        
        const tracksInRow = tracksByRow[row]
        let hasConflict = false
        
        for (const track of tracksInRow) {
          const trackStartPos = track.offset
          const trackEndPos = track.offset + (track.duration * 40)
          
          if (newTrackEndPos > trackStartPos && newTrackStartPos < trackEndPos) {
            hasConflict = true
            console.log(`  ✗ row ${row} 有时间冲突 (${track.name})`)
            break
          }
        }
        
        if (!hasConflict) {
          targetRowIndex = row
          foundAvailableRow = true
          console.log(`  ✅ row ${row} 可用（无时间冲突）`)
          break
        }
      }
      
      if (!foundAvailableRow) {
        // 所有同优先级现有行都有冲突，先检查是否有空行可用
        // 收集允许范围内所有已使用的行
        const allUsedRows = new Set(sameSideTracks.map(t => t.rowIndex !== undefined ? t.rowIndex : 0))
        
        // 找出允许范围内第一个未使用的空行
        for (let row = minAllowedRow; row <= (maxAllowedRow === Infinity ? Math.max(...allUsedRows) : maxAllowedRow); row++) {
          if (!allUsedRows.has(row)) {
            targetRowIndex = row
            foundAvailableRow = true
            console.log(`  ✅ 找到空行 row=${row}，复用该行`)
            break
          }
        }
        
        // 如果没有空行，新建行
        if (!foundAvailableRow) {
          const validRows = sortedRows.filter(r => r >= minAllowedRow && (maxAllowedRow === Infinity || r <= maxAllowedRow))
          const maxRow = validRows.length > 0 ? Math.max(...validRows) : minAllowedRow - 1
          targetRowIndex = maxRow + 1
          console.log(`  所有现有行都有冲突，新建row=${targetRowIndex}`)
        }
      }
    } else {
      // 独占行，每个新轨道都要新建一行
      // 对于独占行轨道（如录音、音效等），需要找出同优先级的最大row，然后+1
      const samePriorityRows = samePriorityTracks.map(t => t.rowIndex)
      
      if (samePriorityRows.length === 0) {
        // 没有同优先级轨道，使用minAllowedRow
        targetRowIndex = minAllowedRow
      } else {
        // 有同优先级轨道，使用它们的最大row + 1
        const maxSamePriorityRow = Math.max(...samePriorityRows)
        targetRowIndex = Math.max(maxSamePriorityRow + 1, minAllowedRow) // 确保不低于minAllowedRow
      }
      console.log(`✅ 独占行轨道，同优先级最大row=${samePriorityRows.length > 0 ? Math.max(...samePriorityRows) : '无'}，minAllowedRow=${minAllowedRow}，新建row=${targetRowIndex}`)
    }
    
    // 最终检查：确保targetRowIndex在允许范围内
    if (targetRowIndex < minAllowedRow) {
      targetRowIndex = minAllowedRow
    }
    if (maxAllowedRow !== Infinity && targetRowIndex > maxAllowedRow) {
      // 需要上移高优先级轨道(rowIndex更大,位置更高)
      console.log(`⚠️ targetRowIndex=${targetRowIndex}超出范围，需要上移高优先级轨道`)
      const shiftAmount = targetRowIndex - maxAllowedRow
      setAdditionalTracks(prev => prev.map(track => {
        const trackPriority = getTrackPriority(track.name, track)
        // 上移所有优先级高于新轨道的同侧轨道
        if (track.position === trackPosition && trackPriority > newTrackPriority) {
          return { ...track, rowIndex: (track.rowIndex || 0) + shiftAmount }
        }
        return track
      }))
      targetRowIndex = maxAllowedRow
    }
    
    console.log(`🎯 最终 targetRowIndex = ${targetRowIndex}`)
    console.log('='.repeat(50) + '\n')
    
    // 判断轨道类型：音频类 或 其他类
    const audioTracks = ['音乐', '音效', '录音', 'TTS', '提取音频', '主轨原声', '画中画原声']
    const isAudioTrack = audioTracks.includes(trackName)
    
    // 计算音乐的起始offset：音乐应该从主轨视频的开始位置开始
    let trackOffset = centerOffset
    if (trackName === '音乐' && media.length > 0) {
      // 获取第一个视频的offset
      trackOffset = media[0].offset || 0
      console.log(`音乐轨道起始位置设置为主轨视频开始位置: ${trackOffset}px`)
    }
    
    // 创建新轨道
    const newTrack = {
      id: `${Date.now()}_${Math.random()}`,
      name: trackName,
      color: TRACK_COLORS[trackName],
      duration: newTrackDuration,
      offset: trackOffset,
      position: trackPosition,
      trackType: isAudioTrack ? 'audio' : (isPipTrack(trackName) ? 'pip' : (isSubtitleTrack(trackName) ? 'subtitle' : 'other')),
      rowIndex: targetRowIndex,
      createdAt: Date.now(),
      manuallyAdjusted: false,
      isIndependentRow: false // 移除独立行标记，现在所有轨道都按优先级系统管理
    }
    
    console.log('创建新轨道:', newTrack)
    
    setAdditionalTracks(prev => [...prev, newTrack])
    setActiveSubmenu(null)
  }

  // 同步上下两个轨道区域的水平滚动，并更新预览时间
  useEffect(() => {
    const scrollableEl = scrollableTracksRef.current
    const fixedEl = fixedTracksRef.current
    
    if (!scrollableEl || !fixedEl) return
    
    // 更新预览时间的通用函数
    const updatePreviewTime = (scrollEl) => {
      if (!isPlaying) {
        // 计算容器中心线对应的时间（40px = 1秒）
        const containerCenterX = scrollEl.clientWidth / 2
        const scrollCenterPosition = scrollEl.scrollLeft + containerCenterX
        const newTime = scrollCenterPosition / 40
        
        // 限制在有效范围内
        const clampedTime = Math.max(0, Math.min(newTime, totalDuration))
        setCurrentTime(clampedTime)
        
        // 找到对应时间点的媒体项，更新预览
        const currentMediaItem = media.find(m => 
          clampedTime >= m.startTime && clampedTime < m.startTime + m.duration
        )
        
        if (currentMediaItem) {
          if (currentMediaItem.id !== currentPreview?.id) {
            setCurrentPreview(currentMediaItem)
          }
          
          // 如果当前预览是视频，更新视频的播放位置
          if (videoRef.current && currentMediaItem.type === 'video') {
            const videoTime = clampedTime - currentMediaItem.startTime
            if (videoTime >= 0 && videoTime <= currentMediaItem.duration) {
              videoRef.current.currentTime = videoTime
            }
          }
        }
      }
    }
    
    const handleScrollableScroll = () => {
      if (fixedEl.scrollLeft !== scrollableEl.scrollLeft) {
        fixedEl.scrollLeft = scrollableEl.scrollLeft
      }
      updatePreviewTime(scrollableEl)
    }
    
    const handleFixedScroll = () => {
      if (scrollableEl.scrollLeft !== fixedEl.scrollLeft) {
        scrollableEl.scrollLeft = fixedEl.scrollLeft
      }
      updatePreviewTime(fixedEl)
    }
    
    scrollableEl.addEventListener('scroll', handleScrollableScroll)
    fixedEl.addEventListener('scroll', handleFixedScroll)
    
    return () => {
      scrollableEl.removeEventListener('scroll', handleScrollableScroll)
      fixedEl.removeEventListener('scroll', handleFixedScroll)
    }
  }, [isPlaying, totalDuration, media, currentPreview])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
  }

  const timelineHeight = 100 - previewHeight - 15 - 0.8 // 15% 是新的工具栏高度

  // 检测是否需要让视频主轨吸底（考虑用户手动展开状态）
  useEffect(() => {
    const scrollableEl = scrollableTracksRef.current
    const tracksContainer = tracksRef.current
    
    if (!scrollableEl || !tracksContainer) return
    
    const checkIfNeedSticky = () => {
      // 如果用户手动展开了，就保持展开状态
      if (userManuallyExpanded) {
        setShouldStickMainTrack(false)
        return
      }
      
      // 计算上方轨道的总高度
      const tracksAbove = additionalTracks.filter(t => t.position === 'above')
      
      // 每个轨道行高 25px + 间距 1px = 26px
      const audioTracks = tracksAbove.filter(t => ['音乐', '音效', '录音', 'TTS', '提取音频'].includes(t.name))
      const otherTracks = tracksAbove.filter(t => !['音乐', '音效', '录音', 'TTS', '提取音频'].includes(t.name))
      
      // 计算每种类型的最大行数
      const getMaxRowIndex = (tracks) => {
        if (tracks.length === 0) return 0
        const rowIndices = tracks.map(t => t.rowIndex !== undefined ? t.rowIndex : 0)
        return Math.max(...rowIndices) + 1 // +1 因为索引从0开始
      }
      
      const audioRows = getMaxRowIndex(audioTracks)
      const otherRows = getMaxRowIndex(otherTracks)
      const totalRows = audioRows + otherRows
      
      // 计算下方音乐轨道和主轨原声的高度（吸底时自动折叠，除非用户手动展开）
      const tracksBelow = additionalTracks.filter(t => t.position === 'below')
      const belowHeight = tracksBelow.reduce((sum, track) => {
        // 音乐轨道和主轨原声：吸底时默认折叠，用户展开则正常高度
        if ((track.name === '音乐' || track.name === '主轨原声') && !userExpandedMusicTracks.has(track.id)) {
          return sum + 4 + 1 // 折叠高度 + 间距
        }
        return sum + 25 + 1 // 正常高度 + 间距
      }, 0)
      
      const estimatedHeight = totalRows * 26 + 50 + belowHeight // 50px 是视频主轨的高度
      const containerHeight = tracksContainer.clientHeight
      
      // 如果内容高度超过容器高度，需要吸底
      const needSticky = estimatedHeight > containerHeight
      console.log('吸底检测:', { 
        estimatedHeight, 
        containerHeight, 
        needSticky, 
        totalRows, 
        audioRows, 
        otherRows,
        belowHeight,
        userManuallyExpanded,
        tracksAboveCount: tracksAbove.length
      })
      setShouldStickMainTrack(needSticky)
    }
    
    // 延迟执行检测，确保DOM已经渲染完成
    const timeoutId = setTimeout(checkIfNeedSticky, 100)
    
    // 监听滚动事件：当用户向上滚动时，视频主轨快要看不见时触发吸底，向下滚动恢复
    const handleScroll = () => {
      if (!shouldStickMainTrack) return // 非吸底状态不处理
      
      const scrollableInner = scrollableEl.querySelector('.timeline-tracks-scrollable-inner')
      if (!scrollableInner) return
      
      // 计算视频主轨在容器中的位置
      const mainTrack = scrollableInner.querySelector('.track')
      if (!mainTrack) return
      
      const mainTrackRect = mainTrack.getBoundingClientRect()
      const containerRect = scrollableEl.getBoundingClientRect()
      
      // 视频主轨底部相对于容器底部的距离
      const distanceFromBottom = containerRect.bottom - mainTrackRect.bottom
      
      // 如果视频主轨快要滑出可视区域（距离底部<30px），保持吸底
      // 如果用户向下滚动，且距离底部>100px，恢复展开
      if (distanceFromBottom > 100) {
        setUserManuallyExpanded(true)
      }
    }
    
    scrollableEl.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', checkIfNeedSticky)
    
    return () => {
      clearTimeout(timeoutId)
      scrollableEl.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', checkIfNeedSticky)
    }
  }, [additionalTracks, userExpandedMusicTracks, userManuallyExpanded, shouldStickMainTrack])

  // 同步ruler的滚动位置
  useEffect(() => {
    const scrollableEl = scrollableTracksRef.current
    if (!scrollableEl) return

    const handleRulerSync = () => {
      setRulerScrollLeft(scrollableEl.scrollLeft)
    }

    scrollableEl.addEventListener('scroll', handleRulerSync)
    
    return () => {
      scrollableEl.removeEventListener('scroll', handleRulerSync)
    }
  }, [])

  // 点击外部关闭菜单和弹窗
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.toolbar-button') && !e.target.closest('.toolbar-submenu')) {
        setActiveSubmenu(null)
        setActiveThirdMenu(null)
      }
      if (!e.target.closest('.track-item') && !e.target.closest('.additional-track-item') && !e.target.closest('.track-popup')) {
        setShowPopup(null)
        setSelectedItemId(null)
        setSelectedItemType(null)
      }
      if (!e.target.closest('.timeline-header-title') && !e.target.closest('.scheme-menu')) {
        setShowSchemeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSchemeChange = (scheme) => {
    setCurrentScheme(scheme)
    setShowSchemeMenu(false)
    // 切换方案时清空所有新增的轨道和展开状态
    setAdditionalTracks([])
    setSelectedItemId(null)
    setSelectedItemType(null)
    setShowPopup(null)
    setUserExpandedMusicTracks(new Set())
    setMusicBeatPoints({})
    setUserManuallyExpanded(false) // 重置手动展开状态
  }

  // 保存项目到 localStorage
  const handleSaveProject = () => {
    const project = {
      projectName: projectName || `项目_${new Date().toLocaleDateString()}`,
      currentScheme,
      media,
      additionalTracks,
      musicBeatPoints,
      userExpandedMusicTracks: Array.from(userExpandedMusicTracks),
      savedSchemes, // 保存所有方案
      currentSchemeId, // 保存当前方案ID
      schemeNames, // 保存方案自定义名称
      schemeMarkers, // 保存方案标记点
      savedAt: new Date().toISOString()
    }
    
    localStorage.setItem('currentProject', JSON.stringify(project))
    
    // 同时保存到项目列表
    const savedProjects = JSON.parse(localStorage.getItem('savedProjects') || '[]')
    const existingIndex = savedProjects.findIndex(p => p.projectName === project.projectName)
    
    if (existingIndex >= 0) {
      savedProjects[existingIndex] = project
    } else {
      savedProjects.unshift(project) // 新项目插入到最前面
    }
    
    // 最多保存10个项目
    if (savedProjects.length > 10) {
      savedProjects.length = 10
    }
    
    localStorage.setItem('savedProjects', JSON.stringify(savedProjects))
    
    console.log('项目已保存:', project.projectName)
    alert(`项目"${project.projectName}"已保存成功！`)
  }

  // 导出项目（保存并提示）
  const handleExport = () => {
    // 始终显示保存对话框，让用户可以编辑项目名称
    setShowSaveDialog(true)
  }

  // 确认保存项目名称
  const handleConfirmSave = () => {
    if (!projectName.trim()) {
      alert('请输入项目名称')
      return
    }
    setShowSaveDialog(false)
    handleSaveProject()
  }

  // 保存当前轨道状态到方案
  const handleSaveScheme = (schemeId) => {
    const schemeData = {
      media: JSON.parse(JSON.stringify(media)),
      additionalTracks: JSON.parse(JSON.stringify(additionalTracks)),
      musicBeatPoints: JSON.parse(JSON.stringify(musicBeatPoints)),
      userExpandedMusicTracks: Array.from(userExpandedMusicTracks),
      savedAt: new Date().toISOString()
    }
    
    setSavedSchemes(prev => ({
      ...prev,
      [schemeId]: schemeData
    }))
    
    setCurrentSchemeId(schemeId)
    console.log(`方案 ${schemeId} 已保存`, schemeData)
  }

  // 切换到指定方案（直接切换，不弹窗）
  const handleSwitchScheme = (schemeId) => {
    const scheme = savedSchemes[schemeId]
    if (!scheme) {
      // 如果方案不存在，显示保存确认
      setShowSchemeConfirm({ schemeId, action: 'save' })
    } else {
      // 如果方案已存在，直接切换（不弹窗）
      confirmSwitchScheme(schemeId)
    }
  }

  // 确认保存方案
  const confirmSaveScheme = (schemeId) => {
    const schemeData = {
      media: JSON.parse(JSON.stringify(media)),
      additionalTracks: JSON.parse(JSON.stringify(additionalTracks)),
      musicBeatPoints: JSON.parse(JSON.stringify(musicBeatPoints)),
      userExpandedMusicTracks: Array.from(userExpandedMusicTracks),
      savedAt: new Date().toISOString()
    }
    
    setSavedSchemes(prev => ({
      ...prev,
      [schemeId]: schemeData
    }))
    
    setCurrentSchemeId(schemeId)
    
    // 添加方案标记点（在当前时间位置）
    const newMarker = {
      schemeId,
      time: currentTime,
      schemeName: getSchemeName(schemeId)
    }
    setSchemeMarkers(prev => [...prev, newMarker])
    
    console.log(`方案 ${schemeId} 已保存`, schemeData)
    setShowSchemeConfirm(null)
  }

  // 确认切换方案
  const confirmSwitchScheme = (schemeId) => {
    const scheme = savedSchemes[schemeId]
    if (!scheme) return
    
    // 恢复方案数据
    setMedia(JSON.parse(JSON.stringify(scheme.media)))
    setAdditionalTracks(JSON.parse(JSON.stringify(scheme.additionalTracks)))
    setMusicBeatPoints(JSON.parse(JSON.stringify(scheme.musicBeatPoints)))
    setUserExpandedMusicTracks(new Set(scheme.userExpandedMusicTracks || []))
    setCurrentSchemeId(schemeId)
    
    // 添加方案标记点（在当前时间位置）
    const newMarker = {
      schemeId,
      time: currentTime,
      schemeName: getSchemeName(schemeId)
    }
    setSchemeMarkers(prev => [...prev, newMarker])
    
    // 恢复预览
    if (scheme.media && scheme.media.length > 0) {
      setCurrentPreview(scheme.media[0])
    }
    
    console.log(`已切换到方案 ${schemeId}`, scheme)
    setShowSchemeConfirm(null)
  }

  // 处理方案按钮双击 - 编辑名称
  const handleSchemeDoubleClick = (schemeId, e) => {
    e.stopPropagation()
    setEditingSchemeId(schemeId)
  }

  // 保存方案名称
  const handleSaveSchemeName = (schemeId, newName) => {
    if (newName.trim()) {
      setSchemeNames(prev => ({
        ...prev,
        [schemeId]: newName.trim()
      }))
    }
    setEditingSchemeId(null)
  }

  // 删除方案
  const handleDeleteScheme = (schemeId, e) => {
    e.stopPropagation()
    
    // 检查方案是否存在
    if (!savedSchemes[schemeId]) {
      console.log('⚠️ 方案不存在，无需删除')
      setEditingSchemeId(null)
      return
    }
    
    // 确认删除
    const schemeName = getSchemeName(schemeId)
    console.log(`🗑️ 准备删除方案: ${schemeId} (${schemeName})`)
    
    if (window.confirm(`确定要删除"${schemeName}"的保存数据吗？`)) {
      console.log(`✅ 用户确认删除方案 ${schemeId}`)
      
      // 删除方案数据
      setSavedSchemes(prev => {
        const newSchemes = { ...prev }
        delete newSchemes[schemeId]
        console.log('更新后的savedSchemes:', Object.keys(newSchemes))
        return newSchemes
      })
      
      // 删除方案名称
      setSchemeNames(prev => {
        const newNames = { ...prev }
        delete newNames[schemeId]
        console.log('更新后的schemeNames:', Object.keys(newNames))
        return newNames
      })
      
      // 删除相关的标记点
      setSchemeMarkers(prev => {
        const filtered = prev.filter(marker => marker.schemeId !== schemeId)
        console.log('更新后的schemeMarkers数量:', filtered.length)
        return filtered
      })
      
      // 如果删除的是当前方案，清除当前方案ID
      if (currentSchemeId === schemeId) {
        console.log('删除的是当前方案，清除currentSchemeId')
        setCurrentSchemeId(null)
      }
      
      console.log(`✅ 方案 ${schemeId} 删除完成`)
    } else {
      console.log('❌ 用户取消删除')
    }
    
    setEditingSchemeId(null)
  }

  // 获取方案显示名称
  const getSchemeName = (schemeId) => {
    return schemeNames[schemeId] || `方案 ${schemeId}`
  }

  return (
    <div className="timeline-container" ref={containerRef}>
      {/* 隐藏的文件选择器，用于重新加载媒体 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      
      <div className="timeline-header">
        <button className="timeline-back-button" onClick={() => navigate('/select')}>
          ←
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div 
            className="timeline-project-name" 
            onClick={() => setShowSaveDialog(true)} 
            style={{ 
              cursor: 'pointer', 
              padding: '4px 12px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: projectName ? '#333' : '#999'
            }}
            title="点击编辑项目名称"
          >
            {projectName || '未命名项目'}
          </div>
          <div className="timeline-header-title" onClick={() => setShowSchemeMenu(!showSchemeMenu)} style={{ cursor: 'pointer', position: 'relative' }}>
            {currentScheme}
            {showSchemeMenu && (
              <div className="scheme-menu">
                <button className="scheme-menu-item" onClick={(e) => { e.stopPropagation(); handleSchemeChange('1.0-音+包'); }}>
                  1.0-音+包
                </button>
                <button className="scheme-menu-item" onClick={(e) => { e.stopPropagation(); handleSchemeChange('1.2-主轨方案'); }}>
                  1.2-主轨方案
                </button>
              </div>
            )}
          </div>
        </div>
        <button className="export-button" onClick={handleExport}>
          导出
        </button>
      </div>

      {/* 保存对话框 */}
      {showSaveDialog && (
        <div className="save-dialog-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="save-dialog-title">保存项目</h3>
            <input 
              type="text" 
              className="save-dialog-input"
              placeholder="请输入项目名称"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              autoFocus
            />
            <div className="save-dialog-buttons">
              <button className="save-dialog-button cancel" onClick={() => setShowSaveDialog(false)}>
                取消
              </button>
              <button className="save-dialog-button confirm" onClick={handleConfirmSave}>
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 方案确认对话框 */}
      {showSchemeConfirm && (
        <div className="save-dialog-overlay" onClick={() => setShowSchemeConfirm(null)}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="save-dialog-title">
              {showSchemeConfirm.action === 'save' ? '保存方案' : '切换方案'}
            </h3>
            <p className="save-dialog-message">
              {showSchemeConfirm.action === 'save' 
                ? `确认将当前轨道布局保存到"${getSchemeName(showSchemeConfirm.schemeId)}"吗？`
                : `确认切换到"${getSchemeName(showSchemeConfirm.schemeId)}"吗？当前未保存的修改将丢失。`
              }
            </p>
            <div className="save-dialog-buttons">
              <button className="save-dialog-button cancel" onClick={() => setShowSchemeConfirm(null)}>
                取消
              </button>
              <button 
                className="save-dialog-button confirm" 
                onClick={() => {
                  if (showSchemeConfirm.action === 'save') {
                    confirmSaveScheme(showSchemeConfirm.schemeId)
                  } else {
                    confirmSwitchScheme(showSchemeConfirm.schemeId)
                  }
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section - Dynamic */}
      <div className="preview-section" style={{ height: `${previewHeight}%` }}>
        {/* 方案切换按钮 */}
        <div className={`scheme-switcher ${schemeSwitcherCollapsed ? 'collapsed' : ''}`}>
          {/* 折叠/展开按钮 */}
          <button 
            className="scheme-collapse-toggle"
            onClick={() => setSchemeSwitcherCollapsed(!schemeSwitcherCollapsed)}
            title={schemeSwitcherCollapsed ? '展开方案列表' : '收起方案列表'}
          >
            {schemeSwitcherCollapsed ? '◀' : '▶'}
          </button>
          
          {/* 方案按钮列表 */}
          {!schemeSwitcherCollapsed && (
            <>
              {[1, 2, 3, 4, 5].map(id => (
            <div key={id} className="scheme-button-wrapper">
              {editingSchemeId === String(id) ? (
                <div className="scheme-edit-container">
                  {/* 左侧删除按钮 */}
                  {savedSchemes[String(id)] && (
                    <button
                      className="scheme-delete-button"
                      onClick={(e) => handleDeleteScheme(String(id), e)}
                      title="删除方案"
                    >
                      🗑️
                    </button>
                  )}
                  
                  {/* 中间输入框 */}
                  <input
                    type="text"
                    className="scheme-name-input"
                    defaultValue={getSchemeName(String(id))}
                    autoFocus
                    onBlur={(e) => handleSaveSchemeName(String(id), e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveSchemeName(String(id), e.target.value)
                      } else if (e.key === 'Escape') {
                        setEditingSchemeId(null)
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ) : (
                <button
                  className={`scheme-button ${currentSchemeId === String(id) ? 'active' : ''} ${savedSchemes[String(id)] ? 'saved' : ''}`}
                  onClick={() => handleSwitchScheme(String(id))}
                  onDoubleClick={(e) => handleSchemeDoubleClick(String(id), e)}
                  title={savedSchemes[String(id)] ? `${getSchemeName(String(id))} (已保存)\n双击编辑名称` : `${getSchemeName(String(id))} (未保存)\n双击编辑名称`}
                >
                  {getSchemeName(String(id))}
                </button>
              )}
            </div>
          ))}
            </>
          )}
        </div>

        {currentPreview ? (
          <div className="preview-canvas">
            {currentPreview.type === 'image' ? (
              <img 
                src={currentPreview.url} 
                alt="Preview" 
                className="preview-media"
              />
            ) : (
              <video 
                ref={videoRef}
                src={currentPreview.url}
                className="preview-media"
              />
            )}
          </div>
        ) : (
          <div className="preview-placeholder">
            <div className="preview-placeholder-icon">🎬</div>
            <div>预览区域</div>
          </div>
        )}
        
        <div className="playback-controls">
          <button className="playback-button" onClick={handleStop}>
            ⏹
          </button>
          <button className="playback-button" onClick={handlePlayPause}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="timecode">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>
      </div>

      {/* Resizable Divider */}
      <div 
        className="timeline-divider" 
        onMouseDown={handleDividerMouseDown}
        onTouchStart={handleDividerTouchStart}
        style={{ cursor: isDraggingDivider ? 'row-resize' : 'row-resize' }}
      />

      {/* Timeline Section - Dynamic */}
      <div className="timeline-section" ref={timelineSectionRef} style={{ height: `${timelineHeight}%` }}>
        {/* 播放指针固定在屏幕中心（ruler上方） */}
        <div 
          className="playhead" 
          style={{ 
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            top: timelineSectionRef.current ? `${timelineSectionRef.current.offsetTop}px` : '0',
            height: '15px',
            width: '2px',
            background: '#667eea',
            zIndex: 11,
            pointerEvents: 'none'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-3px',
            left: '-3px',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '5px solid #667eea'
          }} />
        </div>
        
        <div className="timeline-ruler" style={{ overflow: 'hidden', position: 'relative' }}>
          {/* 方案标记点 */}
          {schemeMarkers.map((marker, index) => (
            <div
              key={`marker-${index}`}
              className="scheme-marker"
              style={{
                position: 'absolute',
                left: `${marker.time * 40}px`,
                top: '50%',
                transform: `translate(-50%, -50%) translateX(-${rulerScrollLeft}px)`,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#FFD700',
                border: '2px solid #FFA500',
                zIndex: 5,
                boxShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
                cursor: 'pointer'
              }}
              title={`${marker.schemeName} (${formatTime(marker.time)})`}
            />
          ))}
          
          <div 
            className="ruler-marks" 
            style={{ 
              width: `${Math.max(
                totalDuration * 40 + window.innerWidth, 
                ...media.map(m => (m.offset || 0) + m.duration * 40 + window.innerWidth),
                ...additionalTracks.map(t => (t.offset || 0) + t.duration * 40 + window.innerWidth)
              )}px`,
              transform: `translateX(-${rulerScrollLeft}px)`
            }}
          >
            {Array.from({ length: Math.ceil(totalDuration) + 10 || 20 }).map((_, i) => (
              <div 
                key={i} 
                className="ruler-mark"
                style={{
                  position: 'absolute',
                  left: `${i * 40}px`,
                  width: '40px',
                  height: '100%'
                }}
              >
                {i}s
              </div>
            ))}
          </div>
        </div>

        <div className="timeline-tracks" ref={tracksRef}>
          {/* Center Line - Fixed to viewport center */}
          <div 
            className="timeline-center-line" 
            style={{
              top: timelineSectionRef.current ? timelineSectionRef.current.offsetTop : 0,
              height: timelineSectionRef.current ? timelineSectionRef.current.offsetHeight : '100%'
            }}
          />
          
          {/* 可滚动的轨道区域 */}
          <div 
            className={`timeline-tracks-scrollable ${userManuallyExpanded ? 'align-top' : (shouldStickMainTrack ? 'align-bottom' : '')}`} 
            ref={scrollableTracksRef}
          >
            <div className="timeline-tracks-scrollable-inner">
              {/* Additional Tracks Above - 根据方案渲染 */}
              {(() => {
                // 过滤出在上方的轨道
                const tracksAbove = additionalTracks.filter(t => t.position === 'above')
                
                // 不再区分音频类和其他类，统一按 rowIndex 排序渲染
                // 渲染函数 - 按 rowIndex 分组渲染
                const renderTracksByRow = (tracks) => {
                  // 按 rowIndex 分组
                  const tracksByRow = {}
                  tracks.forEach(track => {
                    const row = track.rowIndex !== undefined ? track.rowIndex : 0
                    console.log('🎨 渲染轨道:', track.name, 'rowIndex:', row)
                    if (!tracksByRow[row]) {
                      tracksByRow[row] = []
                    }
                    tracksByRow[row].push(track)
                  })
                  
                  // 按 rowIndex 倒序排列（大的在上方）
                  const sortedRows = Object.keys(tracksByRow).sort((a, b) => Number(b) - Number(a))
                  
                  return sortedRows.map(rowKey => {
                    const rowIndex = Number(rowKey)
                    const isShowingArrows = showRowArrows?.position === 'above' && showRowArrows?.rowIndex === rowIndex
                    
                    return (
                    <div key={`row-${rowKey}`} className="additional-track" style={{ position: 'relative' }}>
                      {/* 三条线图标 - 在行的最左边 */}
                      <div 
                        className="row-menu-icon"
                        style={{
                          position: 'absolute',
                          left: '5px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          cursor: 'pointer',
                          zIndex: 200,
                          padding: '4px 6px',
                          fontSize: '14px',
                          userSelect: 'none',
                          color: '#888',
                          opacity: 0.7,
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '3px'
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          console.log('🔴 双击了三条线图标, rowIndex:', rowIndex)
                          setShowRowArrows(isShowingArrows ? null : { position: 'above', rowIndex })
                        }}
                        title="双击显示移动箭头"
                      >
                        ☰
                      </div>
                      
                      {/* 向上/向下箭头 */}
                      {isShowingArrows && (
                        <>
                          <div 
                            className="row-arrow-up"
                            style={{
                              position: 'absolute',
                              left: '5px',
                              top: '-15px',
                              cursor: 'pointer',
                              zIndex: 101,
                              fontSize: '20px',
                              background: '#4CAF50',
                              borderRadius: '50%',
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              moveRowUp('above', rowIndex)
                              setShowRowArrows(null)
                            }}
                            title="向上移动一行"
                          >
                            ↑
                          </div>
                          <div 
                            className="row-arrow-down"
                            style={{
                              position: 'absolute',
                              left: '5px',
                              bottom: '-15px',
                              cursor: 'pointer',
                              zIndex: 101,
                              fontSize: '20px',
                              background: '#2196F3',
                              borderRadius: '50%',
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              moveRowDown('above', rowIndex)
                              setShowRowArrows(null)
                            }}
                            title="向下移动一行"
                          >
                            ↓
                          </div>
                        </>
                      )}
                      
                      {tracksByRow[rowKey].map((track) => (
                      <div
                        key={track.id}
                        className={`additional-track-item ${selectedItemId === track.id && selectedItemType === 'additional' ? 'selected' : ''} ${track.name === '画中画' ? 'checkerboard' : ''}`}
                        style={{ 
                          backgroundColor: track.name === '画中画' ? 'transparent' : track.color,
                          width: `${track.duration * 40}px`,
                          transform: `translateX(${track.offset || 0}px)`
                        }}
                        onMouseDown={(e) => handleTrackMouseDown(e, track.id, 'additional', track.offset)}
                        onTouchStart={(e) => handleTrackMouseDown(e, track.id, 'additional', track.offset)}
                        onClick={(e) => handleItemClick(e, track.id, 'additional')}
                      >
                        {track.name}
                        
                        {/* 方向控制按钮 - 只在选中时显示 */}
                        {selectedItemId === track.id && selectedItemType === 'additional' && (
                          <>
                            {/* 左侧按钮组 */}
                            <div className="track-control-buttons left" onClick={(e) => e.stopPropagation()}>
                              <button className="track-control-btn" onClick={handleMoveLeft} title="左移1秒">
                                ←
                              </button>
                              <button className="track-control-btn" onClick={handleMoveUp} title="上移一层">
                                ↑
                              </button>
                            </div>
                            
                            {/* 右侧按钮组 */}
                            <div className="track-control-buttons right" onClick={(e) => e.stopPropagation()}>
                              <button className="track-control-btn" onClick={handleMoveDown} title="下移一层">
                                ↓
                              </button>
                              <button className="track-control-btn" onClick={handleMoveRight} title="右移1秒">
                                →
                              </button>
                            </div>
                          </>
                        )}
                        
                        {showPopup === track.id && selectedItemType === 'additional' && (
                          <div className="track-popup" onClick={(e) => e.stopPropagation()}>
                            {/* 派生功能按钮 - 显示在最上方 */}
                            {track.name === '文字' && (
                              <button className="track-popup-button derivative" onClick={() => handleAddDerivativeTrack('TTS')}>
                                生成TTS
                              </button>
                            )}
                            {track.name === '画中画' && (
                              <>
                                <button 
                                  className="track-popup-button derivative" 
                                  onClick={(e) => {
                                    console.log('🔴 点击了"画中画字幕"按钮(非吸底)')
                                    e.stopPropagation()
                                    handleAddDerivativeTrack('画中画字幕')
                                  }}
                                >
                                  画中画字幕
                                </button>
                                <button 
                                  className="track-popup-button derivative" 
                                  onClick={(e) => {
                                    console.log('🔴 点击了"画中画原声"按钮(非吸底)')
                                    e.stopPropagation()
                                    handleAddDerivativeTrack('提取音频')
                                  }}
                                >
                                  画中画原声
                                </button>
                              </>
                            )}
                            {track.name === '音乐' && (
                              <>
                                <button className="track-popup-button" onClick={handleAddMusicBeatPoints}>
                                  音乐卡点
                                </button>
                                <button className="track-popup-button derivative" onClick={() => handleAddDerivativeTrack('音乐字幕')}>
                                  音乐字幕
                                </button>
                              </>
                            )}
                            {track.name === '录音' && (
                              <button className="track-popup-button derivative" onClick={() => handleAddDerivativeTrack('录音字幕')}>
                                录音字幕
                              </button>
                            )}
                            {['主轨字幕', '画中画字幕', '音乐字幕', '录音字幕', '歌词字幕'].includes(track.name) && (
                              <button className="track-popup-button derivative" onClick={() => handleAddDerivativeTrack('双语字幕')}>
                                双语字幕
                              </button>
                            )}
                            
                            {/* 常规操作按钮 */}
                            {track.name !== '音乐' && (
                              <button className="track-popup-button" onClick={handleLengthenTrack}>
                                变长
                              </button>
                            )}
                            {track.name !== '音乐' && (
                              <div style={{ position: 'relative' }}>
                                <button className="track-popup-button" onClick={handleShortenTrack}>
                                  变短 {showShortenMenu ? '▼' : '▶'}
                                </button>
                                {showShortenMenu && (
                                  <div className="shorten-submenu" onClick={(e) => e.stopPropagation()}>
                                    <button className="submenu-option" onClick={(e) => handleShortenOption(e, '1s')}>
                                      1 秒
                                    </button>
                                    <button className="submenu-option" onClick={(e) => handleShortenOption(e, '3s')}>
                                      3 秒
                                    </button>
                                    <button className="submenu-option" onClick={(e) => handleShortenOption(e, '5s')}>
                                      5 秒
                                    </button>
                                    <button className="submenu-option" onClick={(e) => handleShortenOption(e, 'match')}>
                                      与主轨一样长度
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            {track.name === '音乐' && (
                              <>
                                <button className="track-popup-button" onClick={handleLengthenTrack}>
                                  变长
                                </button>
                                <div style={{ position: 'relative' }}>
                                  <button className="track-popup-button" onClick={handleShortenTrack}>
                                    变短 {showShortenMenu ? '▼' : '▶'}
                                  </button>
                                  {showShortenMenu && (
                                    <div className="shorten-submenu" onClick={(e) => e.stopPropagation()}>
                                      <button className="submenu-option" onClick={(e) => handleShortenOption(e, '1s')}>
                                        1 秒
                                      </button>
                                      <button className="submenu-option" onClick={(e) => handleShortenOption(e, '3s')}>
                                        3 秒
                                      </button>
                                      <button className="submenu-option" onClick={(e) => handleShortenOption(e, '5s')}>
                                        5 秒
                                      </button>
                                      <button className="submenu-option" onClick={(e) => handleShortenOption(e, 'match')}>
                                        与主轨一样长度
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            <button className="track-popup-button" onClick={handleDuplicateTrack}>
                              复制
                            </button>
                            <button className="track-popup-button delete" onClick={handleDeleteTrack}>
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                    )
                  })
                };
              
              return (
                <>
                  {/* 统一按 rowIndex 渲染所有轨道 */}
                  {renderTracksByRow(tracksAbove)}
                </>
              )
            })()}
            
            {/* 默认情况：视频主轨在滚动容器中（居中显示） */}
            {(!shouldStickMainTrack || userManuallyExpanded) && (
              <>
                {/* Main Video Track */}
                <div className="track">
                  <div className="track-items">
                    {media.map((item) => (
                      <div
                        key={item.id}
                        className={`track-item ${selectedItemId === item.id && selectedItemType === 'main' ? 'selected' : ''}`}
                        style={{ 
                          width: `${item.duration * 40}px`,
                          transform: `translateX(${item.offset || 0}px)`,
                          cursor: 'default'
                        }}
                        onClick={(e) => handleItemClick(e, item.id, 'main')}
                      >
                        {item.type === 'image' ? (
                          <img src={item.url} alt="" className="track-item-preview" />
                        ) : (
                          <video src={item.url} className="track-item-preview" />
                        )}
                        
                    {/* 派生功能气泡 - 显示在主轨上方 */}
                    {(() => {
                      console.log('🔍 主轨气泡检查(非吸底):', { 
                        showPopup, 
                        itemId: item.id, 
                        selectedItemType,
                        shouldShow: showPopup === item.id && selectedItemType === 'main'
                      })
                      return showPopup === item.id && selectedItemType === 'main' && (
                        <div 
                          className="track-popup main-derivative" 
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: 'red', // 临时调试
                            border: '3px solid yellow',
                            zIndex: 9999
                          }}
                        >
                          {console.log('✅ 主轨派生气泡已渲染(非吸底)')}
                          <button 
                            className="track-popup-button derivative" 
                            onClick={(e) => {
                              console.log('🔴 点击了"生成主轨字幕"按钮')
                              e.stopPropagation()
                              handleAddDerivativeTrack('主轨字幕')
                            }}
                          >
                            生成主轨字幕
                          </button>
                          <button 
                            className="track-popup-button derivative" 
                            onClick={(e) => {
                              console.log('🔴 点击了"生成主轨原声"按钮')
                              e.stopPropagation()
                              handleAddDerivativeTrack('提取音频')
                            }}
                          >
                            生成主轨原声
                          </button>
                        </div>
                      )
                    })()}
                    
                    {/* 常规操作气泡 - 显示在主轨下方 */}
                    {showPopup === item.id && selectedItemType === 'main' && (
                      <div 
                        className="track-popup main-regular" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button 
                          className="track-popup-button" 
                          onClick={(e) => handleReloadMedia(e, item.id)}
                          title="重新选择视频/图片文件"
                        >
                          🔄 重新加载
                        </button>
                        <button className="track-popup-button" onClick={handleDuplicateTrack}>
                          复制
                        </button>
                      </div>
                    )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Tracks Below in scrollable - 非吸底模式，音乐始终展开 */}
                {additionalTracks.filter(t => t.position === 'below').map((track) => {
                  const isMusicTrack = track.name === '音乐'
                  const beatPoints = musicBeatPoints[track.id] || []
                  
                  return (
                    <div key={track.id} className="additional-track">
                      <div
                        className={`additional-track-item ${selectedItemId === track.id && selectedItemType === 'additional' ? 'selected' : ''} ${track.name === '画中画' ? 'checkerboard' : ''}`}
                        style={{ 
                          backgroundColor: track.name === '画中画' ? 'transparent' : track.color,
                          width: `${track.duration * 40}px`,
                          transform: `translateX(${track.offset || 0}px)`
                        }}
                        onMouseDown={(e) => handleTrackMouseDown(e, track.id, 'additional', track.offset)}
                        onTouchStart={(e) => handleTrackMouseDown(e, track.id, 'additional', track.offset)}
                        onClick={(e) => handleItemClick(e, track.id, 'additional')}
                      >
                        {track.name}
                        
                        {/* 卡点显示 */}
                        {isMusicTrack && beatPoints.map((position, index) => (
                          <div
                            key={index}
                            className="music-beat-point"
                            style={{
                              position: 'absolute',
                              left: `${position}px`,
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#FFD700',
                              borderRadius: '50%',
                              border: '1px solid rgba(255, 255, 255, 0.5)',
                              pointerEvents: 'none',
                              zIndex: 10,
                              boxShadow: '0 0 4px rgba(255, 215, 0, 0.8)'
                            }}
                          />
                        ))}
                        
                        {/* 方向控制按钮 - 只在选中时显示 */}
                        {selectedItemId === track.id && selectedItemType === 'additional' && (
                          <>
                            {/* 左侧按钮组 */}
                            <div className="track-control-buttons left" onClick={(e) => e.stopPropagation()}>
                              <button className="track-control-btn" onClick={handleMoveLeft} title="左移1秒">
                                ←
                              </button>
                              <button className="track-control-btn" onClick={handleMoveUp} title="上移一层">
                                ↑
                              </button>
                            </div>
                            
                            {/* 右侧按钮组 */}
                            <div className="track-control-buttons right" onClick={(e) => e.stopPropagation()}>
                              <button className="track-control-btn" onClick={handleMoveDown} title="下移一层">
                                ↓
                              </button>
                              <button className="track-control-btn" onClick={handleMoveRight} title="右移1秒">
                                →
                              </button>
                            </div>
                          </>
                        )}
                        
                        {showPopup === track.id && selectedItemType === 'additional' && (
                          <div className="track-popup" onClick={(e) => e.stopPropagation()}>
                            {/* 派生功能按钮 - 显示在最上方 */}
                            {track.name === '文字' && (
                              <button className="track-popup-button derivative" onClick={() => handleAddDerivativeTrack('TTS')}>
                                生成TTS
                              </button>
                            )}
                            {track.name === '画中画' && (
                              <>
                                <button 
                                  className="track-popup-button derivative" 
                                  onClick={(e) => {
                                    console.log('🔴 点击了"画中画字幕"按钮(吸底)')
                                    e.stopPropagation()
                                    handleAddDerivativeTrack('画中画字幕')
                                  }}
                                >
                                  画中画字幕
                                </button>
                                <button 
                                  className="track-popup-button derivative" 
                                  onClick={(e) => {
                                    console.log('🔴 点击了"画中画原声"按钮(吸底)')
                                    e.stopPropagation()
                                    handleAddDerivativeTrack('提取音频')
                                  }}
                                >
                                  画中画原声
                                </button>
                              </>
                            )}
                            {track.name === '音乐' && (
                              <>
                                <button className="track-popup-button" onClick={handleAddMusicBeatPoints}>
                                  音乐卡点
                                </button>
                                <button className="track-popup-button derivative" onClick={() => handleAddDerivativeTrack('音乐字幕')}>
                                  音乐字幕
                                </button>
                              </>
                            )}
                            {track.name === '录音' && (
                              <button className="track-popup-button derivative" onClick={() => handleAddDerivativeTrack('录音字幕')}>
                                录音字幕
                              </button>
                            )}
                            {['主轨字幕', '画中画字幕', '音乐字幕', '录音字幕', '歌词字幕'].includes(track.name) && (
                              <button className="track-popup-button derivative" onClick={() => handleAddDerivativeTrack('双语字幕')}>
                                双语字幕
                              </button>
                            )}
                            
                            {/* 常规操作按钮 */}
                            <button className="track-popup-button" onClick={handleLengthenTrack}>
                              变长
                            </button>
                            <div style={{ position: 'relative' }}>
                              <button className="track-popup-button" onClick={handleShortenTrack}>
                                变短 {showShortenMenu ? '▼' : '▶'}
                              </button>
                              {showShortenMenu && (
                                <div className="shorten-submenu" onClick={(e) => e.stopPropagation()}>
                                  <button className="submenu-option" onClick={(e) => handleShortenOption(e, '1s')}>
                                    1 秒
                                  </button>
                                  <button className="submenu-option" onClick={(e) => handleShortenOption(e, '3s')}>
                                    3 秒
                                  </button>
                                  <button className="submenu-option" onClick={(e) => handleShortenOption(e, '5s')}>
                                    5 秒
                                  </button>
                                  <button className="submenu-option" onClick={(e) => handleShortenOption(e, 'match')}>
                                    与主轨一样长度
                                  </button>
                                </div>
                              )}
                            </div>
                            <button className="track-popup-button" onClick={handleDuplicateTrack}>
                              复制
                            </button>
                            <button className="track-popup-button delete" onClick={handleDeleteTrack}>
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
            
            {/* 占位元素，确保可以水平滚动 */}
            <div style={{ 
              position: 'absolute', 
              left: 0, 
              top: 0, 
              width: `${Math.max(
                totalDuration * 40 + window.innerWidth, 
                ...media.map(m => (m.offset || 0) + m.duration * 40 + window.innerWidth),
                ...additionalTracks.map(t => (t.offset || 0) + t.duration * 40 + window.innerWidth)
              )}px`, 
              height: '1px',
              pointerEvents: 'none'
            }} />
            </div>
          </div>

          {/* 吸底模式：视频主轨固定在底部 */}
          <div className={`timeline-main-track-fixed ${shouldStickMainTrack && !userManuallyExpanded ? 'sticky' : ''}`} ref={fixedTracksRef}>
            {/* Main Video Track */}
            <div className="track">
              <div className="track-items">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className={`track-item ${selectedItemId === item.id && selectedItemType === 'main' ? 'selected' : ''}`}
                    style={{ 
                      width: `${item.duration * 40}px`,
                      transform: `translateX(${item.offset || 0}px)`,
                      cursor: 'default'
                    }}
                    onClick={(e) => handleItemClick(e, item.id, 'main')}
                  >
                    {item.type === 'image' ? (
                      <img src={item.url} alt="" className="track-item-preview" />
                    ) : (
                      <video src={item.url} className="track-item-preview" />
                    )}
                    
                    {/* 派生功能气泡 - 显示在主轨上方 */}
                    {(() => {
                      console.log('🔍 主轨气泡检查(吸底):', { 
                        showPopup, 
                        itemId: item.id, 
                        selectedItemType,
                        shouldShow: showPopup === item.id && selectedItemType === 'main'
                      })
                      return showPopup === item.id && selectedItemType === 'main' && (
                        <div 
                          className="track-popup main-derivative" 
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: 'red',
                            border: '3px solid yellow',
                            zIndex: 9999
                          }}
                        >
                          {console.log('✅ 主轨派生气泡已渲染(吸底)')}
                          <button 
                            className="track-popup-button derivative" 
                            onClick={(e) => {
                              console.log('🔴 点击了"生成主轨字幕"按钮(吸底)')
                              e.stopPropagation()
                              handleAddDerivativeTrack('主轨字幕')
                            }}
                          >
                            生成主轨字幕
                          </button>
                          <button 
                            className="track-popup-button derivative" 
                            onClick={(e) => {
                              console.log('🔴 点击了"生成主轨原声"按钮(吸底)')
                              e.stopPropagation()
                              handleAddDerivativeTrack('提取音频')
                            }}
                          >
                            生成主轨原声
                          </button>
                        </div>
                      )
                    })()}
                    
                    {/* 常规操作气泡 - 显示在主轨下方 */}
                    {showPopup === item.id && selectedItemType === 'main' && (
                      <div 
                        className="track-popup main-regular" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button 
                          className="track-popup-button" 
                          onClick={(e) => handleReloadMedia(e, item.id)}
                          title="重新选择视频/图片文件"
                        >
                          🔄 重新加载
                        </button>
                        <button className="track-popup-button" onClick={handleDuplicateTrack}>
                          复制
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Tracks Below - 音乐轨道和主轨原声支持折叠/展开 */}
            {additionalTracks.filter(t => t.position === 'below').map((track) => {
              const isMusicTrack = track.name === '音乐'
              const isMainAudioTrack = track.name === '主轨原声'
              // 折叠条件：吸底模式 && 用户没有手动展开
              const shouldCollapse = (isMusicTrack || isMainAudioTrack) && shouldStickMainTrack && !userExpandedMusicTracks.has(track.id)
              const beatPoints = musicBeatPoints[track.id] || []
              
              return (
                <div key={track.id} className={`additional-track ${shouldCollapse ? 'music-collapsed' : ''}`}>
                  <div
                    className={`additional-track-item ${selectedItemId === track.id && selectedItemType === 'additional' ? 'selected' : ''} ${shouldCollapse ? 'music-line' : ''} ${track.name === '画中画' ? 'checkerboard' : ''}`}
                    style={{ 
                      backgroundColor: track.name === '画中画' ? 'transparent' : track.color,
                      width: `${track.duration * 40}px`,
                      transform: `translateX(${track.offset || 0}px)`
                    }}
                    onMouseDown={(e) => handleTrackMouseDown(e, track.id, 'additional', track.offset)}
                    onTouchStart={(e) => handleTrackMouseDown(e, track.id, 'additional', track.offset)}
                    onClick={(e) => handleItemClick(e, track.id, 'additional')}
                  >
                    {!shouldCollapse && track.name}
                    
                    {/* 卡点显示 - 无论折叠还是展开都显示 */}
                    {isMusicTrack && beatPoints.map((position, index) => (
                      <div
                        key={index}
                        className="music-beat-point"
                        style={{
                          position: 'absolute',
                          left: `${position}px`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: shouldCollapse ? '6px' : '8px',
                          height: shouldCollapse ? '6px' : '8px',
                          backgroundColor: '#FFD700',
                          borderRadius: '50%',
                          border: '1px solid rgba(255, 255, 255, 0.5)',
                          pointerEvents: 'none',
                          zIndex: 10,
                          boxShadow: '0 0 4px rgba(255, 215, 0, 0.8)'
                        }}
                      />
                    ))}
                    
                    {/* 方向控制按钮 - 只在选中时显示 */}
                    {selectedItemId === track.id && selectedItemType === 'additional' && (
                      <>
                        {/* 左侧按钮组 */}
                        <div className="track-control-buttons left" onClick={(e) => e.stopPropagation()}>
                          <button className="track-control-btn" onClick={handleMoveLeft} title="左移1秒">
                            ←
                          </button>
                          <button className="track-control-btn" onClick={handleMoveUp} title="上移一层">
                            ↑
                          </button>
                        </div>
                        
                        {/* 右侧按钮组 */}
                        <div className="track-control-buttons right" onClick={(e) => e.stopPropagation()}>
                          <button className="track-control-btn" onClick={handleMoveDown} title="下移一层">
                            ↓
                          </button>
                          <button className="track-control-btn" onClick={handleMoveRight} title="右移1秒">
                            →
                          </button>
                        </div>
                      </>
                    )}
                    
                    {showPopup === track.id && selectedItemType === 'additional' && (
                      <div className="track-popup" onClick={(e) => e.stopPropagation()}>
                        {/* 音乐轨道专属：音乐卡点按钮 */}
                        {track.name === '音乐' && (
                          <button className="track-popup-button" onClick={handleAddMusicBeatPoints}>
                            音乐卡点
                          </button>
                        )}
                        <button className="track-popup-button" onClick={handleLengthenTrack}>
                          变长
                        </button>
                        <div style={{ position: 'relative' }}>
                          <button className="track-popup-button" onClick={handleShortenTrack}>
                            变短 {showShortenMenu ? '▼' : '▶'}
                          </button>
                          {showShortenMenu && (
                            <div className="shorten-submenu" onClick={(e) => e.stopPropagation()}>
                              <button className="submenu-option" onClick={(e) => handleShortenOption(e, '1s')}>
                                1 秒
                              </button>
                              <button className="submenu-option" onClick={(e) => handleShortenOption(e, '3s')}>
                                3 秒
                              </button>
                              <button className="submenu-option" onClick={(e) => handleShortenOption(e, '5s')}>
                                5 秒
                              </button>
                              <button className="submenu-option" onClick={(e) => handleShortenOption(e, 'match')}>
                                与主轨一样长度
                              </button>
                            </div>
                          )}
                        </div>
                        <button className="track-popup-button" onClick={handleDuplicateTrack}>
                          复制
                        </button>
                        <button className="track-popup-button delete" onClick={handleDeleteTrack}>
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            
            {/* 占位元素，确保可以水平滚动 */}
            <div style={{ 
              position: 'absolute', 
              left: 0, 
              top: 0, 
              width: `${Math.max(
                totalDuration * 40 + window.innerWidth, 
                ...media.map(m => (m.offset || 0) + m.duration * 40 + window.innerWidth),
                ...additionalTracks.filter(t => t.position === 'below').map(t => (t.offset || 0) + t.duration * 40 + window.innerWidth)
              )}px`, 
              height: '1px',
              pointerEvents: 'none'
            }} />
          </div>
        </div>
      </div>

      {/* Toolbar Section - 20% */}
      <div className="toolbar-section">
        {/* 一级菜单 */}
        <button 
          className={`toolbar-button ${activeSubmenu === '文字' ? 'active' : ''}`}
          onClick={() => handleToolbarClick('文字')}
        >
          <div className="toolbar-icon">📝</div>
          <div className="toolbar-label">文字</div>
          {activeSubmenu === '文字' && (
            <div className="toolbar-submenu">
              <button className="submenu-item" onClick={() => handleSubmenuClick('文字')}>+文字</button>
              <button className="submenu-item" onClick={() => handleSubmenuClick('歌词字幕')}>+歌词字幕</button>
              <button className="submenu-item" onClick={() => handleSubmenuClick('录音字幕')}>+录音字幕</button>
            </div>
          )}
        </button>
        
        <button 
          className={`toolbar-button ${activeSubmenu === '音频' ? 'active' : ''}`}
          onClick={() => handleToolbarClick('音频')}
        >
          <div className="toolbar-icon">🎵</div>
          <div className="toolbar-label">音频</div>
          {activeSubmenu === '音频' && (
            <div className="toolbar-submenu">
              <button className="submenu-item" onClick={() => handleSubmenuClick('音乐')}>+音乐</button>
              <button className="submenu-item" onClick={() => handleSubmenuClick('音效')}>+音效</button>
              <button className="submenu-item" onClick={() => handleSubmenuClick('录音')}>+录音</button>
            </div>
          )}
        </button>
        
        <button 
          className={`toolbar-button ${activeSubmenu === '画面' ? 'active' : ''}`}
          onClick={() => handleToolbarClick('画面')}
        >
          <div className="toolbar-icon">🎨</div>
          <div className="toolbar-label">画面</div>
          {activeSubmenu === '画面' && (
            <div className="toolbar-submenu">
              <button className="submenu-item" onClick={() => handleSubmenuClick('贴纸')}>+贴纸</button>
              
              {/* 特效 - 有三级菜单 */}
              <button 
                className={`submenu-item ${activeThirdMenu === '特效' ? 'active' : ''}`}
                onClick={() => handleSubmenuClick('特效')}
              >
                +特效 {activeThirdMenu === '特效' ? '▼' : '▶'}
              </button>
              {activeThirdMenu === '特效' && (
                <div className="toolbar-third-menu">
                  <button className="third-menu-item" onClick={() => handleSubmenuClick('全局特效')}>+全局特效</button>
                  <button className="third-menu-item" onClick={() => handleSubmenuClick('局部特效')}>+局部特效</button>
                </div>
              )}
              
              {/* 滤镜 - 有三级菜单 */}
              <button 
                className={`submenu-item ${activeThirdMenu === '滤镜' ? 'active' : ''}`}
                onClick={() => handleSubmenuClick('滤镜')}
              >
                +滤镜 {activeThirdMenu === '滤镜' ? '▼' : '▶'}
              </button>
              {activeThirdMenu === '滤镜' && (
                <div className="toolbar-third-menu">
                  <button className="third-menu-item" onClick={() => handleSubmenuClick('轨道滤镜')}>+轨道滤镜</button>
                  <button className="third-menu-item" onClick={() => handleSubmenuClick('属性滤镜')}>+属性滤镜</button>
                </div>
              )}
              
              <button className="submenu-item" onClick={() => handleSubmenuClick('画中画')}>+画中画</button>
            </div>
          )}
        </button>
        
        <button 
          className={`toolbar-button ${activeSubmenu === '属性' ? 'active' : ''}`}
          onClick={() => handleToolbarClick('属性')}
        >
          <div className="toolbar-icon">⚙️</div>
          <div className="toolbar-label">属性</div>
          {activeSubmenu === '属性' && (
            <div className="toolbar-submenu">
              <button className="submenu-item" onClick={() => handleSubmenuClick('音量')}>+音量</button>
              <button className="submenu-item" onClick={() => handleSubmenuClick('变速')}>+变速</button>
              <button className="submenu-item" onClick={() => handleSubmenuClick('滤镜')}>+滤镜</button>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}

export default Timeline
