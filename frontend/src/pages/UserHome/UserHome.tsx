import Header from "@/components/Header/Header";
import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Input,
  Upload,
  Tabs,
  Progress,
  Statistic,
  Row,
  Col,
  Switch,
  message,
  Modal,
  Form,
} from "antd";
import {
  UserOutlined,
  EditOutlined,
  CameraOutlined,
  MailOutlined,
  LockOutlined,
  BellOutlined,
  SafetyOutlined,
  TrophyOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  FireOutlined,
  SettingOutlined,
  HistoryOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { Timeline, Tag, DatePicker, Empty } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { getUser } from "@/utils/auth";
import "./UserHome.css";

interface UserStats {
  totalCheckIns: number;
  currentStreak: number;
  longestStreak: number;
  totalTasks: number;
  completedTasks: number;
  totalThoughts: number;
}

interface UserProfile {
  username: string;
  email: string;
  avatar: string;
  bio: string;
  joinDate: string;
}

interface CheckInRecord {
  id: number;
  date: string;
  tasks: {
    id: number;
    title: string;
    completed: boolean;
    color: string;
  }[];
  thought?: string;
  attachments?: string[];
}

// 模拟历史打卡数据
const mockCheckInHistory: CheckInRecord[] = [
  {
    id: 1,
    date: "2026-02-05",
    tasks: [
      { id: 1, title: "完成项目文档", completed: true, color: "#f5a623" },
      { id: 2, title: "代码审查", completed: true, color: "#f5a623" },
      { id: 3, title: "团队会议", completed: false, color: "#1890ff" },
    ],
    thought: "今天效率很高，完成了大部分任务！",
  },
  {
    id: 2,
    date: "2026-02-04",
    tasks: [
      {
        id: 4,
        title: "学习 React 18 新特性",
        completed: true,
        color: "#52c41a",
      },
      { id: 5, title: "写技术博客", completed: true, color: "#722ed1" },
    ],
    thought: "学到了很多新知识，感觉收获满满。",
  },
  {
    id: 3,
    date: "2026-02-03",
    tasks: [
      { id: 6, title: "健身打卡", completed: true, color: "#eb2f96" },
      { id: 7, title: "阅读30分钟", completed: true, color: "#fa8c16" },
      { id: 8, title: "整理笔记", completed: true, color: "#13c2c2" },
    ],
    thought: "坚持运动和阅读，保持好习惯！",
  },
  {
    id: 4,
    date: "2026-02-02",
    tasks: [
      { id: 9, title: "项目需求评审", completed: true, color: "#1890ff" },
      { id: 10, title: "修复 Bug", completed: true, color: "#ff4d4f" },
    ],
  },
  {
    id: 5,
    date: "2026-02-01",
    tasks: [
      { id: 11, title: "制定月计划", completed: true, color: "#667eea" },
      { id: 12, title: "整理工作区", completed: true, color: "#52c41a" },
    ],
    thought: "新的一月开始了，加油！",
  },
];

export default function UserHome() {
  const user = getUser();

  const [profile, setProfile] = useState<UserProfile>({
    username: user?.username || "用户",
    email: "user@example.com",
    avatar: "/uploads/default/a.jpg",
    bio: "这个人很懒，什么都没写~",
    joinDate: "2026-01-01",
  });

  const [stats] = useState<UserStats>({
    totalCheckIns: 45,
    currentStreak: 22,
    longestStreak: 30,
    totalTasks: 128,
    completedTasks: 96,
    totalThoughts: 38,
  });

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();

  // 通知设置
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    taskComplete: true,
    aiSuggestions: false,
    weeklyReport: true,
  });

  // 编辑个人资料
  const handleEditProfile = () => {
    editForm.setFieldsValue({
      username: profile.username,
      email: profile.email,
      bio: profile.bio,
    });
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      const values = await editForm.validateFields();
      setProfile({ ...profile, ...values });
      setIsEditModalVisible(false);
      message.success("资料更新成功！");
    } catch {
      // 表单验证失败
    }
  };

  // 上传头像
  const handleAvatarUpload = (info: any) => {
    if (info.file.status === "done") {
      setProfile({
        ...profile,
        avatar: info.file.response?.url || profile.avatar,
      });
      message.success("头像上传成功！");
    }
  };

  // 计算完成率
  const completionRate = Math.round(
    (stats.completedTasks / stats.totalTasks) * 100,
  );

  // 历史记录
  const [historyData] = useState<CheckInRecord[]>(mockCheckInHistory);
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [expandedRecords, setExpandedRecords] = useState<number[]>([]);

  // 按月筛选历史记录
  const filteredHistory = historyData.filter((record) => {
    const recordDate = dayjs(record.date);
    return (
      recordDate.month() === selectedMonth.month() &&
      recordDate.year() === selectedMonth.year()
    );
  });

  // 展开/收起记录详情
  const toggleRecordExpand = (id: number) => {
    setExpandedRecords((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // 计算某条记录的完成率
  const getRecordCompletionRate = (record: CheckInRecord) => {
    const completed = record.tasks.filter((t) => t.completed).length;
    return Math.round((completed / record.tasks.length) * 100);
  };

  const tabItems = [
    {
      key: "overview",
      label: (
        <span>
          <UserOutlined />
          概览
        </span>
      ),
      children: (
        <div className="tab-content">
          {/* 统计卡片 */}
          <div className="stats-section">
            <h3 className="section-title">📊 我的数据</h3>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} md={6}>
                <Card className="stat-card streak-card">
                  <Statistic
                    title="当前连续打卡"
                    value={stats.currentStreak}
                    suffix="天"
                    prefix={<FireOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="总打卡天数"
                    value={stats.totalCheckIns}
                    suffix="天"
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="最长连续"
                    value={stats.longestStreak}
                    suffix="天"
                    prefix={<TrophyOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={8} md={6}>
                <Card className="stat-card">
                  <Statistic
                    title="感想记录"
                    value={stats.totalThoughts}
                    suffix="篇"
                    prefix={<EditOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          </div>

          {/* 任务完成进度 */}
          <div className="progress-section">
            <h3 className="section-title">✅ 任务完成情况</h3>
            <Card className="progress-card">
              <div className="progress-info">
                <div className="progress-text">
                  <span className="completed">{stats.completedTasks}</span>
                  <span className="separator">/</span>
                  <span className="total">{stats.totalTasks}</span>
                  <span className="label">个任务已完成</span>
                </div>
                <div className="progress-percentage">{completionRate}%</div>
              </div>
              <Progress
                percent={completionRate}
                strokeColor={{
                  "0%": "#667eea",
                  "100%": "#764ba2",
                }}
                trailColor="#f0f0f0"
                strokeWidth={12}
                showInfo={false}
              />
              <div className="progress-tip">
                {completionRate >= 80
                  ? "🎉 太棒了！继续保持！"
                  : completionRate >= 50
                    ? "💪 做得不错，再接再厉！"
                    : "🚀 加油，你可以的！"}
              </div>
            </Card>
          </div>

          {/* 成就徽章 */}
          <div className="achievements-section">
            <h3 className="section-title">🏆 成就徽章</h3>
            <div className="achievements-grid">
              <div className="achievement-item unlocked">
                <div className="achievement-icon">🔥</div>
                <div className="achievement-name">初次打卡</div>
              </div>
              <div className="achievement-item unlocked">
                <div className="achievement-icon">⚡</div>
                <div className="achievement-name">连续7天</div>
              </div>
              <div className="achievement-item unlocked">
                <div className="achievement-icon">🌟</div>
                <div className="achievement-name">连续30天</div>
              </div>
              <div className="achievement-item locked">
                <div className="achievement-icon">💎</div>
                <div className="achievement-name">连续100天</div>
              </div>
              <div className="achievement-item unlocked">
                <div className="achievement-icon">📝</div>
                <div className="achievement-name">首篇感想</div>
              </div>
              <div className="achievement-item locked">
                <div className="achievement-icon">🎯</div>
                <div className="achievement-name">任务达人</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "history",
      label: (
        <span>
          <HistoryOutlined />
          历史记录
        </span>
      ),
      children: (
        <div className="tab-content history-tab">
          {/* 月份选择器 */}
          <div className="history-header">
            <h3 className="section-title">📅 打卡历史</h3>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(date) => date && setSelectedMonth(date)}
              allowClear={false}
              format="YYYY年MM月"
            />
          </div>

          {/* 历史记录列表 */}
          {filteredHistory.length === 0 ? (
            <Empty
              description="本月暂无打卡记录"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Timeline
              className="history-timeline"
              items={filteredHistory.map((record) => ({
                color:
                  getRecordCompletionRate(record) === 100 ? "green" : "blue",
                dot: (
                  <div className="timeline-dot">
                    {getRecordCompletionRate(record) === 100 ? (
                      <CheckCircleOutlined style={{ color: "#52c41a" }} />
                    ) : (
                      <ClockCircleOutlined style={{ color: "#1890ff" }} />
                    )}
                  </div>
                ),
                children: (
                  <Card
                    className={`history-card ${expandedRecords.includes(record.id) ? "expanded" : ""}`}
                    onClick={() => toggleRecordExpand(record.id)}
                  >
                    <div className="history-card-header">
                      <div className="history-date">
                        <span className="date-day">
                          {dayjs(record.date).format("DD")}
                        </span>
                        <span className="date-weekday">
                          {dayjs(record.date).format("ddd")}
                        </span>
                      </div>
                      <div className="history-summary">
                        <div className="task-summary">
                          <CheckCircleOutlined />
                          <span>
                            {record.tasks.filter((t) => t.completed).length}/
                            {record.tasks.length} 任务完成
                          </span>
                          <Progress
                            percent={getRecordCompletionRate(record)}
                            size="small"
                            strokeColor={
                              getRecordCompletionRate(record) === 100
                                ? "#52c41a"
                                : "#1890ff"
                            }
                            showInfo={false}
                            style={{ width: 80 }}
                          />
                        </div>
                        {record.thought && (
                          <div className="thought-preview">
                            <FileTextOutlined />
                            <span>
                              {record.thought.length > 20
                                ? record.thought.slice(0, 20) + "..."
                                : record.thought}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 展开的详细内容 */}
                    {expandedRecords.includes(record.id) && (
                      <div className="history-card-detail">
                        <div className="detail-section">
                          <h4>📋 任务列表</h4>
                          <div className="task-list">
                            {record.tasks.map((task) => (
                              <div
                                key={task.id}
                                className={`task-item ${task.completed ? "completed" : ""}`}
                              >
                                <span
                                  className="task-color"
                                  style={{ backgroundColor: task.color }}
                                ></span>
                                <span className="task-title">{task.title}</span>
                                {task.completed && (
                                  <Tag color="success" className="task-tag">
                                    已完成
                                  </Tag>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {record.thought && (
                          <div className="detail-section">
                            <h4>✍️ 每日感想</h4>
                            <div className="thought-content">
                              {record.thought}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ),
              }))}
            />
          )}
        </div>
      ),
    },
    {
      key: "settings",
      label: (
        <span>
          <SettingOutlined />
          设置
        </span>
      ),
      children: (
        <div className="tab-content settings-tab">
          {/* 通知设置 */}
          <Card className="settings-card" title="🔔 通知设置">
            <div className="setting-item">
              <div className="setting-info">
                <BellOutlined className="setting-icon" />
                <div>
                  <div className="setting-title">每日提醒</div>
                  <div className="setting-desc">每天早上9点提醒你打卡</div>
                </div>
              </div>
              <Switch
                checked={notifications.dailyReminder}
                onChange={(checked) =>
                  setNotifications({ ...notifications, dailyReminder: checked })
                }
              />
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <CheckCircleOutlined className="setting-icon" />
                <div>
                  <div className="setting-title">任务完成通知</div>
                  <div className="setting-desc">完成任务时显示通知</div>
                </div>
              </div>
              <Switch
                checked={notifications.taskComplete}
                onChange={(checked) =>
                  setNotifications({ ...notifications, taskComplete: checked })
                }
              />
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <SafetyOutlined className="setting-icon" />
                <div>
                  <div className="setting-title">AI 建议推送</div>
                  <div className="setting-desc">接收 AI 助手的计划建议</div>
                </div>
              </div>
              <Switch
                checked={notifications.aiSuggestions}
                onChange={(checked) =>
                  setNotifications({ ...notifications, aiSuggestions: checked })
                }
              />
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <MailOutlined className="setting-icon" />
                <div>
                  <div className="setting-title">周报邮件</div>
                  <div className="setting-desc">每周发送一份总结报告到邮箱</div>
                </div>
              </div>
              <Switch
                checked={notifications.weeklyReport}
                onChange={(checked) =>
                  setNotifications({ ...notifications, weeklyReport: checked })
                }
              />
            </div>
          </Card>

          {/* 账号安全 */}
          <Card className="settings-card" title="🔐 账号安全">
            <div className="setting-item clickable">
              <div className="setting-info">
                <LockOutlined className="setting-icon" />
                <div>
                  <div className="setting-title">修改密码</div>
                  <div className="setting-desc">定期修改密码更安全</div>
                </div>
              </div>
              <Button type="link">修改</Button>
            </div>
            <div className="setting-item clickable">
              <div className="setting-info">
                <MailOutlined className="setting-icon" />
                <div>
                  <div className="setting-title">绑定邮箱</div>
                  <div className="setting-desc">{profile.email}</div>
                </div>
              </div>
              <Button type="link">更换</Button>
            </div>
          </Card>

          {/* 危险操作 */}
          <Card className="settings-card danger-card" title="⚠️ 危险操作">
            <div className="setting-item">
              <div className="setting-info">
                <div>
                  <div className="setting-title danger-text">注销账号</div>
                  <div className="setting-desc">
                    删除账号及所有数据，此操作不可恢复
                  </div>
                </div>
              </div>
              <Button danger>注销</Button>
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="user-home-container">
      <Header />
      <div className="user-home-content">
        {/* 用户信息卡片 */}
        <div className="profile-section">
          <Card className="profile-card">
            <div className="profile-header">
              <div className="avatar-wrapper">
                <Avatar
                  size={100}
                  src={profile.avatar}
                  icon={<UserOutlined />}
                />
                <Upload
                  name="avatar"
                  showUploadList={false}
                  action="/api/upload/avatar"
                  onChange={handleAvatarUpload}
                >
                  <div className="avatar-upload-btn">
                    <CameraOutlined />
                  </div>
                </Upload>
              </div>
              <div className="profile-info">
                <h2 className="username">{profile.username}</h2>
                <p className="bio">{profile.bio}</p>
                <div className="join-date">
                  <CalendarOutlined /> 加入于 {profile.joinDate}
                </div>
              </div>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEditProfile}
                className="edit-btn"
              >
                编辑资料
              </Button>
            </div>

            {/* 快速统计 */}
            <div className="quick-stats">
              <div className="quick-stat-item">
                <div className="stat-value">{stats.currentStreak}</div>
                <div className="stat-label">连续打卡</div>
              </div>
              <div className="divider"></div>
              <div className="quick-stat-item">
                <div className="stat-value">{stats.completedTasks}</div>
                <div className="stat-label">完成任务</div>
              </div>
              <div className="divider"></div>
              <div className="quick-stat-item">
                <div className="stat-value">{stats.totalThoughts}</div>
                <div className="stat-label">感想记录</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs 区域 */}
        <div className="tabs-section">
          <Tabs items={tabItems} defaultActiveKey="overview" />
        </div>
      </div>

      {/* 编辑资料弹窗 */}
      <Modal
        title="编辑个人资料"
        open={isEditModalVisible}
        onOk={handleSaveProfile}
        onCancel={() => setIsEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
        className="edit-modal"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效的邮箱地址" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="bio" label="个人简介">
            <Input.TextArea
              placeholder="介绍一下自己吧..."
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
