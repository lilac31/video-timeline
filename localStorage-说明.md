# localStorage 跨端口访问说明

## ✅ 端口号不影响数据访问

### 原理解释：

1. **localStorage 存储机制**
   - localStorage 是基于 **协议 + 域名** 存储的
   - 不是基于端口号存储的

2. **实际存储位置**
   - `http://localhost:3003` 和 `http://localhost:3004` 共享同一个 localStorage
   - 它们的存储 key 都是：`http://localhost`
   - 端口号被浏览器忽略

3. **结论**
   - ✅ 在 3003 保存的工程文件，在 3004 完全可以访问
   - ✅ 在 3004 保存的工程文件，在 3003 也完全可以访问
   - ✅ 在任意端口保存的数据都存储在同一个地方

### 测试验证：

```javascript
// 在 localhost:3003 中执行
localStorage.setItem('test', 'hello from 3003')

// 在 localhost:3004 中执行
console.log(localStorage.getItem('test'))  // 输出: "hello from 3003"
```

### 注意事项：

1. **仅限同一台电脑**
   - localStorage 存储在本地浏览器中
   - 不会跨设备同步

2. **浏览器隔离**
   - Chrome 的 localStorage 和 Safari 的 localStorage 是独立的
   - 同一浏览器的不同端口共享数据

3. **清除数据**
   - 如果清除浏览器缓存，所有端口的数据都会丢失
   - 建议定期导出重要项目

## 项目中的数据持久化

### 当前实现：

1. **自动保存**
   - 项目数据自动保存到 `localStorage.currentProject`
   - 包括：媒体数据、轨道、方案、标记点等

2. **工程包列表**
   - 保存到 `localStorage.savedProjects`
   - 最多保存 10 个项目

3. **方案管理**
   - 5 个方案的数据都保存在项目中
   - 方案名称、标记点都会持久化

### 推荐做法：

- 重要项目记得点击"导出"按钮保存
- 虽然端口不影响访问，但建议使用同一个端口
- 定期备份重要项目数据
