# 自动生成数据库模型脚本
# 使用方式: .\scripts\gen_models.ps1

Write-Host "🚀 开始生成数据库模型..." -ForegroundColor Green

# 确保安装了 gorm.io/gen
Write-Host "📦 检查并安装依赖..." -ForegroundColor Yellow
go get -u gorm.io/gen
go get -u gorm.io/gen/field

# 运行生成器
Write-Host "⚙️  运行模型生成器..." -ForegroundColor Yellow
go run cmd/gen/main.go

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 模型生成成功！" -ForegroundColor Green
    Write-Host "📁 文件位置: internal/models/" -ForegroundColor Cyan
} else {
    Write-Host "❌ 模型生成失败，请检查错误信息" -ForegroundColor Red
    exit 1
}
