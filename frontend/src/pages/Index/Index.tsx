/*
 * @Author: xel
 * @Date: 2026-02-02 05:57:39
 * @LastEditors: xel
 * @LastEditTime: 2026-02-04 18:11:08
 * @FilePath: \frontend\src\pages\Index\Index.tsx
 * @Description:
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header/Header";
import { Button } from "antd";
import {
  HeartFilled,
  CalendarFilled,
  CameraFilled,
  CloudFilled,
  ReadFilled,
  FlagFilled,
  TrophyFilled,
  QuestionCircleOutlined,
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import "./Index.css";
import { getUser } from "@/utils/auth";

const useCases = [
  {
    id: "student",
    title: "学生",
    icon: <ReadFilled />,
    description:
      "管理课程、作业和考试。制定完美的学习计划，跟踪你的学术进展，不再错过任何一个deadline。",
  },
  {
    id: "creator",
    title: "创作者",
    icon: <CameraFilled />,
    description:
      "规划你的内容日历，无论是视频、博客还是播客。从灵感收集到发布，NAXS 帮你搞定一切。",
  },
  {
    id: "professional",
    title: "职场人",
    icon: <TrophyFilled />,
    description:
      "设定职业目标，管理个人项目，培养新技能。让你的职业发展道路每一步都清晰可见。",
  },
];

const faqItems = [
  {
    question: "NAXS 是免费的吗？",
    answer:
      "是的，NAXS 目前提供完全免费的服务。我们致力于为所有用户提供一个强大且易于使用的个人计划工具，没有任何隐藏费用。",
  },
  {
    question: "我的数据安全吗？",
    answer:
      "我们非常重视您的数据安全。所有数据在传输和存储过程中都经过加密处理。您可以随时导出或删除您的个人数据。",
  },
  {
    question: "我可以在哪些设备上使用 NAXS？",
    answer:
      "您可以在任何有现代浏览器的设备上使用 NAXS，包括桌面电脑、笔记本、平板和手机。我们的网站是完全响应式的。",
  },
  {
    question: "未来会推出 App 吗？",
    answer:
      "我们有计划在未来开发原生 iOS 和 Android 应用，以提供更佳的移动体验。敬请期待！",
  },
];

export default function Index() {
  const navigate = useNavigate();
  const [activeUseCase, setActiveUseCase] = useState(useCases[0].id);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    // 检查是否已登录，有用户信息则跳转到 /home
    const user = getUser();
    console.log(user);
    if (user) {
      navigate("/home");
    }
  }, [navigate]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <>
      <Header />
      <div className="index-page">
        <div className="gradient-bg"></div>
        {/* Hero Section */}
        <section className="index-section hero-section">
          <h1>你的梦想，正在发生</h1>
          <p>
            NAXS
            不仅仅是一个计划工具，更是你生活的伙伴。在这里，记录你的每一个奇思妙想，规划你的每一次学习和旅行，见证你如何一步步成为更好的自己。
          </p>
          <Button
            type="primary"
            className="hero-cta"
            onClick={() => navigate("/login")}
          >
            即刻加入，开启你的故事
          </Button>
        </section>

        {/* Features Section */}
        <section className="index-section">
          <h2>解锁你的无限可能</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="icon">
                <CalendarFilled />
              </div>
              <h3>轻松规划你的日常</h3>
              <p>
                无论是健身打卡、学习新技能，还是准备一场旅行，都可以轻松地在这里制定计划，让生活井井有条。
              </p>
            </div>
            <div className="feature-card">
              <div className="icon">
                <CameraFilled />
              </div>
              <h3>图文记录每个瞬间</h3>
              <p>
                用照片和文字捕捉生活中的点滴美好。你的美食日记、旅行手帐、学习笔记，都可以在这里被完美珍藏。
              </p>
            </div>
            <div className="feature-card">
              <div className="icon">
                <HeartFilled />
              </div>
              <h3>培养你的专属习惯</h3>
              <p>
                设定每日、每周的习惯目标，如“晨跑30分钟”或“阅读一本书”。NAXS会提醒你，陪伴你养成受益终身的好习惯。
              </p>
            </div>
            <div className="feature-card">
              <div className="icon">
                <CloudFilled />
              </div>
              <h3>多端同步，随时随地</h3>
              <p>
                无论你是在电脑前，还是手持手机，你的所有记录和计划都会无缝同步，让灵感和进度随时伴你左右。
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="index-section use-cases-section">
          <h2>为每一个你而设计</h2>
          <div className="use-cases-tabs">
            {useCases.map((uc) => (
              <button
                key={uc.id}
                className={`tab-button ${
                  activeUseCase === uc.id ? "active" : ""
                }`}
                onClick={() => setActiveUseCase(uc.id)}
              >
                {uc.icon}
                <span>{uc.title}</span>
              </button>
            ))}
          </div>
          <div className="use-cases-content">
            {useCases.map((uc) => (
              <div
                key={uc.id}
                className={`tab-pane ${
                  activeUseCase === uc.id ? "active" : ""
                }`}
              >
                <p>{uc.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Showcase Section */}
        <section className="index-section showcase-section">
          <h2>从想法到现实</h2>
          <p>我们相信，每一个伟大的成就都源于微小的记录和坚持。</p>
          <img
            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1974&auto=format&fit=crop"
            alt="Lifestyle Showcase"
            className="showcase-image"
          />
        </section>

        {/* Pricing Section */}
        <section className="index-section pricing-section">
          <h2>选择你的计划</h2>
          <div className="pricing-card">
            <div className="pricing-header">
              <h3>免费版</h3>
              <p className="price">
                ¥0<span>/永久</span>
              </p>
            </div>
            <ul className="features-list">
              <li>
                <FlagFilled /> 无限计划与任务
              </li>
              <li>
                <FlagFilled /> 图文记录功能
              </li>
              <li>
                <FlagFilled /> 习惯追踪
              </li>
              <li>
                <FlagFilled /> 多设备同步
              </li>
              <li>
                <FlagFilled /> 安全数据加密
              </li>
            </ul>
            <Button
              type="primary"
              className="hero-cta"
              onClick={() => navigate("/login")}
            >
              立即免费使用
            </Button>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="index-section faq-section">
          <h2>常见问题</h2>
          <div className="faq-container">
            {faqItems.map((item, index) => (
              <div key={index} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => toggleFaq(index)}
                >
                  <span>{item.question}</span>
                  {openFaq === index ? <MinusOutlined /> : <PlusOutlined />}
                </button>
                <div
                  className={`faq-answer ${openFaq === index ? "open" : ""}`}
                >
                  <p>{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="index-section">
          <h2>听听他们的故事</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p>
                “我用NAXS记录我考研的每一天，它帮我把复杂的计划分解成小任务，看着已完成列表越来越长，真的超有成就感！”
              </p>
              <footer>- 小敏, 准研究生</footer>
            </div>
            <div className="testimonial-card">
              <p>
                “作为一个手帐爱好者，NAXS的图文功能太棒了！我可以随时随地记录我的日常和旅行见闻，再也不怕本子不在身边了。”
              </p>
              <footer>- 阿杰, 旅行博主</footer>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="index-section final-cta-section">
          <h2>准备好，开始记录你的生活了吗？</h2>
          <p>现在就加入我们，让每一天都充满意义。</p>
          <Button
            type="primary"
            className="hero-cta"
            onClick={() => navigate("/login")}
          >
            免费开始
          </Button>
        </section>
      </div>
    </>
  );
}
