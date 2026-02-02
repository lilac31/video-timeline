import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  const handleStartCreate = () => {
    navigate('/select')
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">视频时间线编辑器</h1>
        <p className="home-subtitle">创作你的精彩瞬间</p>
        
        <button className="start-button" onClick={handleStartCreate}>
          开始创作
        </button>

        <div className="feature-list">
          <div className="feature-item">
            <div className="feature-icon">📷</div>
            <div className="feature-text">图片编辑</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎬</div>
            <div className="feature-text">视频剪辑</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">✨</div>
            <div className="feature-text">特效滤镜</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
