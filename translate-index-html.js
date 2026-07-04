const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

const replacements = [
  // 1. Gesture HUD
  {
    from: "showGestureHUD('待命', 0, '把手放进视野');",
    to: "showGestureHUD('San sang', 0, 'Dat tay vao vung camera');"
  },
  // 2. Update panel strings
  {
    from: "updatePreviewState.hero = '当前版本，更新检测已就绪。';",
    to: "updatePreviewState.hero = 'Phiên bản hiện tại, kiểm tra cập nhật đã sẵn sàng.';"
  },
  {
    from: "updatePreviewState.hero = release.summary || (updatePreviewState.updateAvailable ? '发现新版本，建议更新。' : '当前版本，更新检测已就绪。');",
    to: "updatePreviewState.hero = release.summary || (updatePreviewState.updateAvailable ? 'Phát hiện phiên bản mới, khuyến nghị cập nhật.' : 'Phiên bản hiện tại, kiểm tra cập nhật đã sẵn sàng.');"
  },
  {
    from: "if (hero) hero.textContent = updatePreviewState.hero || '当前版本，更新检测已就绪。';",
    to: "if (hero) hero.textContent = updatePreviewState.hero || 'Phiên bản hiện tại, kiểm tra cập nhật đã sẵn sàng.';"
  },
  {
    from: "var notes = Array.isArray(updatePreviewState.notes) && updatePreviewState.notes.length ? updatePreviewState.notes : ['更新检测已就绪'];",
    to: "var notes = Array.isArray(updatePreviewState.notes) && updatePreviewState.notes.length ? updatePreviewState.notes : ['Kiểm tra cập nhật đã sẵn sàng'];"
  },
  {
    from: "parts.push('线路 ' + updatePreviewState.attempt + '/' + updatePreviewState.attempts);",
    to: "parts.push('Đường truyền ' + updatePreviewState.attempt + '/' + updatePreviewState.attempts);"
  },
  {
    from: "('已下载 ' + formatUpdateBytes(updatePreviewState.received))",
    to: "('Đã tải ' + formatUpdateBytes(updatePreviewState.received))"
  },
  {
    from: "parts.push('约 ' + updatePreviewState.etaSeconds + ' 秒');",
    to: "parts.push('Khoảng ' + updatePreviewState.etaSeconds + ' giây');"
  },
  {
    from: "if (isDownloading) label.textContent = (isPatch ? '快速补丁 ' : '正在下载 ') + Math.round(updatePreviewState.progress) + '%';",
    to: "if (isDownloading) label.textContent = (isPatch ? 'Bản vá nhanh ' : 'Đang tải ') + Math.round(updatePreviewState.progress) + '%';"
  },
  {
    from: "else if (isOpening) label.textContent = '正在打开安装包';",
    to: "else if (isOpening) label.textContent = 'Đang mở gói cài đặt';"
  },
  {
    from: "else if (isError && updatePreviewState.mode === 'patch' && updatePreviewState.downloadUrl) label.textContent = '下载完整安装包';",
    to: "else if (isError && updatePreviewState.mode === 'patch' && updatePreviewState.downloadUrl) label.textContent = 'Tải gói cài đặt đầy đủ';"
  },
  {
    from: "else if (isError) label.textContent = updatePreviewState.mode === 'installer' ? '重试下载' : '重试更新';",
    to: "else if (isError) label.textContent = updatePreviewState.mode === 'installer' ? 'Thử lại tải xuống' : 'Thử lại cập nhật';"
  },
  {
    from: "else if (isReady && isPatch && updatePreviewState.restartRequired) label.textContent = '重启生效';",
    to: "else if (isReady && isPatch && updatePreviewState.restartRequired) label.textContent = 'Khởi động lại để áp dụng';"
  },
  {
    from: "else if (isReady && isPatch) label.textContent = '补丁已应用';",
    to: "else if (isReady && isPatch) label.textContent = 'Bản vá đã được áp dụng';"
  },
  {
    from: "else if (isReady && updatePreviewState.installerOpened) label.textContent = '安装包已打开';",
    to: "else if (isReady && updatePreviewState.installerOpened) label.textContent = 'Gói cài đặt đã mở';"
  },
  {
    from: "else if (isReady && updatePreviewState.installerPath) label.textContent = updatePreviewState.cached ? '打开已下载安装包' : '打开安装包';",
    to: "else if (isReady && updatePreviewState.installerPath) label.textContent = updatePreviewState.cached ? 'Mở gói cài đặt đã tải' : 'Mở gói cài đặt';"
  },
  {
    from: "else if (isReady) label.textContent = updatePreviewState.configured ? '打开安装包' : '预览完成';",
    to: "else if (isReady) label.textContent = updatePreviewState.configured ? 'Mở gói cài đặt' : 'Xem trước hoàn tất';"
  },
  {
    from: "else label.textContent = updatePreviewState.patchAvailable ? '安装快速补丁' : ((canDownloadUpdate || canOpenRelease) ? '下载完整安装包' : '立即更新');",
    to: "else label.textContent = updatePreviewState.patchAvailable ? 'Cài đặt bản vá nhanh' : ((canDownloadUpdate || canOpenRelease) ? 'Tải gói cài đặt đầy đủ' : 'Cập nhật ngay');"
  },
  {
    from: "if (isDownloading) foot.textContent = (updatePreviewState.message || (isPatch ? '正在下载快速补丁' : '正在下载完整安装包')) + (updateProgressDetailText() ? ' · ' + updateProgressDetailText() : '');",
    to: "if (isDownloading) foot.textContent = (updatePreviewState.message || (isPatch ? 'Đang tải bản vá nhanh' : 'Đang tải gói cài đặt đầy đủ')) + (updateProgressDetailText() ? ' · ' + updateProgressDetailText() : '');"
  },
  {
    from: "else if (isError) foot.textContent = '下载失败：' + (updatePreviewState.errorReason || updatePreviewState.errorDetail || updatePreviewState.message || '请稍后重试') + (updatePreviewState.failedAttempts && updatePreviewState.failedAttempts.length ? ' · 已尝试 ' + updatePreviewState.failedAttempts.length + ' 条线路' : '');",
    to: "else if (isError) foot.textContent = 'Tải xuống thất bại: ' + (updatePreviewState.errorReason || updatePreviewState.errorDetail || updatePreviewState.message || 'Vui lòng thử lại sau') + (updatePreviewState.failedAttempts && updatePreviewState.failedAttempts.length ? ' · Đã thử ' + updatePreviewState.failedAttempts.length + ' đường truyền' : '');"
  },
  {
    from: "else if (isReady && isPatch) foot.textContent = updatePreviewState.restartRequired ? '快速补丁已应用，重启 Mineradio 后生效。' : '快速补丁已应用。';",
    to: "else if (isReady && isPatch) foot.textContent = updatePreviewState.restartRequired ? 'Bản vá nhanh đã áp dụng, sẽ có hiệu lực sau khi khởi động lại Mineradio.' : 'Bản vá nhanh đã áp dụng.';"
  },
  {
    from: "else if (isReady) foot.textContent = updatePreviewState.cached ? '已复用上次校验通过的安装包，不会重复下载。' : '安装包已准备好，点击按钮后再打开安装。';",
    to: "else if (isReady) foot.textContent = updatePreviewState.cached ? 'Đã sử dụng lại gói cài đặt được xác minh từ trước, không cần tải lại.' : 'Gói cài đặt đã sẵn sàng, click nút để mở và cài đặt.';"
  },
  {
    from: "else if (updatePreviewState.patchAvailable) foot.textContent = '优先使用轻量补丁，只更新缺失或变更的资源文件；不适用时可下载完整安装包。';",
    to: "else if (updatePreviewState.patchAvailable) foot.textContent = 'Ưu tiên sử dụng bản vá nhẹ, chỉ cập nhật các tệp tài nguyên bị thiếu hoặc thay đổi; có thể tải gói đầy đủ nếu không khả dụng.';"
  },
  {
    from: "else foot.textContent = updatePreviewState.updateAvailable ? '没有可用快速补丁时会下载完整安装包。' : '当前版本已是最新。';",
    to: "else foot.textContent = updatePreviewState.updateAvailable ? 'Sẽ tải xuống gói cài đặt đầy đủ nếu không có bản vá nhanh.' : 'Phiên bản hiện tại đã là mới nhất.';"
  },
  {
    from: "updatePreviewState.message = '正在下载完整安装包';",
    to: "updatePreviewState.message = 'Đang tải gói cài đặt đầy đủ';"
  },
  {
    from: "updatePreviewState.errorReason = (e && e.message) || '更新下载启动失败';",
    to: "updatePreviewState.errorReason = (e && e.message) || 'Khởi động tải xuống bản cập nhật thất bại';"
  },
  {
    from: "showToast('更新下载启动失败：' + updatePreviewState.errorReason);",
    to: "showToast('Khởi động tải xuống bản cập nhật thất bại: ' + updatePreviewState.errorReason);"
  },
  {
    from: "updatePreviewState.message = '正在下载快速补丁';",
    to: "updatePreviewState.message = 'Đang tải bản vá nhanh';"
  },
  {
    from: "updatePreviewState.errorReason = (e && e.message) || '快速补丁不可用';",
    to: "updatePreviewState.errorReason = (e && e.message) || 'Bản vá nhanh không khả dụng';"
  },
  {
    from: "showToast('快速补丁不可用，可手动下载完整安装包');",
    to: "showToast('Bản vá nhanh không khả dụng, có thể tải gói đầy đủ thủ công');"
  },
  {
    from: "updatePreviewState.errorReason = '更新下载状态读取失败';",
    to: "updatePreviewState.errorReason = 'Đọc trạng thái tải xuống bản cập nhật thất bại';"
  },
  {
    from: "showToast('更新下载状态读取失败');",
    to: "showToast('Đọc trạng thái tải xuống bản cập nhật thất bại');"
  },
  {
    from: "updatePreviewState.errorReason = '快速补丁状态读取失败';",
    to: "updatePreviewState.errorReason = 'Đọc trạng thái bản vá nhanh thất bại';"
  },
  {
    from: "showToast('快速补丁状态读取失败');",
    to: "showToast('Đọc trạng thái bản vá nhanh thất bại');"
  },
  {
    from: "updatePreviewState.errorReason = (job && (job.errorReason || job.message || job.error)) || '请稍后重试';",
    to: "updatePreviewState.errorReason = (job && (job.errorReason || job.message || job.error)) || 'Vui lòng thử lại sau';"
  },
  {
    from: "showToast('快速补丁失败，可手动下载完整安装包：' + updatePreviewState.errorReason);",
    to: "showToast('Bản vá nhanh thất bại, có thể tải gói đầy đủ thủ công: ' + updatePreviewState.errorReason);"
  },
  {
    from: "showToast('更新下载失败：' + updatePreviewState.errorReason);",
    to: "showToast('Tải xuống bản cập nhật thất bại: ' + updatePreviewState.errorReason);"
  },
  {
    from: "showToast(updatePreviewState.restartRequired ? '快速补丁已应用，重启后生效' : '快速补丁已应用');",
    to: "showToast(updatePreviewState.restartRequired ? 'Bản vá nhanh đã áp dụng, khởi động lại để có hiệu lực' : 'Bản vá nhanh đã áp dụng');"
  },
  {
    from: "showToast(updatePreviewState.cached ? '已复用上次下载的安装包' : '安装包已下载，点击按钮打开');",
    to: "showToast(updatePreviewState.cached ? 'Đã sử dụng lại gói cài đặt đã tải' : 'Gói cài đặt đã tải xuống, click nút để mở');"
  },
  {
    from: "showToast('请手动重启 Mineradio 让补丁生效');",
    to: "showToast('Vui lòng khởi động lại Mineradio thủ công để bản vá có hiệu lực');"
  },
  {
    from: "showToast('安装包已打开');",
    to: "showToast('Gói cài đặt đã mở');"
  },
  {
    from: "showToast('无法自动打开安装包，已尝试打开更新页面');",
    to: "showToast('Không thể tự động mở gói cài đặt, đã thử mở trang cập nhật');"
  },
  {
    from: "showToast('已打开更新页面');",
    to: "showToast('Đã mở trang cập nhật');"
  },
  {
    from: "showToast('这个版本还没有可用下载链接');",
    to: "showToast('Phiên bản này hiện chưa có liên kết tải xuống khả dụng');"
  },
  {
    from: "showToast('正式接入后将重启并安装新版');",
    to: "showToast('Sẽ khởi động lại và cài đặt phiên bản mới sau khi kết nối chính thức');"
  },

  // 3. FX Toasts & Controllers
  {
    from: "showToast(fx.desktopLyricsFps ? ('桌面歌词帧数 ' + fx.desktopLyricsFps) : '桌面歌词帧数无上限');",
    to: "showToast(fx.desktopLyricsFps ? ('Tốc độ khung hình lời bài hát màn hình: ' + fx.desktopLyricsFps) : 'Không giới hạn tốc độ khung hình lời bài hát màn hình');"
  },
  {
    from: "showToast('开发中，暂不可用');",
    to: "showToast('Đang phát triển, tạm thời chưa khả dụng');"
  },
  {
    from: "lyricPicker.addEventListener('change', function(){ showToast('歌词颜色: ' + normalizeHexColor(lyricPicker.value).toUpperCase()); });",
    to: "lyricPicker.addEventListener('change', function(){ showToast('Màu lời bài hát: ' + normalizeHexColor(lyricPicker.value).toUpperCase()); });"
  },
  {
    from: "lyricHighlightPicker.addEventListener('change', function(){ showToast('高亮颜色: ' + normalizeHexColor(lyricHighlightPicker.value).toUpperCase()); });",
    to: "lyricHighlightPicker.addEventListener('change', function(){ showToast('Màu nổi bật: ' + normalizeHexColor(lyricHighlightPicker.value).toUpperCase()); });"
  },
  {
    from: "lyricGlowPicker.addEventListener('change', function(){ showToast('溢光颜色: ' + normalizeHexColor(lyricGlowPicker.value).toUpperCase()); });",
    to: "lyricGlowPicker.addEventListener('change', function(){ showToast('Màu viền sáng: ' + normalizeHexColor(lyricGlowPicker.value).toUpperCase()); });"
  },
  {
    from: "uiAccentPicker.addEventListener('change', function(){ showToast('界面高亮: ' + normalizeHexColor(uiAccentPicker.value, '#00f5d4').toUpperCase()); });",
    to: "uiAccentPicker.addEventListener('change', function(){ showToast('Màu giao diện nổi bật: ' + normalizeHexColor(uiAccentPicker.value, '#00f5d4').toUpperCase()); });"
  },
  {
    from: "visualTintPicker.addEventListener('change', function(){ showToast('视觉主色: ' + normalizeHexColor(visualTintPicker.value).toUpperCase()); });",
    to: "visualTintPicker.addEventListener('change', function(){ showToast('Màu chủ đạo hình ảnh: ' + normalizeHexColor(visualTintPicker.value).toUpperCase()); });"
  },
  {
    from: "homeAccentPicker.addEventListener('change', function(){ showToast('Home 填充: ' + normalizeHexColor(homeAccentPicker.value).toUpperCase()); });",
    to: "homeAccentPicker.addEventListener('change', function(){ showToast('Màu đổ đầy Home: ' + normalizeHexColor(homeAccentPicker.value).toUpperCase()); });"
  },
  {
    from: "homeIconPicker.addEventListener('change', function(){ showToast('主页图标: ' + normalizeHexColor(homeIconPicker.value, '#f4d28a').toUpperCase()); });",
    to: "homeIconPicker.addEventListener('change', function(){ showToast('Màu icon trang chủ: ' + normalizeHexColor(homeIconPicker.value, '#f4d28a').toUpperCase()); });"
  },
  {
    from: "visualIconPicker.addEventListener('change', function(){ showToast('视觉图标: ' + normalizeHexColor(visualIconPicker.value, '#7fd8ff').toUpperCase()); });",
    to: "visualIconPicker.addEventListener('change', function(){ showToast('Màu icon hình ảnh: ' + normalizeHexColor(visualIconPicker.value, '#7fd8ff').toUpperCase()); });"
  },
  {
    from: "bgColorPicker.addEventListener('change', function(){ showToast('背景颜色: ' + normalizeHexColor(bgColorPicker.value, '#000000').toUpperCase()); });",
    to: "bgColorPicker.addEventListener('change', function(){ showToast('Màu nền: ' + normalizeHexColor(bgColorPicker.value, '#000000').toUpperCase()); });"
  },
  {
    from: "shelfAccentPicker.addEventListener('change', function(){ showToast('歌单架颜色: ' + shelfAccentHex().toUpperCase()); });",
    to: "shelfAccentPicker.addEventListener('change', function(){ showToast('Màu kệ 3D: ' + shelfAccentHex().toUpperCase()); });"
  },
  {
    from: "if (key === 'lyricGlow') showToast(fx.lyricGlow ? '歌词溢光已开启' : '歌词溢光已关闭');",
    to: "if (key === 'lyricGlow') showToast(fx.lyricGlow ? 'Đã bật viền sáng lời bài hát' : 'Đã tắt viền sáng lời bài hát');"
  },
  {
    from: "if (key === 'lyricGlowBeat') showToast(fx.lyricGlowBeat ? '歌词溢光跟随鼓点' : '歌词溢光已脱离鼓点');",
    to: "if (key === 'lyricGlowBeat') showToast(fx.lyricGlowBeat ? 'Viền sáng lời bài hát nhấp nháy theo beat' : 'Viền sáng lời bài hát không nhấp nháy theo beat');"
  },
  {
    from: "if (key === 'lyricGlowParticles') showToast(fx.lyricGlowParticles ? '歌词光粒已开启' : '歌词光粒已关闭');",
    to: "if (key === 'lyricGlowParticles') showToast(fx.lyricGlowParticles ? 'Đã bật hạt sáng lời bài hát' : 'Đã tắt hạt sáng lời bài hát');"
  },
  {
    from: "if (key === 'desktopLyrics') showToast(fx.desktopLyrics ? '桌面歌词已开启' : '桌面歌词已关闭');",
    to: "if (key === 'desktopLyrics') showToast(fx.desktopLyrics ? 'Đã bật lời bài hát trên màn hình' : 'Đã tắt lời bài hát trên màn hình');"
  },
  {
    from: "if (key === 'desktopLyricsClickThrough') showToast(fx.desktopLyricsClickThrough !== false ? '桌面歌词已锁定' : '桌面歌词可移动');",
    to: "if (key === 'desktopLyricsClickThrough') showToast(fx.desktopLyricsClickThrough !== false ? 'Lời bài hát màn hình đã bị khóa' : 'Lời bài hát màn hình có thể di chuyển');"
  },
  {
    from: "if (key === 'desktopLyricsCinema') showToast(fx.desktopLyricsCinema !== false ? '桌面歌词电影震动已开启' : '桌面歌词电影震动已关闭，基础漂浮保留');",
    to: "if (key === 'desktopLyricsCinema') showToast(fx.desktopLyricsCinema !== false ? 'Đã bật lời bài hát rung theo nhạc' : 'Đã tắt lời bài hát rung theo nhạc, giữ trôi nổi cơ bản');"
  },
  {
    from: "if (key === 'desktopLyricsHighlight') showToast(fx.desktopLyricsHighlight === true ? '桌面歌词高亮跟随已开启' : '桌面歌词高亮跟随已关闭');",
    to: "if (key === 'desktopLyricsHighlight') showToast(fx.desktopLyricsHighlight === true ? 'Đã bật lời bài hát màn hình tự động làm nổi bật' : 'Đã tắt lời bài hát màn hình tự động làm nổi bật');"
  },
  {
    from: "if (key === 'wallpaperMode') showToast(fx.wallpaperMode ? '壁纸模式已开启' : '壁纸模式已关闭');",
    to: "if (key === 'wallpaperMode') showToast(fx.wallpaperMode ? 'Đã bật chế độ hình nền' : 'Đã tắt chế độ hình nền');"
  },
  {
    from: "if (key === 'shelfShowPodcasts') showToast(fx.shelfShowPodcasts !== false ? '3D歌单架已显示播客歌单' : '3D歌单架已隐藏播客歌单');",
    to: "if (key === 'shelfShowPodcasts') showToast(fx.shelfShowPodcasts !== false ? 'Kệ 3D đã hiển thị danh sách podcast' : 'Kệ 3D đã ẩn danh sách podcast');"
  },
  {
    from: "if (key === 'shelfMergeCollections') showToast(fx.shelfMergeCollections === true ? '我的歌单与收藏歌单已合并滚动' : '收藏歌单恢复滚到底切页');",
    to: "if (key === 'shelfMergeCollections') showToast(fx.shelfMergeCollections === true ? 'Đã gộp cuộn danh sách phát của tôi và danh sách phát đã thích' : 'Danh sách phát đã thích trở lại chế độ phân trang khi cuộn đến cuối');"
  },
  {
    from: "if (key === 'liveBackgroundKeep') showToast(fx.liveBackgroundKeep ? '直播后台保持已开启' : '直播后台保持已关闭');",
    to: "if (key === 'liveBackgroundKeep') showToast(fx.liveBackgroundKeep ? 'Đã bật duy trì nền trực tiếp' : 'Đã tắt duy trì nền trực tiếp');"
  },
  {
    from: "if (key === 'lyricCameraLock') showToast(fx.lyricCameraLock ? '歌词已绑定镜头' : '歌词已恢复自由漂浮');",
    to: "if (key === 'lyricCameraLock') showToast(fx.lyricCameraLock ? 'Lời bài hát đã được gắn vào camera' : 'Lời bài hát đã khôi phục trôi nổi tự do');"
  },
  {
    from: "if (key === 'bloom') showToast(fx.bloom ? '溢光已开启' : '溢光已关闭');",
    to: "if (key === 'bloom') showToast(fx.bloom ? 'Đã bật hiệu ứng tỏa sáng (Bloom)' : 'Đã tắt hiệu ứng tỏa sáng (Bloom)');"
  },
  {
    from: "if (key === 'edge') showToast(fx.edge ? '已开启轮廓高亮' : '已关闭轮廓高亮');",
    to: "if (key === 'edge') showToast(fx.edge ? 'Đã bật nổi bật viền' : 'Đã tắt nổi bật viền');"
  },
  {
    from: "if (key === 'cinema') showToast(fx.cinema ? '已开启电影镜头' : '已关闭电影镜头');",
    to: "if (key === 'cinema') showToast(fx.cinema ? 'Đã bật camera điện ảnh' : 'Đã tắt camera điện ảnh');"
  },
  {
    from: "showToast(fx.aiDepth ? '已开启后台 AI 立体增强' : '已关闭 AI 立体增强, 使用轻量弧面');",
    to: "showToast(fx.aiDepth ? 'Đã bật tăng cường chiều sâu 3D bằng AI' : 'Đã tắt tăng cường chiều sâu 3D bằng AI, sử dụng bề mặt cong nhẹ');"
  },
  {
    from: "showToast('开启 DIY 玩家模式后可打开视觉控制台');",
    to: "showToast('Bật chế độ DIY để mở bảng điều khiển hình ảnh');"
  },

  // 4. Hotkeys Modal Strings
  {
    from: '<button class="hotkey-close" type="button" data-hotkey-close aria-label="关闭">×</button>',
    to: '<button class="hotkey-close" type="button" data-hotkey-close aria-label="Đóng">×</button>'
  },
  {
    from: '<div class="hotkey-tabs"><button type="button" data-hotkey-scope="local" class="active">局内热键</button><button type="button" data-hotkey-scope="global">全局热键</button></div>',
    to: '<div class="hotkey-tabs"><button type="button" data-hotkey-scope="local" class="active">Phím tắt ứng dụng</button><button type="button" data-hotkey-scope="global">Phím tắt toàn cục</button></div>'
  },
  {
    from: '<div class="hotkey-note">按 Backspace / Delete 可清空当前功能热键</div>',
    to: '<div class="hotkey-note">Nhấn Backspace / Delete để xóa phím tắt hiện tại</div>'
  },
  {
    from: '<div class="hotkey-capture-tip" id="hotkey-capture-tip">正在录入组合键，按 Esc 取消。</div>',
    to: '<div class="hotkey-capture-tip" id="hotkey-capture-tip">Đang ghi nhận tổ hợp phím, nhấn Esc để hủy.</div>'
  },
  {
    from: "if (!binding) return '<span class=\"hotkey-status\">未设置</span>';",
    to: "if (!binding) return '<span class=\"hotkey-status\">Chưa thiết lập</span>';"
  },
  {
    from: "if (duplicate && duplicate[binding] > 1) return '<span class=\"hotkey-status conflict\"><span class=\"source-icon\">!</span>Mineradio 内部重复</span>';",
    to: "if (duplicate && duplicate[binding] > 1) return '<span class=\"hotkey-status conflict\"><span class=\"source-icon\">!</span>Trùng lặp Mineradio</span>';"
  },
  {
    from: "if (scope === 'local') return '<span class=\"hotkey-status ok\">可用</span>';",
    to: "if (scope === 'local') return '<span class=\"hotkey-status ok\">Khả dụng</span>';"
  },
  {
    from: "if (!status) return '<span class=\"hotkey-status\">待检测</span>';",
    to: "if (!status) return '<span class=\"hotkey-status\">Chờ kiểm tra</span>';"
  },
  {
    from: "if (status.ok) return '<span class=\"hotkey-status ok\">可用</span>';",
    to: "if (status.ok) return '<span class=\"hotkey-status ok\">Khả dụng</span>';"
  },
  {
    from: "var source = status.conflict && status.conflict.sourceName || '系统 / 其他软件';",
    to: "var source = status.conflict && status.conflict.sourceName || 'Hệ thống / Phần mềm khác';"
  },
  {
    from: "escHtml(hotkeyCaptureState && hotkeyCaptureState.scope === scope && hotkeyCaptureState.action === action.key ? '按下组合键...' : formatHotkey(binding))",
    to: "escHtml(hotkeyCaptureState && hotkeyCaptureState.scope === scope && hotkeyCaptureState.action === action.key ? 'Nhấn tổ hợp phím...' : formatHotkey(binding))"
  },
  {
    from: "data-hotkey-action=\"' + action.key + '\">默认</button>'",
    to: "data-hotkey-action=\"' + action.key + '\">Mặc định</button>'"
  },
  {
    from: '<div class="hotkey-dialog" role="dialog" aria-modal="true" aria-label="热键设置">',
    to: '<div class="hotkey-dialog" role="dialog" aria-modal="true" aria-label="Cài đặt phím tắt">'
  },
  {
    from: '<div class="hotkey-title">热键设置</div>',
    to: '<div class="hotkey-title">Cài đặt phím tắt</div>'
  },
  {
    from: '<div class="hotkey-sub">局内热键只在 Mineradio 窗口内生效；全局热键会向系统注册，并检测是否被占用。</div>',
    to: '<div class="hotkey-sub">Phím tắt trong ứng dụng chỉ có hiệu lực bên trong cửa sổ Mineradio; Phím tắt toàn cục sẽ đăng ký với hệ thống và kiểm tra xem có bị trùng lặp hay không.</div>'
  },

  // 5. VIP Mapping & User Meta
  {
    from: "var displayName = (provider === 'qq' && st.preview) ? '待接入' : (st.nickname || meta.label);",
    to: "var displayName = (provider === 'spotify' && st.preview) ? 'Chờ kết nối' : (st.nickname || meta.label);"
  },
  {
    from: "s.setAttribute('aria-label', '点击进入 Mineradio');",
    to: "s.setAttribute('aria-label', 'Click để vào Mineradio');"
  },

  // 6. HOTKEY_ACTIONS definition translations
  {
    from: "{ key:'togglePlay', label:'播放 / 暂停', category:'播放', local:'Space', global:'Ctrl+Alt+Space' },",
    to: "{ key:'togglePlay', label:'Phát / Tạm dừng', category:'Bộ phát', local:'Space', global:'Ctrl+Alt+Space' },"
  },
  {
    from: "{ key:'prevTrack', label:'上一首', category:'播放', local:'ArrowLeft', global:'Ctrl+Alt+ArrowLeft' },",
    to: "{ key:'prevTrack', label:'Bài trước', category:'Bộ phát', local:'ArrowLeft', global:'Ctrl+Alt+ArrowLeft' },"
  },
  {
    from: "{ key:'nextTrack', label:'下一首', category:'播放', local:'ArrowRight', global:'Ctrl+Alt+ArrowRight' },",
    to: "{ key:'nextTrack', label:'Bài tiếp theo', category:'Bộ phát', local:'ArrowRight', global:'Ctrl+Alt+ArrowRight' },"
  },
  {
    from: "{ key:'volumeUp', label:'音量增加', category:'音量', local:'ArrowUp', global:'Ctrl+Alt+ArrowUp' },",
    to: "{ key:'volumeUp', label:'Tăng âm lượng', category:'Âm lượng', local:'ArrowUp', global:'Ctrl+Alt+ArrowUp' },"
  },
  {
    from: "{ key:'volumeDown', label:'音量降低', category:'音量', local:'ArrowDown', global:'Ctrl+Alt+ArrowDown' },",
    to: "{ key:'volumeDown', label:'Giảm âm lượng', category:'Âm lượng', local:'ArrowDown', global:'Ctrl+Alt+ArrowDown' },"
  },
  {
    from: "{ key:'toggleFullscreen', label:'全屏', category:'窗口', local:'KeyF', global:'Ctrl+Alt+KeyF' },",
    to: "{ key:'toggleFullscreen', label:'Toàn màn hình', category:'Cửa sổ', local:'KeyF', global:'Ctrl+Alt+KeyF' },"
  },
  {
    from: "{ key:'toggleDesktopLyrics', label:'桌面歌词', category:'歌词', local:'Alt+KeyL', global:'Ctrl+Alt+KeyL' }",
    to: "{ key:'toggleDesktopLyrics', label:'Lời bài hát màn hình', category:'Lời bài hát', local:'Alt+KeyL', global:'Ctrl+Alt+KeyL' }"
  }
];

let appliedCount = 0;
for (const r of replacements) {
  if (content.includes(r.from)) {
    content = content.replace(new RegExp(escapeRegExp(r.from), 'g'), r.to);
    appliedCount++;
  } else {
    console.log('Not found:', r.from);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

fs.writeFileSync('public/index.html', content, 'utf8');
console.log(`Translation applied successfully. Total replacements: ${appliedCount}/${replacements.length}`);
