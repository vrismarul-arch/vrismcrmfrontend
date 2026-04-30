import React, { useEffect, useState, useRef } from "react";
import {
  Card, Table, Tag, Progress, Space, Spin, Alert, Empty,
  Button, Row, Col, Statistic, Modal, Typography,
  Divider, message, Select, Badge, Tooltip,
  Avatar, List, Drawer, Steps, Tabs
} from "antd";
import {
  RiseOutlined, InstagramOutlined,
  VideoCameraOutlined, EyeOutlined, FileTextOutlined,
  BarChartOutlined, FlagOutlined, FilterOutlined,
  CheckCircleOutlined, TrophyOutlined,
  CalendarOutlined, CloseOutlined, LinkOutlined
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from "../../api/axios";

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ClientReportPage = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [open, setOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [tourActive, setTourActive] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [tourPosition, setTourPosition] = useState({ top: 0, left: 0, position: 'bottom' });
  const [activeTab, setActiveTab] = useState("weeks");
  
  const tourCardRef = useRef(null);
  const stepRefs = useRef({});

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const hasSeenTour = localStorage.getItem("hasSeenReportTour") === "true";

  // Tour steps with element selectors
  const tourSteps = [
    {
      title: "Welcome to Reports Dashboard!",
      content: "Track all your social media performance metrics including posts, reels, and completion rates in one centralized dashboard.",
      selector: ".reports-header",
      icon: <InstagramOutlined style={{ fontSize: 22 }} />,
      preferredPosition: "bottom"
    },
    {
      title: "Performance Statistics",
      content: "These cards show your overall performance including total posts delivered, reels completed, average completion rate, and successful months.",
      selector: ".stats-cards-container",
      icon: <BarChartOutlined style={{ fontSize: 22 }} />,
      preferredPosition: "top"
    },
    {
      title: "Filter Reports",
      content: "Use these filters to narrow down reports by specific months or years. Click 'Clear Filters' to reset.",
      selector: ".filters-card",
      icon: <FilterOutlined style={{ fontSize: 22 }} />,
      preferredPosition: "bottom"
    },
    {
      title: "View Reports",
      content: "Click the 'View' button on any report to see detailed weekly performance with all posts and reels.",
      selector: ".reports-table-container",
      icon: <EyeOutlined style={{ fontSize: 22 }} />,
      preferredPosition: "top"
    },
    {
      title: "Content Details",
      content: "In the detailed view, you can see week-by-week breakdown with actual posts, reels links, and team notes.",
      selector: ".view-details-button",
      icon: <FileTextOutlined style={{ fontSize: 22 }} />,
      preferredPosition: "right"
    }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (tourActive) {
        updateTourPosition();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tourActive]);

  const getBusinessId = () => {
    return user?.businessAccount?._id || user?.businessAccount;
  };

  const calculatePosition = (element, preferredPosition) => {
    if (!element) return { top: 100, left: 100, position: 'bottom' };
    
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const cardHeight = 280;
    const cardWidth = 320;
    const gap = 16;
    
    const positions = [preferredPosition, 'bottom', 'top', 'right', 'left'];
    
    for (const pos of positions) {
      let top, left;
      
      switch(pos) {
        case 'bottom':
          top = rect.bottom + gap;
          left = rect.left + (rect.width / 2) - (cardWidth / 2);
          if (top + cardHeight <= viewportHeight - 20 && left >= 0 && left + cardWidth <= viewportWidth) {
            return { top, left, position: 'bottom' };
          }
          break;
        case 'top':
          top = rect.top - cardHeight - gap;
          left = rect.left + (rect.width / 2) - (cardWidth / 2);
          if (top >= 20 && left >= 0 && left + cardWidth <= viewportWidth) {
            return { top, left, position: 'top' };
          }
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (cardHeight / 2);
          left = rect.right + gap;
          if (top >= 20 && top + cardHeight <= viewportHeight - 20 && left + cardWidth <= viewportWidth) {
            return { top, left, position: 'right' };
          }
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (cardHeight / 2);
          left = rect.left - cardWidth - gap;
          if (top >= 20 && top + cardHeight <= viewportHeight - 20 && left >= 0) {
            return { top, left, position: 'left' };
          }
          break;
      }
    }
    
    return { top: rect.bottom + gap, left: rect.left, position: 'bottom' };
  };

  const scrollToElement = (selector, callback) => {
    const element = document.querySelector(selector);
    if (element) {
      const elementRect = element.getBoundingClientRect();
      const offset = 120;
      const elementPosition = elementRect.top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      setTimeout(() => {
        updateTourPosition();
        if (callback) callback();
      }, 500);
    }
  };

  const updateTourPosition = () => {
    const step = tourSteps[currentTourStep];
    if (!step) return;
    
    const element = document.querySelector(step.selector);
    if (element) {
      const position = calculatePosition(element, step.preferredPosition);
      setTourPosition(position);
      highlightElement(element);
    }
  };

  const highlightElement = (element) => {
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
      el.style.transition = '';
      el.style.boxShadow = '';
      el.style.border = '';
      el.style.backgroundColor = '';
    });
    
    element.classList.add('tour-highlight');
    element.style.transition = 'all 0.3s ease';
    element.style.boxShadow = '0 0 0 3px #1890ff, 0 0 0 8px rgba(24, 144, 255, 0.2)';
    element.style.border = '2px solid #1890ff';
    element.style.backgroundColor = '#f0f7ff';
  };

  const nextTourStep = () => {
    if (currentTourStep < tourSteps.length - 1) {
      const nextStep = currentTourStep + 1;
      setCurrentTourStep(nextStep);
      scrollToElement(tourSteps[nextStep].selector);
    } else {
      completeTour();
    }
  };

  const prevTourStep = () => {
    if (currentTourStep > 0) {
      const prevStep = currentTourStep - 1;
      setCurrentTourStep(prevStep);
      scrollToElement(tourSteps[prevStep].selector);
    }
  };

  const completeTour = () => {
    setTourActive(false);
    setCurrentTourStep(0);
    localStorage.setItem("hasSeenReportTour", "true");
    
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
      el.style.transition = '';
      el.style.boxShadow = '';
      el.style.border = '';
      el.style.backgroundColor = '';
    });
    
    message.success({
      content: "Tour completed! You can restart anytime from the Help button.",
      duration: 3,
      icon: <TrophyOutlined />
    });
  };

  const startTour = () => {
    setCurrentTourStep(0);
    setTourActive(true);
    setTimeout(() => {
      scrollToElement(tourSteps[0].selector, () => {
        updateTourPosition();
      });
    }, 200);
  };

  useEffect(() => {
    if (!hasSeenTour && !loading && filteredReports.length > 0) {
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour, loading, filteredReports]);

  useEffect(() => {
    if (tourActive) {
      updateTourPosition();
      window.addEventListener('scroll', updateTourPosition);
      window.addEventListener('resize', updateTourPosition);
      
      return () => {
        window.removeEventListener('scroll', updateTourPosition);
        window.removeEventListener('resize', updateTourPosition);
      };
    }
  }, [tourActive, currentTourStep]);

  // Normalize function - FIXED to handle API response correctly
  const normalizeReport = (r) => {
    // Process weeks and collect all posts/reels
    let allPosts = [];
    let allReels = [];
    
    const processedWeeks = (r.weeklyData || []).map(week => {
      // Get posts and reels from the week's posted object
      const weekPosts = week.posted?.posts || [];
      const weekReels = week.posted?.reelsList || [];
      
      // Format posts for display (static type)
      const formattedPosts = weekPosts.map(p => ({
        title: p.title || 'Untitled Post',
        link: p.link || '',
        description: p.description || '',
        postedDate: p.postedDate,
        type: 'static',
        id: p.id || p._id
      }));
      
      // Format reels for display - handle both 'reel' and 'reels' type
      const formattedReels = weekReels.map(r => ({
        title: r.title || 'Untitled Reel',
        link: r.link || '',
        description: r.description || '',
        postedDate: r.postedDate,
        type: 'reels',
        id: r.id || r._id
      }));
      
      // Add to all collections
      allPosts = [...allPosts, ...formattedPosts];
      allReels = [...allReels, ...formattedReels];
      
      // Calculate week progress based on actual counts
      const totalTarget = (week.target?.statics || 0) + (week.target?.reels || 0);
      const totalCompleted = (week.posted?.statics || 0) + (week.posted?.reels || 0);
      const calculatedProgress = totalTarget > 0 ? (totalCompleted / totalTarget) * 100 : 0;
      
      return {
        weekNumber: week.weekNumber,
        weekStartDate: week.weekStartDate,
        weekEndDate: week.weekEndDate,
        staticTarget: week.target?.statics || 0,
        reelsTarget: week.target?.reels || 0,
        staticDelivered: week.posted?.statics || 0,
        reelsDelivered: week.posted?.reels || 0,
        weekProgress: week.weekProgress || calculatedProgress,
        posts: formattedPosts,
        reelsList: formattedReels,
        notes: week.notes || ""
      };
    });
    
    // Use API provided values or calculate
    const overallPercent = r.percentageAchieved?.overall || 
      (r.totalPosted?.total > 0 && r.totalTarget?.total > 0 ? 
        (r.totalPosted.total / r.totalTarget.total) * 100 : 0);
    
    return {
      ...r,
      _id: r._id,
      month: r.month,
      year: r.year,
      staticPosts: r.totalTarget?.statics || 0,
      reels: r.totalTarget?.reels || 0,
      deliveredStatic: r.totalPosted?.statics || 0,
      deliveredReels: r.totalPosted?.reels || 0,
      completionPercentage: Number(overallPercent.toFixed(2)),
      weeks: processedWeeks,
      allPosts: allPosts,
      allReels: allReels,
      postsCount: allPosts.length,
      reelsCount: allReels.length
    };
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const businessId = getBusinessId();
      const res = await api.get(`/api/reports/client/${businessId}`);
      const data = res.data?.data || [];
      const normalized = data.map(normalizeReport);
      setReports(normalized);
      setFilteredReports(normalized);
    } catch (err) {
      console.log(err);
      message.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    let filtered = [...reports];
    
    if (filterMonth) {
      filtered = filtered.filter(r => r.month === filterMonth);
    }
    
    if (filterYear) {
      filtered = filtered.filter(r => r.year === filterYear);
    }
    
    setFilteredReports(filtered);
  }, [filterMonth, filterYear, reports]);

  const getStatistics = () => {
    const totalPosts = filteredReports.reduce((sum, r) => sum + (r.deliveredStatic || 0), 0);
    const totalReels = filteredReports.reduce((sum, r) => sum + (r.deliveredReels || 0), 0);
    const totalTargetPosts = filteredReports.reduce((sum, r) => sum + (r.staticPosts || 0), 0);
    const totalTargetReels = filteredReports.reduce((sum, r) => sum + (r.reels || 0), 0);
    const avgCompletion = filteredReports.length > 0 
      ? Number((filteredReports.reduce((sum, r) => sum + (r.completionPercentage || 0), 0) / filteredReports.length).toFixed(2))
      : 0;
    
    const completedMonths = filteredReports.filter(r => (r.completionPercentage || 0) >= 80).length;
    const bestMonth = filteredReports.reduce((best, current) => 
      (current.completionPercentage || 0) > (best?.completionPercentage || 0) ? current : best, null);
    
    const postsCompletionPercent = totalTargetPosts > 0 
      ? Number(((totalPosts / totalTargetPosts) * 100).toFixed(2))
      : 0;
    
    const reelsCompletionPercent = totalTargetReels > 0 
      ? Number(((totalReels / totalTargetReels) * 100).toFixed(2))
      : 0;
    
    return {
      totalPosts,
      totalReels,
      totalTargetPosts,
      totalTargetReels,
      avgCompletion,
      completedMonths,
      totalMonths: filteredReports.length,
      bestMonth,
      postsCompletionPercent,
      reelsCompletionPercent
    };
  };

  const stats = getStatistics();

  const getMonthOptions = () => {
    const months = [...new Set(reports.map(r => r.month).filter(Boolean))];
    return months.map(m => ({ label: m, value: m }));
  };

  const getYearOptions = () => {
    const years = [...new Set(reports.map(r => r.year).filter(Boolean))];
    return years.map(y => ({ label: y, value: y }));
  };

  const getArrowStyle = () => {
    const baseStyle = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid'
    };
    
    switch(tourPosition.position) {
      case 'bottom':
        return {
          ...baseStyle,
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '0 10px 10px 10px',
          borderColor: 'transparent transparent #ffffff transparent'
        };
      case 'top':
        return {
          ...baseStyle,
          bottom: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '10px 10px 0 10px',
          borderColor: '#ffffff transparent transparent transparent'
        };
      case 'right':
        return {
          ...baseStyle,
          left: -10,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '10px 10px 10px 0',
          borderColor: 'transparent #ffffff transparent transparent'
        };
      case 'left':
        return {
          ...baseStyle,
          right: -10,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '10px 0 10px 10px',
          borderColor: 'transparent transparent transparent #ffffff'
        };
      default:
        return {};
    }
  };

  if (loading) return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <Spin size="large" tip="Loading reports..." />
    </div>
  );

  return (
    <div style={{ padding: isMobile ? 12 : 20, background: '#ffffff', minHeight: '100vh' }}>
      
      {/* Floating Tour Card */}
      {tourActive && (
        <div
          ref={tourCardRef}
          style={{
            position: 'fixed',
            top: tourPosition.top,
            left: tourPosition.left,
            zIndex: 1000,
            width: 320,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <Card
            style={{
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              border: '1px solid #e8e8e8',
              position: 'relative'
            }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={getArrowStyle()} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: '#1890ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {tourSteps[currentTourStep]?.icon}
                </div>
                <Text strong style={{ fontSize: 16 }}>
                  {tourSteps[currentTourStep]?.title}
                </Text>
              </div>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={completeTour}
                size="small"
              />
            </div>
            
            <div style={{
              height: 4,
              background: '#f0f0f0',
              borderRadius: 2,
              marginBottom: 16,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${((currentTourStep + 1) / tourSteps.length) * 100}%`,
                height: '100%',
                background: '#1890ff',
                transition: 'width 0.3s ease'
              }} />
            </div>
            
            <Paragraph style={{ marginBottom: 20, lineHeight: 1.6 }}>
              {tourSteps[currentTourStep]?.content}
            </Paragraph>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              {tourSteps.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCurrentTourStep(idx);
                    scrollToElement(tourSteps[idx].selector);
                  }}
                  style={{
                    width: idx === currentTourStep ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: idx === currentTourStep ? '#1890ff' : '#d9d9d9',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <Button onClick={completeTour} style={{ flex: 1 }}>
                Skip
              </Button>
              {currentTourStep > 0 && (
                <Button onClick={prevTourStep} style={{ flex: 1 }}>
                  Previous
                </Button>
              )}
              <Button
                type="primary"
                onClick={nextTourStep}
                style={{ flex: 1, background: '#1890ff' }}
              >
                {currentTourStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      
      {/* Header */}
      <div className="reports-header" style={{ 
        marginBottom: 24, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        padding: isMobile ? 12 : 16,
        background: '#fafafa',
        borderRadius: 12
      }}>
        <div>
          <Title level={isMobile ? 3 : 2} style={{ marginBottom: 8 }}>
            <InstagramOutlined style={{ marginRight: 12, color: '#1890ff' }} /> 
            My Reports Dashboard
          </Title>
          <Text type="secondary">Track your social media performance with advanced analytics</Text>
        </div>
        <Tooltip title={hasSeenTour ? "Restart guided tour" : "Take a quick tour of this page"}>
          <Button 
            type={!hasSeenTour ? "primary" : "default"}
            icon={<FlagOutlined />} 
            onClick={startTour}
            style={{ marginTop: isMobile ? 12 : 0 }}
          >
            {hasSeenTour ? "Help & Tour" : "Start Tour"}
          </Button>
        </Tooltip>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards-container">
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ borderRadius: 12 }}>
              <Statistic
                title="Total Posts Delivered"
                value={stats.totalPosts}
                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                suffix={`/ ${stats.totalTargetPosts}`}
                valueStyle={{ color: '#1890ff' }}
              />
              <div style={{ marginTop: 8 }}>
                <Progress 
                  percent={stats.postsCompletionPercent}
                  size="small" 
                  strokeColor="#1890ff"
                  format={percent => `${Number(percent).toFixed(1)}%`}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ borderRadius: 12 }}>
              <Statistic
                title="Total Reels Delivered"
                value={stats.totalReels}
                prefix={<VideoCameraOutlined style={{ color: '#ff4d4f' }} />}
                suffix={`/ ${stats.totalTargetReels}`}
                valueStyle={{ color: '#ff4d4f' }}
              />
              <div style={{ marginTop: 8 }}>
                <Progress 
                  percent={stats.reelsCompletionPercent}
                  size="small" 
                  strokeColor="#ff4d4f"
                  format={percent => `${Number(percent).toFixed(1)}%`}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ borderRadius: 12 }}>
              <Statistic
                title="Average Completion"
                value={stats.avgCompletion}
                suffix="%"
                precision={2}
                prefix={<RiseOutlined style={{ color: stats.avgCompletion >= 70 ? '#52c41a' : '#faad14' }} />}
                valueStyle={{ color: stats.avgCompletion >= 70 ? '#52c41a' : '#faad14' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Best Month: {stats.bestMonth?.month || 'N/A'}</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ borderRadius: 12 }}>
              <Statistic
                title="Successful Months"
                value={stats.completedMonths}
                suffix={`/ ${stats.totalMonths}`}
                prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
              <div style={{ marginTop: 8 }}>
                <Progress 
                  percent={stats.totalMonths ? Number((stats.completedMonths / stats.totalMonths) * 100).toFixed(2) : 0} 
                  size="small" 
                  strokeColor="#52c41a"
                  format={percent => `${Number(percent).toFixed(1)}%`}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <Card style={{ marginBottom: 24, borderRadius: 12 }}>
          <Space wrap size="middle">
            <Space>
              <FilterOutlined style={{ color: '#1890ff' }} />
              <Text strong>Filters:</Text>
            </Space>
            
            <Select
              placeholder="Filter by month"
              allowClear
              style={{ width: isMobile ? '100%' : 150 }}
              onChange={setFilterMonth}
              options={getMonthOptions()}
            />
            
            <Select
              placeholder="Filter by year"
              allowClear
              style={{ width: isMobile ? '100%' : 150 }}
              onChange={setFilterYear}
              options={getYearOptions()}
            />
            
            <Button onClick={() => {
              setFilterMonth(null);
              setFilterYear(null);
            }}>
              Clear Filters
            </Button>
            
            <Text type="secondary">
              Showing {filteredReports.length} of {reports.length} reports
            </Text>
          </Space>
        </Card>
      </div>

      {/* Reports Table */}
      <div className="reports-table-container">
        {filteredReports.length === 0 ? (
          <Empty 
            description="No reports found" 
            style={{ marginTop: 50 }}
          />
        ) : (
          <Card style={{ borderRadius: 12, overflow: 'hidden' }}>
            <Table 
              columns={[
                {
                  title: "Month",
                  dataIndex: "month",
                  key: "month",
                  render: (m) => <Tag color="blue" style={{ borderRadius: 16 }}>{m}</Tag>,
                },
                {
                  title: "Posts",
                  key: "posts",
                  render: (_, r) => (
                    <>
                      <Text strong>{r.deliveredStatic} / {r.staticPosts}</Text>
                      <Progress 
                        percent={r.staticPosts ? Number((r.deliveredStatic / r.staticPosts) * 100).toFixed(2) : 0} 
                        size="small"
                        strokeColor="#1890ff"
                      />
                    </>
                  ),
                },
                {
                  title: "Reels",
                  key: "reels",
                  render: (_, r) => (
                    <>
                      <Text strong>{r.deliveredReels} / {r.reels}</Text>
                      <Progress 
                        percent={r.reels ? Number((r.deliveredReels / r.reels) * 100).toFixed(2) : 0} 
                        size="small"
                        strokeColor="#ff4d4f"
                      />
                    </>
                  ),
                },
                {
                  title: "Overall",
                  key: "overall",
                  render: (_, r) => (
                    <Progress 
                      percent={Number(r.completionPercentage.toFixed(2))} 
                      size="small"
                      strokeColor="#52c41a"
                    />
                  ),
                },
                {
                  title: "Status",
                  key: "status",
                  render: (_, r) => (
                    <Badge 
                      status={r.completionPercentage >= 80 ? "success" : r.completionPercentage >= 50 ? "warning" : "error"}
                      text={r.completionPercentage >= 80 ? "Excellent" : r.completionPercentage >= 50 ? "Good" : "Needs Improvement"}
                    />
                  ),
                },
                {
                  title: "Action",
                  key: "action",
                  render: (_, r) => (
                    <Button 
                      type="link" 
                      icon={<EyeOutlined />} 
                      className="view-details-button"
                      onClick={() => {
                        setSelectedReport(r);
                        setOpen(true);
                        setActiveTab("weeks");
                      }}
                      style={{ color: '#1890ff' }}
                    >
                      View Details
                    </Button>
                  ),
                },
              ]} 
              dataSource={filteredReports} 
              rowKey="_id"
              pagination={{ 
                pageSize: 10,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} reports`
              }}
              scroll={{ x: 800 }}
            />
          </Card>
        )}
      </div>

      {/* Drawer for Report Details */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarOutlined style={{ color: '#1890ff' }} />
              <span>{selectedReport?.month} {selectedReport?.year}</span>
            </div>
            <div>
              <Tag color="blue" icon={<FileTextOutlined />}>
                {selectedReport?.reelsCount || selectedReport?.deliveredReels || 0} Reels
              </Tag>
              <Tag color="green" icon={<CheckCircleOutlined />} style={{ marginLeft: 8 }}>
                {selectedReport?.completionPercentage || 0}% Complete
              </Tag>
            </div>
          </div>
        }
        placement="right"
        width={isMobile ? '100%' : 850}
        onClose={() => setOpen(false)}
        open={open}
        closable={true}
        destroyOnClose={true}
        styles={{ body: { padding: isMobile ? 16 : 24, overflowY: 'auto' } }}
      >
        {selectedReport && (
          <>
            {/* Summary Stats Card */}
            <Card size="small" style={{ marginBottom: 16, borderRadius: 8, background: '#fafafa' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Total Posts"
                    value={selectedReport.deliveredStatic || 0}
                    prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                    suffix={`/ ${selectedReport.staticPosts || 0}`}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Total Reels"
                    value={selectedReport.deliveredReels || 0}
                    prefix={<VideoCameraOutlined style={{ color: '#ff4d4f' }} />}
                    suffix={`/ ${selectedReport.reels || 0}`}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Completion"
                    value={selectedReport.completionPercentage || 0}
                    suffix="%"
                    precision={1}
                    valueStyle={{ color: selectedReport.completionPercentage >= 80 ? '#52c41a' : '#faad14', fontSize: 20 }}
                  />
                </Col>
              </Row>
            </Card>

            <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
              {/* Weekly Breakdown Tab */}
              <TabPane tab="Weekly Breakdown" key="weeks">
                {selectedReport.weeks && selectedReport.weeks.length > 0 ? (
                  <>
                    {/* Mini chart */}
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <Text strong>Weekly Performance Chart</Text>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={selectedReport.weeks.map(w => ({
                          week: `Week ${w.weekNumber}`,
                          Posts: w.staticDelivered || 0,
                          Reels: w.reelsDelivered || 0
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey="Posts" fill="#1890ff" />
                          <Bar dataKey="Reels" fill="#ff4d4f" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    {selectedReport.weeks.map((week, i) => (
                      <Card 
                        key={i} 
                        style={{ marginBottom: 16, borderRadius: 8 }}
                        size="small"
                        title={`Week ${week.weekNumber}`}
                        extra={
                          <Tag color={week.weekProgress >= 80 ? "green" : "orange"}>
                            {week.weekProgress.toFixed(1)}% Complete
                          </Tag>
                        }
                      >
                        <Row gutter={16}>
                          <Col span={12}>
                            <Text type="secondary">Target:</Text>
                            <div style={{ marginTop: 8 }}>
                              <Tag color="blue" style={{ borderRadius: 16 }}>{week.staticTarget} Posts</Tag>
                              <Tag color="red" style={{ borderRadius: 16 }}>{week.reelsTarget} Reels</Tag>
                            </div>
                          </Col>
                          <Col span={12}>
                            <Text type="secondary">Delivered:</Text>
                            <div style={{ marginTop: 8 }}>
                              <Tag color={week.staticDelivered >= week.staticTarget ? "green" : "orange"} style={{ borderRadius: 16 }}>
                                {week.staticDelivered} / {week.staticTarget} Posts
                              </Tag>
                              <Tag color={week.reelsDelivered >= week.reelsTarget ? "green" : "orange"} style={{ borderRadius: 16 }}>
                                {week.reelsDelivered} / {week.reelsTarget} Reels
                              </Tag>
                            </div>
                          </Col>
                        </Row>

                        {/* Reels List - Display reels first since that's what you have */}
                        {week.reelsList && week.reelsList.length > 0 && (
                          <>
                            <Divider orientation="left" style={{ margin: '16px 0 12px' }}>
                              <Space>
                                <VideoCameraOutlined style={{ color: '#ff4d4f' }} />
                                Reels ({week.reelsList.length})
                              </Space>
                            </Divider>
                            <List
                              size="small"
                              dataSource={week.reelsList}
                              renderItem={(reel, idx) => (
                                <List.Item
                                  actions={[
                                    reel.link && reel.link !== 'dddsd' ? (
                                      <Button 
                                        type="link" 
                                        icon={<InstagramOutlined />} 
                                        href={reel.link.startsWith('http') ? reel.link : `https://instagram.com/p/${reel.link}`} 
                                        target="_blank"
                                        size="small"
                                        style={{ color: '#E1306C' }}
                                      >
                                        Watch on Instagram
                                      </Button>
                                    ) : (
                                      <Tooltip title="Instagram link not available">
                                        <Button type="link" disabled size="small">
                                          No Link
                                        </Button>
                                      </Tooltip>
                                    )
                                  ]}
                                >
                                  <List.Item.Meta
                                    avatar={<Avatar icon={<VideoCameraOutlined />} style={{ backgroundColor: '#ff4d4f' }} />}
                                    title={
                                      <Text strong>
                                        {reel.title || `Reel ${idx + 1}`}
                                        {reel.postedDate && (
                                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                            {new Date(reel.postedDate).toLocaleDateString()}
                                          </Text>
                                        )}
                                      </Text>
                                    }
                                    description={reel.description || 'No description'}
                                  />
                                </List.Item>
                              )}
                            />
                          </>
                        )}

                        {/* Posts List */}
                        {week.posts && week.posts.length > 0 && (
                          <>
                            <Divider orientation="left" style={{ margin: '16px 0 12px' }}>
                              <Space>
                                <FileTextOutlined style={{ color: '#1890ff' }} />
                                Posts ({week.posts.length})
                              </Space>
                            </Divider>
                            <List
                              size="small"
                              dataSource={week.posts}
                              renderItem={(post, idx) => (
                                <List.Item
                                  actions={[
                                    post.link && (
                                      <Button 
                                        type="link" 
                                        icon={<InstagramOutlined />} 
                                        href={post.link} 
                                        target="_blank"
                                        size="small"
                                      >
                                        View
                                      </Button>
                                    )
                                  ]}
                                >
                                  <List.Item.Meta
                                    avatar={<Avatar icon={<FileTextOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                                    title={
                                      <Text strong>
                                        {post.title}
                                        {post.postedDate && (
                                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                            {new Date(post.postedDate).toLocaleDateString()}
                                          </Text>
                                        )}
                                      </Text>
                                    }
                                    description={post.description || 'No description'}
                                  />
                                </List.Item>
                              )}
                            />
                          </>
                        )}

                        {/* Notes */}
                        {week.notes && (
                          <>
                            <Divider orientation="left" style={{ margin: '16px 0 12px' }}>Team Notes</Divider>
                            <Paragraph style={{ background: '#fafafa', padding: 12, borderRadius: 8, marginTop: 8 }}>
                              {week.notes}
                            </Paragraph>
                          </>
                        )}
                      </Card>
                    ))}
                  </>
                ) : (
                  <Empty description="No weekly data available" />
                )}
              </TabPane>

              {/* All Reels Tab - Show first since you have reels */}
              <TabPane 
                tab={<span><VideoCameraOutlined /> All Reels ({selectedReport.allReels?.length || 0})</span>} 
                key="reels"
              >
                {selectedReport.allReels && selectedReport.allReels.length > 0 ? (
                  <List
                    dataSource={selectedReport.allReels}
                    renderItem={(reel, idx) => (
                      <Card key={idx} style={{ marginBottom: 12, borderRadius: 8 }} size="small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <Space direction="vertical" size={4}>
                              <Text strong style={{ fontSize: 16 }}>
                                {reel.title || `Reel ${idx + 1}`}
                              </Text>
                              {reel.postedDate && (
                                <Tag icon={<CalendarOutlined />} color="default">
                                  {new Date(reel.postedDate).toLocaleDateString()}
                                </Tag>
                              )}
                              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                                {reel.description || 'No description available'}
                              </Paragraph>
                            </Space>
                          </div>
                          {reel.link && reel.link !== 'dddsd' ? (
                            <Button 
                              type="primary" 
                              icon={<InstagramOutlined />} 
                              href={reel.link.startsWith('http') ? reel.link : `https://instagram.com/p/${reel.link}`} 
                              target="_blank"
                              style={{ marginLeft: 16, backgroundColor: '#E1306C' }}
                            >
                              Watch on Instagram
                            </Button>
                          ) : (
                            <Tooltip title="Instagram link not available for this reel">
                              <Button disabled style={{ marginLeft: 16 }}>
                                No Link Available
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </Card>
                    )}
                  />
                ) : (
                  <Empty description="No reels found for this report" />
                )}
              </TabPane>

              {/* All Posts Tab */}
              <TabPane 
                tab={<span><FileTextOutlined /> All Posts ({selectedReport.allPosts?.length || 0})</span>} 
                key="posts"
              >
                {selectedReport.allPosts && selectedReport.allPosts.length > 0 ? (
                  <List
                    dataSource={selectedReport.allPosts}
                    renderItem={(post, idx) => (
                      <Card key={idx} style={{ marginBottom: 12, borderRadius: 8 }} size="small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <Space direction="vertical" size={4}>
                              <Text strong style={{ fontSize: 16 }}>
                                {post.title || `Post ${idx + 1}`}
                              </Text>
                              {post.postedDate && (
                                <Tag icon={<CalendarOutlined />} color="default">
                                  {new Date(post.postedDate).toLocaleDateString()}
                                </Tag>
                              )}
                              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                                {post.description || 'No description available'}
                              </Paragraph>
                            </Space>
                          </div>
                          {post.link && (
                            <Button 
                              type="primary" 
                              icon={<InstagramOutlined />} 
                              href={post.link} 
                              target="_blank"
                              style={{ marginLeft: 16, backgroundColor: '#E1306C' }}
                            >
                              View on Instagram
                            </Button>
                          )}
                        </div>
                      </Card>
                    )}
                  />
                ) : (
                  <Empty description="No posts found for this report" />
                )}
              </TabPane>
            </Tabs>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default ClientReportPage;