package config

type Config struct {
	App        App        `mapstructure:"app"`
	Server     Server     `mapstructure:"server"`
	Database   Database   `mapstructure:"database"`
	Log        Log        `mapstructure:"log"`
	Auth       Auth       `mapstructure:"auth"`
	Middleware Middleware `mapstructure:"middleware"`
	SMTP       SMTP       `mapstructure:"smtp"`
	Email      Email      `mapstructure:"email"`
	OAuth      OAuth      `mapstructure:"oauth"`
}

// App 信息
type App struct {
	Env     string `mapstructure:"env"`
	Name    string `mapstructure:"name"`
	Version string `mapstructure:"version"`
	Debug   bool   `mapstructure:"debug"`
	Url     string `mapstructure:"url"`
}

// Server 服务器配置
type Server struct {
	Addr string `mapstructure:"addr"`
	Port string `mapstructure:"port"`
}

// Database 数据库配置
type Database struct {
	Pgsql Pgsql `mapstructure:"pgsql"`
	Redis Redis `mapstructure:"redis"`
}

// Pgsql pgsql配置
type Pgsql struct {
	Host            string `mapstructure:"host"`
	Port            string `mapstructure:"port"`
	User            string `mapstructure:"user"`
	Password        string `mapstructure:"password"`
	DBName          string `mapstructure:"dbname"`
	SSLMode         string `mapstructure:"sslmode"`
	MaxOpenConns    int    `mapstructure:"max_open_conns"`
	MaxIdleConns    int    `mapstructure:"max_idle_conns"`
	ConnMaxLifetime string `mapstructure:"conn_max_lifetime"`
}

// Redis redis配置
type Redis struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

// Log 日志配置
type Log struct {
	Level  string  `mapstructure:"level"`
	Format string  `mapstructure:"format"`
	Output string  `mapstructure:"output"`
	File   LogFile `mapstructure:"file"`
}

// LogFile 日志文件配置
type LogFile struct {
	Path       string `mapstructure:"path"`
	MaxSize    int    `mapstructure:"max_size"`
	MaxBackups int    `mapstructure:"max_backups"`
	MaxAge     int    `mapstructure:"max_age"`
}

// Auth 验证配置
type Auth struct {
	JWT JWT `mapstructure:"jwt"`
}

// JWT jwt配置
type JWT struct {
	Secret        string `mapstructure:"secret"`
	AccessExpire  string `mapstructure:"access_expire"`
	RefreshExpire string `mapstructure:"refresh_expire"`
}

// Middleware 中间件配置
type Middleware struct {
	CORS CORS `mapstructure:"cors"`
}

// CORS 跨域配置
type CORS struct {
	Enabled            bool     `mapstructure:"enabled"`
	AllowedOrigins     []string `mapstructure:"allowed_origins"`
	AllowedMethods     []string `mapstructure:"allowed_methods"`
	AllowedHeaders     []string `mapstructure:"allowed_headers"`
	AllowedCredentials bool     `mapstructure:"allowed_credentials"`
}

type SMTP struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	Email    string `mapstructure:"email"`
	Password string `mapstructure:"password"`
}

// Email 异步邮件发送配置
type Email struct {
	QueueSize      int    `mapstructure:"queue_size"`
	Workers        int    `mapstructure:"workers"`
	EnqueueTimeout string `mapstructure:"enqueue_timeout"`
	MaxAttempts    int    `mapstructure:"max_attempts"`
	SendTimeout    string `mapstructure:"send_timeout"`
}

// OAuth 第三方登录配置
type OAuth struct {
	Github Github `mapstructure:"github"`
	Google Google `mapstructure:"google"`
}

type Github struct {
	ClientID     string `mapstructure:"client_id"`
	ClientSecret string `mapstructure:"client_secret"`
	RedirectURL  string `mapstructure:"redirect_url"`
}

type Google struct {
	ClientID     string   `mapstructure:"client_id"`
	ClientSecret string   `mapstructure:"client_secret"`
	RedirectURL  string   `mapstructure:"redirect_url"`
	Scopes       []string `mapstructure:"scopes"`
}
