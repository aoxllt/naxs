import Header from "@/components/Header/Header";
import {
  Calendar,
  Input,
  Button,
  Checkbox,
  Upload,
  message,
  Modal,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import "./Home.css";
import { useState, useMemo } from "react";
import {
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  UploadOutlined,
  PictureOutlined,
  FileOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import type { PlanItem, AiSuggestion } from "../../api/api";

dayjs.locale("zh-cn");

// 模拟按日期存储的任务数据
const mockPlansByDate: Record<string, PlanItem[]> = {
  "2026-02-05": [
    {
      id: 1,
      title: "完成项目文档",
      completed: false,
      color: "#f5a623",
      date: "2026-02-05",
    },
    {
      id: 2,
      title: "代码审查",
      completed: true,
      color: "#f5a623",
      date: "2026-02-05",
    },
  ],
  "2026-02-06": [
    {
      id: 3,
      title: "团队会议",
      completed: false,
      color: "#1890ff",
      date: "2026-02-06",
    },
    {
      id: 4,
      title: "学习新技术",
      completed: false,
      color: "#52c41a",
      date: "2026-02-06",
    },
  ],
  "2026-02-10": [
    {
      id: 5,
      title: "项目评审",
      completed: false,
      color: "#722ed1",
      date: "2026-02-10",
    },
  ],
  "2026-02-15": [
    {
      id: 6,
      title: "发布版本",
      completed: false,
      color: "#eb2f96",
      date: "2026-02-15",
    },
    {
      id: 7,
      title: "写发布文档",
      completed: false,
      color: "#eb2f96",
      date: "2026-02-15",
    },
  ],
};

const Home = () => {
  const checkInDays = 22;

  // 选中的日期
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  // 日历任务弹窗
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [modalDate, setModalDate] = useState<Dayjs>(dayjs());
  const [modalTasks, setModalTasks] = useState<PlanItem[]>([]);

  // 每日一句
  const dailyQuote = {
    text: "成功不是终点，失败也不是致命的，重要的是继续前进的勇气。",
    author: "丘吉尔",
  };

  // 当前选中日期的计划列表
  const [allPlans, setAllPlans] =
    useState<Record<string, PlanItem[]>>(mockPlansByDate);

  // 获取当前日期的计划
  const currentDateStr = selectedDate.format("YYYY-MM-DD");
  const plans = useMemo(() => {
    return allPlans[currentDateStr] || [];
  }, [allPlans, currentDateStr]);

  // 每日感想
  const [dailyThought, setDailyThought] = useState("");

  // AI 目标输入
  const [goalInput, setGoalInput] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 切换计划完成状态
  const togglePlanComplete = (id: number) => {
    const dateStr = selectedDate.format("YYYY-MM-DD");
    setAllPlans((prev) => ({
      ...prev,
      [dateStr]: (prev[dateStr] || []).map((plan) =>
        plan.id === id ? { ...plan, completed: !plan.completed } : plan,
      ),
    }));
  };

  // 日历日期点击
  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date);
    const dateStr = date.format("YYYY-MM-DD");
    const tasksForDate = allPlans[dateStr] || [];

    if (tasksForDate.length > 0) {
      setModalDate(date);
      setModalTasks(tasksForDate);
      setTaskModalVisible(true);
    }
  };

  // 日历单元格渲染 - 显示任务数量
  const dateCellRender = (date: Dayjs) => {
    const dateStr = date.format("YYYY-MM-DD");
    const tasksForDate = allPlans[dateStr] || [];

    if (tasksForDate.length > 0) {
      const completedCount = tasksForDate.filter((t) => t.completed).length;
      return (
        <div className="calendar-cell-tasks">
          <span
            className="task-dot"
            style={{
              backgroundColor:
                completedCount === tasksForDate.length ? "#52c41a" : "#f5a623",
            }}
          ></span>
          <span className="task-count">{tasksForDate.length}</span>
        </div>
      );
    }
    return null;
  };

  // AI 生成计划
  const handleGeneratePlan = async () => {
    if (!goalInput.trim()) {
      message.warning("请输入你的目标");
      return;
    }
    setIsAiLoading(true);
    // TODO: 调用 AI 接口生成计划
    // 模拟 AI 返回
    setTimeout(() => {
      setAiSuggestions([
        { id: Date.now(), title: `制定${goalInput}的学习计划` },
        { id: Date.now() + 1, title: `每天花30分钟练习${goalInput}` },
        { id: Date.now() + 2, title: `找一个${goalInput}的导师或学习伙伴` },
      ]);
      setIsAiLoading(false);
    }, 1000);
  };

  // 接受 AI 建议
  const acceptSuggestion = (suggestion: AiSuggestion) => {
    const dateStr = selectedDate.format("YYYY-MM-DD");
    const newPlan: PlanItem = {
      id: suggestion.id,
      title: suggestion.title,
      completed: false,
      color: "#52c41a",
      date: dateStr,
    };
    setAllPlans((prev) => ({
      ...prev,
      [dateStr]: [...(prev[dateStr] || []), newPlan],
    }));
    setAiSuggestions(aiSuggestions.filter((s) => s.id !== suggestion.id));
    message.success("已添加到计划列表");
  };

  // 拒绝 AI 建议
  const rejectSuggestion = (id: number) => {
    setAiSuggestions(aiSuggestions.filter((s) => s.id !== id));
  };

  const headerRender = ({ value }: { value: Dayjs }) => {
    const month = value.month() + 1;
    const year = value.year();
    const monthNames = [
      "一月份",
      "二月份",
      "三月份",
      "四月份",
      "五月份",
      "六月份",
      "七月份",
      "八月份",
      "九月份",
      "十月份",
      "十一月份",
      "十二月份",
    ];
    return (
      <div className="calendar-header">
        <span className="calendar-title">
          {monthNames[month - 1]} {year}
        </span>
      </div>
    );
  };

  return (
    <div className="home-container">
      <Header />
      <div className="home-content">
        {/* 左侧列 */}
        <div className="home-left">
          {/* 第一行：打卡卡片 + 每日一句 */}
          <div className="home-row">
            <div className="home-card checkin-card">
              <div className="checkin-text">已连续打卡</div>
              <div className="checkin-days">
                {checkInDays}
                <span className="days-unit">天</span>
              </div>
              <div className="checkin-streak">继续加油！🎯</div>
            </div>
            {/* 每日一句 */}
            <div className="home-card top-right-card daily-quote-card">
              <div className="quote-label">📖 每日一句</div>
              <div className="quote-text">"{dailyQuote.text}"</div>
              <div className="quote-author">—— {dailyQuote.author}</div>
            </div>
          </div>

          {/* 第二行：日历区域 + 计划列表 */}
          <div className="home-row">
            <div className="home-card calendar-card">
              <div className="calendar-with-tasks">
                <div className="task-indicators">
                  {plans.map((plan) => (
                    <div key={plan.id} className="task-indicator">
                      <div
                        className="task-bar"
                        style={{
                          backgroundColor: plan.completed
                            ? "#52c41a"
                            : plan.color,
                        }}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="calendar-wrapper">
                  <Calendar
                    fullscreen={false}
                    headerRender={headerRender}
                    value={selectedDate}
                    onSelect={handleDateSelect}
                    cellRender={dateCellRender}
                  />
                </div>
              </div>
            </div>
            {/* 计划列表 */}
            <div className="home-card middle-card plan-list-card">
              <div className="card-title">
                📋 {selectedDate.format("M月D日")} 计划
              </div>
              <div className="plan-list">
                {plans.length === 0 ? (
                  <div className="empty-plans">
                    <span>📭</span>
                    <p>今天还没有计划</p>
                    <p className="empty-tip">使用 AI 助手生成计划吧！</p>
                  </div>
                ) : (
                  plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`plan-item ${plan.completed ? "completed" : ""}`}
                      onClick={() => togglePlanComplete(plan.id)}
                    >
                      <Checkbox checked={plan.completed} />
                      <span
                        className="plan-color-bar"
                        style={{ backgroundColor: plan.color }}
                      ></span>
                      <span className="plan-title">{plan.title}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="plan-tip">点击或右滑打卡完成</div>
            </div>
          </div>

          {/* 第三行：每日感想 */}
          <div className="home-row">
            <div className="home-card bottom-card daily-thought-card">
              <div className="card-title">✍️ 每日感想</div>
              <Input.TextArea
                placeholder="记录今天的想法、收获或感悟..."
                value={dailyThought}
                onChange={(e) => setDailyThought(e.target.value)}
                autoSize={{ minRows: 3, maxRows: 6 }}
                className="thought-textarea"
              />
              <div className="upload-section">
                <Upload multiple>
                  <Button icon={<PictureOutlined />}>图片</Button>
                </Upload>
                <Upload multiple>
                  <Button icon={<FileOutlined />}>文档</Button>
                </Upload>
                <Upload multiple>
                  <Button icon={<UploadOutlined />}>其他文件</Button>
                </Upload>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧 AI 助手卡片 */}
        <div className="home-card right-card ai-card">
          <div className="ai-header">
            <RobotOutlined className="ai-icon" />
            <span>AI 计划助手</span>
          </div>
          <div className="ai-description">
            输入你的目标，AI 帮你生成可执行的计划
          </div>
          <div className="ai-input-section">
            <Input.TextArea
              placeholder="例如：我想在3个月内学会弹吉他..."
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={isAiLoading}
              onClick={handleGeneratePlan}
              className="generate-btn"
            >
              生成计划
            </Button>
          </div>

          {/* AI 建议列表 */}
          {aiSuggestions.length > 0 && (
            <div className="ai-suggestions">
              <div className="suggestions-title">AI 建议的计划：</div>
              {aiSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-item">
                  <span className="suggestion-text">{suggestion.title}</span>
                  <div className="suggestion-actions">
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => acceptSuggestion(suggestion)}
                    >
                      采纳
                    </Button>
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      onClick={() => rejectSuggestion(suggestion.id)}
                    >
                      拒绝
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 日历任务弹窗 */}
      <Modal
        title={`📅 ${modalDate.format("YYYY年M月D日")} 的任务`}
        open={taskModalVisible}
        onCancel={() => setTaskModalVisible(false)}
        footer={null}
        className="task-modal"
      >
        <div className="modal-task-list">
          {modalTasks.map((task) => (
            <div
              key={task.id}
              className={`modal-task-item ${task.completed ? "completed" : ""}`}
            >
              <span
                className="task-color-dot"
                style={{ backgroundColor: task.color }}
              ></span>
              <span className="task-title">{task.title}</span>
              {task.completed && <CheckOutlined className="completed-icon" />}
            </div>
          ))}
        </div>
        <div className="modal-summary">
          完成 {modalTasks.filter((t) => t.completed).length} /{" "}
          {modalTasks.length} 项
        </div>
      </Modal>
    </div>
  );
};

export default Home;
