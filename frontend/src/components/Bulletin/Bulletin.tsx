import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Bulletin.css";

type NoticeItem = {
  id: number;
  title: string;
  content: string;
  time: string;
  author: string;
};

const Bulletin = () => {
 const [notices, setNotices] = useState<NoticeItem[]>([
  {
    id: 1,
    title: "系统维护通知",
    author:"admin",
    time: "2024-01-15 22:00",
    content:
      "为保障系统稳定运行，平台将于今晚 22:00 至 23:30 进行系统维护，期间部分功能可能不可用，请提前做好安排。",
  },
  {
    id: 2,
    title: "新版本功能上线",
    author:"admin",
    time: "2024-01-10 10:00",
    content:
      "系统已升级至 v1.2.0，本次更新新增用户中心模块，优化了登录流程与页面性能，欢迎体验并反馈意见。",
  },
  {
    id: 3,
    title: "安全提示",
    author:"admin",
    time: "2024-01-05 09:30",
    content:
      "请勿将账号密码泄露给他人，官方人员不会以任何形式向您索要密码或验证码，谨防诈骗。",
  },
]);

  const [currentNotice, setCurrentNotice] = useState<NoticeItem | null>(null);

  const navigator = useNavigate();

  useEffect(() => {
    const getNotices = async () => {
      //todo : 获取公告列表
    };

    getNotices();
  }, []);

  const handleMoreClick = () => {
    navigator("/notices");
    console.log("查看更多公告");
  };
  // 详情态
  if (currentNotice) {
    return (
      <div className="notice notice-detail">
        <div className="notice-back" onClick={() => setCurrentNotice(null)}>
          ← 返回
        </div>

        <h2 className="notice-detail-title">{currentNotice.title}</h2>
        <p>{currentNotice.author}</p>
        <div className="notice-detail-time">{currentNotice.time}</div>
        <div className="notice-detail-content">{currentNotice.content}</div>
      </div>
    );
  }

  // 列表态
  return (
    <div className="notice">
      <div className="notice-header">
        <h2>公告</h2>
      </div>

      <ul className="notice-list">
        {notices.map((item) => (
          <li
            key={item.id}
            className="notice-item"
            onClick={() => setCurrentNotice(item)}
          >
            {item.title}
          </li>
        ))}
      </ul>

      <div className="notice-more" onClick={handleMoreClick}>
        查看更多 &gt;&gt;&gt;
      </div>
    </div>
  );
};

export default Bulletin;
