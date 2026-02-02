import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './MediaSelector.css'

function MediaSelector() {
  const navigate = useNavigate()
  const [selectedMedia, setSelectedMedia] = useState([])
  const [savedProjects, setSavedProjects] = useState([]) // 改为工程包
  const [showProjectMenu, setShowProjectMenu] = useState(false) // 改为工程包菜单
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [projectName, setProjectName] = useState('') // 改为项目名
  const [editingProjectName, setEditingProjectName] = useState(null) // 正在编辑的工程包名
  const [newProjectName, setNewProjectName] = useState('') // 新的工程包名
  const fileInputRef = useRef(null)

  // 加载保存的工程包
  useEffect(() => {
    const loadProjects = () => {
      const savedProjectsData = localStorage.getItem('savedProjects')
      if (savedProjectsData) {
        const projects = JSON.parse(savedProjectsData)
        // 按时间倒序排列（最新的在前）
        projects.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
        setSavedProjects(projects)
      }
    }
    loadProjects()
    
    // 监听存储变化，实时更新列表
    window.addEventListener('storage', loadProjects)
    return () => window.removeEventListener('storage', loadProjects)
  }, [])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    const mediaFiles = files.map((file, index) => ({
      id: `${Date.now()}_${index}`,
      file,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      url: URL.createObjectURL(file),
      name: file.name
    }))
    setSelectedMedia([...selectedMedia, ...mediaFiles])
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const toggleMediaSelection = (mediaId) => {
    const media = selectedMedia.find(m => m.id === mediaId)
    if (media) {
      media.selected = !media.selected
      setSelectedMedia([...selectedMedia])
    }
  }

  const handleConfirm = () => {
    const selected = selectedMedia.filter(m => m.selected)
    if (selected.length > 0) {
      // 清除旧项目，标记为新项目
      navigate('/timeline', { state: { media: selected, restoreProject: false } })
    }
  }

  // 保存当前选择为工程包 - 已废弃，工程包从时间轴导出
  // 保留这个函数以兼容旧代码，但不再使用
  const handleSaveTestCase = () => {
    // 废弃功能
    alert('请在时间轴页面点击"导出"按钮保存工程包')
  }

  // 加载工程包 - 从时间轴保存的完整项目
  const handleLoadProject = (project) => {
    setShowProjectMenu(false)
    
    // 使用项目名称+时间戳作为唯一标识，设置为当前项目
    const projectToLoad = {
      ...project,
      _loadedAt: Date.now() // 添加加载时间戳，防止被自动保存覆盖
    }
    localStorage.setItem('currentProject', JSON.stringify(projectToLoad))
    
    console.log('🔄 加载工程包:', project.projectName, '保存时间:', project.savedAt)
    
    // 跳转到时间轴，标记为恢复项目
    navigate('/timeline', { state: { restoreProject: true } })
  }

  // 删除工程包
  const handleDeleteProject = (e, projectName) => {
    e.stopPropagation()
    const confirmed = window.confirm('确定要删除这个工程包吗？')
    if (confirmed) {
      const updatedProjects = savedProjects.filter(p => p.projectName !== projectName)
      setSavedProjects(updatedProjects)
      localStorage.setItem('savedProjects', JSON.stringify(updatedProjects))
      
      // 如果删除的是当前项目，也清除 currentProject
      const currentProject = localStorage.getItem('currentProject')
      if (currentProject) {
        const current = JSON.parse(currentProject)
        if (current.projectName === projectName) {
          localStorage.removeItem('currentProject')
        }
      }
    }
  }

  // 清空所有工程包
  const handleClearAllProjects = () => {
    const confirmed = window.confirm('确定要清空所有工程包吗？\n\n此操作不可恢复！\n清空后您需要重新使用"导出"功能保存新的工程包。')
    if (confirmed) {
      localStorage.setItem('savedProjects', '[]')
      setSavedProjects([])
      alert('已清空所有工程包')
    }
  }

  // 开始编辑工程包名称
  const handleStartEditProjectName = (e, project) => {
    e.stopPropagation()
    setEditingProjectName(project.projectName)
    setNewProjectName(project.projectName)
  }

  // 保存工程包名称修改
  const handleSaveProjectName = (e, oldProjectName) => {
    e.stopPropagation()
    
    const trimmedName = newProjectName.trim()
    if (!trimmedName) {
      alert('工程包名称不能为空')
      return
    }

    if (trimmedName === oldProjectName) {
      setEditingProjectName(null)
      return
    }

    // 检查新名称是否已存在
    const nameExists = savedProjects.some(p => p.projectName === trimmedName && p.projectName !== oldProjectName)
    if (nameExists) {
      alert('该工程包名称已存在，请使用其他名称')
      return
    }

    // 更新工程包列表
    const updatedProjects = savedProjects.map(p => {
      if (p.projectName === oldProjectName) {
        return { ...p, projectName: trimmedName }
      }
      return p
    })
    setSavedProjects(updatedProjects)
    localStorage.setItem('savedProjects', JSON.stringify(updatedProjects))

    // 如果修改的是当前项目，同步更新 currentProject
    const currentProject = localStorage.getItem('currentProject')
    if (currentProject) {
      const current = JSON.parse(currentProject)
      if (current.projectName === oldProjectName) {
        current.projectName = trimmedName
        localStorage.setItem('currentProject', JSON.stringify(current))
      }
    }

    setEditingProjectName(null)
    console.log('✅ 工程包名称已更新:', oldProjectName, '→', trimmedName)
  }

  // 取消编辑
  const handleCancelEditProjectName = (e) => {
    e.stopPropagation()
    setEditingProjectName(null)
    setNewProjectName('')
  }

  // 废弃的加载测试case函数
  const handleLoadTestCase = () => {}
  const handleDeleteTestCase = () => {}

  const selectedCount = selectedMedia.filter(m => m.selected).length

  return (
    <div className="media-selector-container">
      <div className="media-header" style={{ position: 'relative' }}>
        <button className="back-button" onClick={() => navigate('/')}>
          ←
        </button>
        <div className="header-title">选择素材</div>
        <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
          <button 
            className="project-button" 
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#667eea', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            工程包 ({savedProjects.length})
          </button>
          <button 
            className="confirm-button" 
            disabled={selectedCount === 0}
            onClick={handleConfirm}
          >
            创作 ({selectedCount})
          </button>
          
          {/* 工程包菜单 - 移到按钮容器内，使用相对定位 */}
          {/* 工程包菜单 - 移到按钮容器内，使用相对定位 */}
          {showProjectMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: '0',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: '320px',
              maxHeight: 'calc(100vh - 120px)',
              overflow: 'auto'
            }}>
              <div style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                工程包列表
              </div>
              {savedProjects.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  还没有保存的工程包<br />
                  <span style={{ fontSize: '12px' }}>在时间轴页面点击"导出"保存工程</span>
                </div>
              ) : (
                savedProjects.map(project => (
                  <div
                    key={project.projectName}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    onClick={() => handleLoadProject(project)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
                        {project.projectName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        方案: {project.currentScheme} | 保存于: {new Date(project.savedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.projectName)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="media-content">
        <div className="upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
          />
          <button className="upload-button" onClick={handleUploadClick}>
            <div className="upload-icon">📁</div>
            <div className="upload-text">选择图片或视频</div>
            <div className="upload-hint">支持多选</div>
          </button>
        </div>

        {selectedMedia.length > 0 && (
          <div className="selected-info">
            已添加 {selectedMedia.length} 个素材，点击选择需要编辑的内容
          </div>
        )}

        {selectedMedia.length > 0 && (
          <div className="media-grid">
            {selectedMedia.map((media, index) => (
              <div
                key={media.id}
                className={`media-item ${media.selected ? 'selected' : ''}`}
                onClick={() => toggleMediaSelection(media.id)}
              >
                {media.type === 'image' ? (
                  <img src={media.url} alt={media.name} className="media-preview" />
                ) : (
                  <video src={media.url} className="media-preview" />
                )}
                <div className="media-type-badge">
                  {media.type === 'image' ? '图片' : '视频'}
                </div>
                <div className="selection-indicator">✓</div>
              </div>
            ))}
          </div>
        )}

        {/* 工程包列表 - 显示在素材选择区域下方 */}
        {savedProjects.length > 0 && (
          <div className="projects-section">
            <div className="section-title-row">
              <div className="section-title">已保存的工程包</div>
              <button className="clear-all-btn" onClick={handleClearAllProjects}>
                清空全部
              </button>
            </div>
            <div className="projects-note">
              💡 提示：工程包保存的是编辑数据（轨道、方案等），但媒体文件需要重新选择才能预览播放
            </div>
            <div className="projects-list">
              {savedProjects.map(project => (
                <div
                  key={project.projectName}
                  className="project-card"
                  onClick={() => editingProjectName !== project.projectName && handleLoadProject(project)}
                >
                  <div className="project-info">
                    {editingProjectName === project.projectName ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          className="project-name-input"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveProjectName(e, project.projectName)
                            } else if (e.key === 'Escape') {
                              handleCancelEditProjectName(e)
                            }
                          }}
                        />
                        <div className="edit-actions">
                          <button
                            className="edit-save-btn"
                            onClick={(e) => handleSaveProjectName(e, project.projectName)}
                          >
                            ✓
                          </button>
                          <button
                            className="edit-cancel-btn"
                            onClick={handleCancelEditProjectName}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="project-name">{project.projectName}</div>
                        <div className="project-details">
                          方案: {project.currentScheme}
                        </div>
                        <div className="project-time">
                          {new Date(project.savedAt).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {editingProjectName !== project.projectName && (
                    <>
                      <button
                        className="project-edit-btn"
                        onClick={(e) => handleStartEditProjectName(e, project)}
                      >
                        ✏️
                      </button>
                      <button
                        className="project-delete-btn"
                        onClick={(e) => handleDeleteProject(e, project.projectName)}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MediaSelector
