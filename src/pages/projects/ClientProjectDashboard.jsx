import React, { useEffect, useState } from "react";
import {
  Card,
  Tag,
  Typography,
  Row,
  Col,
  Progress,
  Divider,
  message,
  Drawer,
  Button,
  Steps,
  Statistic,
  Tooltip,
  Avatar,
  Badge,
  Space,
  Dropdown,
  Menu,
  Empty,
  Calendar,
  Select ,
  Timeline,
  Modal,
  Table,
  Tabs,
  List,
} from "antd";
import {
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  FileTextOutlined,
  TeamOutlined,
  CalendarOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ShareAltOutlined,
  MoreOutlined,
  UserOutlined,
  LinkOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined,
  FilterOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  PaperClipOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import api from "../../api/axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import "./ClientProjectDashboard.css";

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Step } = Steps; 

const statusColors = {
  Planned: "gold",
  "In Progress": "#007aff",
  Completed: "#52c41a",
  "On Hold": "orange",
  Cancelled: "#ff4d4f",
  Review: "purple",
  Pending: "default",
};

const priorityColors = {
  High: "red",
  Medium: "orange",
  Low: "green",
};

export default function ClientProjectDashboard() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const [projects, setProjects] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState("1");
  const [loading, setLoading] = useState(false);
  const [stepDetailsModalVisible, setStepDetailsModalVisible] = useState(false);
  const [selectedStepForDetails, setSelectedStepForDetails] = useState(null);

  useEffect(() => {
    loadClientProjects();
  }, []);

  const loadClientProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/projects", {
        params: {
          userId: currentUser._id,
          role: "Client",
        },
      });
      setProjects(res.data.projects || []);
    } catch {
      message.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (steps) => {
    if (!steps?.length) return 0;
    const done = steps.filter((s) => s.status === "Completed").length;
    return Math.round((done / steps.length) * 100);
  };

  const getStepStatus = (status) => {
    switch (status) {
      case "Completed":
        return "finish";
      case "In Progress":
      case "Review":
        return "process";
      case "On Hold":
        return "error";
      default:
        return "wait";
    }
  };

  const getOverdueSteps = (steps) => {
    if (!steps) return [];
    const now = dayjs();
    return steps.filter(step => 
      step.status !== "Completed" && 
      step.dueDate && 
      now.isAfter(dayjs(step.dueDate))
    );
  };

  const getUpcomingSteps = (steps, days = 7) => {
    if (!steps) return [];
    const now = dayjs();
    const future = now.add(days, 'day');
    return steps.filter(step => 
      step.status !== "Completed" && 
      step.dueDate && 
      dayjs(step.dueDate).isBetween(now, future, 'day', '[]')
    );
  };

  const openStepDrawer = (step) => {
    setSelectedStep(step);
    setDrawerVisible(true);
  };

  const openStepDetailsModal = (step) => {
    setSelectedStepForDetails(step);
    setStepDetailsModalVisible(true);
  };

  const handleExport = (type) => {
    switch(type) {
      case 'excel':
        exportToExcel();
        break;
      case 'pdf':
        exportToPDF();
        break;
      case 'csv':
        exportToCSV();
        break;
      case 'project-excel':
        exportSingleProjectToExcel(selectedProject);
        break;
      case 'project-pdf':
        exportSingleProjectToPDF(selectedProject);
        break;
    }
    setExportModalVisible(false);
    message.success(`Exported as ${type.toUpperCase()}`);
  };

  const exportToExcel = () => {
    const data = projects.map(project => ({
      'Project Name': project.name,
      'Status': project.status,
      'Progress': `${calculateProgress(project.steps)}%`,
      'Start Date': dayjs(project.startDate).format('DD/MM/YYYY'),
      'End Date': dayjs(project.endDate).format('DD/MM/YYYY'),
      'Team Members': project.members?.map(m => m.name).join(', ') || 'N/A',
      'Total Steps': project.steps?.length || 0,
      'Completed Steps': project.steps?.filter(s => s.status === 'Completed').length || 0,
      'In Progress Steps': project.steps?.filter(s => s.status === 'In Progress').length || 0,
      'Overdue Steps': getOverdueSteps(project.steps).length,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, `projects_export_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Project Dashboard Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${dayjs().format('DD MMM YYYY, HH:mm')}`, 14, 32);
    doc.text(`Generated by: ${currentUser?.name}`, 14, 38);

    const tableData = projects.map(project => [
      project.name,
      project.status,
      `${calculateProgress(project.steps)}%`,
      dayjs(project.startDate).format('DD/MM/YYYY'),
      dayjs(project.endDate).format('DD/MM/YYYY'),
      project.steps?.filter(s => s.status === 'Completed').length + '/' + project.steps?.length,
      getOverdueSteps(project.steps).length
    ]);

    doc.autoTable({
      head: [['Project', 'Status', 'Progress', 'Start', 'End', 'Steps', 'Overdue']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 122, 255] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 15 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 }
      }
    });

    doc.save(`projects_report_${dayjs().format('YYYYMMDD')}.pdf`);
  };

  const exportToCSV = () => {
    const headers = ['Project Name,Status,Progress,Start Date,End Date,Team Members,Total Steps,Completed Steps,In Progress Steps,Overdue Steps'];
    const rows = projects.map(project => 
      `"${project.name}","${project.status}","${calculateProgress(project.steps)}%","${dayjs(project.startDate).format('DD/MM/YYYY')}","${dayjs(project.endDate).format('DD/MM/YYYY')}","${project.members?.map(m => m.name).join('; ') || 'N/A'}","${project.steps?.length || 0}","${project.steps?.filter(s => s.status === 'Completed').length || 0}","${project.steps?.filter(s => s.status === 'In Progress').length || 0}","${getOverdueSteps(project.steps).length}"`
    );
    
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projects_export_${dayjs().format('YYYYMMDD')}.csv`;
    a.click();
  };

  const exportSingleProjectToExcel = (project) => {
    if (!project) return;

    // Project Info Sheet
    const projectInfo = [{
      'Project Name': project.name,
      'Status': project.status,
      'Progress': `${calculateProgress(project.steps)}%`,
      'Start Date': dayjs(project.startDate).format('DD/MM/YYYY'),
      'End Date': dayjs(project.endDate).format('DD/MM/YYYY'),
      'Team Members': project.members?.map(m => m.name).join(', ') || 'N/A',
    }];

    // Steps Sheet
    const stepsData = project.steps?.map(step => ({
      'Step Name': step.stepName,
      'Status': step.status,
      'Due Date': step.dueDate ? dayjs(step.dueDate).format('DD/MM/YYYY') : 'N/A',
      'Description': step.description || 'N/A',
      'Order': step.order || 'N/A',
      'Last Updated': step.updatedAt ? dayjs(step.updatedAt).format('DD/MM/YYYY HH:mm') : 'N/A'
    })) || [];

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(projectInfo);
    XLSX.utils.book_append_sheet(wb, ws1, "Project Info");
    
    const ws2 = XLSX.utils.json_to_sheet(stepsData);
    XLSX.utils.book_append_sheet(wb, ws2, "Steps");
    
    XLSX.writeFile(wb, `${project.name}_export_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  const exportSingleProjectToPDF = (project) => {
    if (!project) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text(project.name, 14, 22);
    
    // Project Info
    doc.setFontSize(11);
    doc.text(`Status: ${project.status}`, 14, 32);
    doc.text(`Progress: ${calculateProgress(project.steps)}%`, 14, 38);
    doc.text(`Period: ${dayjs(project.startDate).format('DD/MM/YYYY')} - ${dayjs(project.endDate).format('DD/MM/YYYY')}`, 14, 44);
    
    // Steps Table
    const stepsData = project.steps?.map(step => [
      step.stepName,
      step.status,
      step.dueDate ? dayjs(step.dueDate).format('DD/MM/YYYY') : 'N/A',
      step.description?.substring(0, 30) + '...' || 'N/A'
    ]) || [];

    doc.autoTable({
      head: [['Step Name', 'Status', 'Due Date', 'Description']],
      body: stepsData,
      startY: 55,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 122, 255] },
    });

    doc.save(`${project.name}_steps_${dayjs().format('YYYYMMDD')}.pdf`);
  };

  const projectStats = {
    total: projects.length,
    completed: projects.filter(p => p.status === "Completed").length,
    inProgress: projects.filter(p => p.status === "In Progress").length,
    planned: projects.filter(p => p.status === "Planned").length,
    onHold: projects.filter(p => p.status === "On Hold").length,
    review: projects.filter(p => p.status === "Review").length,
  };

  const allSteps = projects.flatMap(p => p.steps || []);
  const overdueSteps = getOverdueSteps(allSteps);
  const upcomingSteps = getUpcomingSteps(allSteps);

  return (
    <div className="dashboard-wrapper">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-left">
          <Title level={2} className="page-title">
            Project Dashboard
            <Tag color="#007aff" className="version-tag">v2.0</Tag>
          </Title>
          <Text type="secondary">
            Welcome back, {currentUser?.name}! Here's your project overview.
          </Text>
        </div>
        <div className="header-actions">
          <Tooltip title="Filter projects">
            <Button 
              icon={<FilterOutlined />} 
              className="action-btn"
            >
              Filter
            </Button>
          </Tooltip>
          <Tooltip title="Search projects">
            <Button 
              icon={<SearchOutlined />} 
              className="action-btn"
            >
              Search
            </Button>
          </Tooltip>
          <Dropdown 
            overlay={
              <Menu>
                <Menu.Item key="excel" onClick={() => handleExport('excel')}>
                  <FileTextOutlined /> Export All to Excel
                </Menu.Item>
                <Menu.Item key="pdf" onClick={() => handleExport('pdf')}>
                  <FileTextOutlined /> Export All to PDF
                </Menu.Item>
                <Menu.Item key="csv" onClick={() => handleExport('csv')}>
                  <FileTextOutlined /> Export All to CSV
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item key="excel-single" onClick={() => setExportModalVisible(true)}>
                  <FileTextOutlined /> Export Single Project
                </Menu.Item>
              </Menu>
            }
          >
            <Button 
              type="primary" 
              icon={<ExportOutlined />}
              className="export-btn"
            >
              Export 
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card total-projects" bordered={false}>
            <Statistic
              title="Total Projects"
              value={projectStats.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#007aff", fontSize: 28 }}
            />
            <div className="stat-footer">
              <Tooltip title="Comparison with last month">
                <ArrowUpOutlined /> 12% from last month
              </Tooltip>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card completed" bordered={false}>
            <Statistic
              title="Completed"
              value={projectStats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a", fontSize: 28 }}
            />
            <div className="stat-footer">
              <Tooltip title="Overall completion rate">
                {((projectStats.completed / projectStats.total) * 100).toFixed(1)}% completion rate
              </Tooltip>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card in-progress" bordered={false}>
            <Statistic
              title="In Progress"
              value={projectStats.inProgress}
              prefix={<LoadingOutlined />}
              valueStyle={{ color: "#007aff", fontSize: 28 }}
            />
            <div className="stat-footer">
              <Tooltip title="Currently active projects">
                <ArrowUpOutlined /> Active projects
              </Tooltip>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card overdue" bordered={false}>
            <Statistic
              title="Overdue Tasks"
              value={overdueSteps.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: "#ff4d4f", fontSize: 28 }}
            />
            <div className="stat-footer">
              <Tooltip title="Tasks that need immediate attention">
                Requires immediate attention
              </Tooltip>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card className="main-content-card" bordered={false}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="dashboard-tabs">
          <TabPane tab="Project Overview" key="1">
            {/* Project Timeline and Alerts */}
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={16}>
                {/* Project List */}
                <List
                  className="project-list"
                  loading={loading}
                  itemLayout="vertical"
                  dataSource={projects}
                  renderItem={project => {
                    const progress = calculateProgress(project.steps);
                    const projectOverdue = getOverdueSteps(project.steps);
                    const projectUpcoming = getUpcomingSteps(project.steps);

                    return (
                      <List.Item
                        key={project._id}
                        className="project-list-item"
                      >
                        <Card 
                          className={`project-card ${project.status.toLowerCase().replace(' ', '-')}`}
                          hoverable
                        >
                          <div className="project-header">
                            <div className="project-title-section">
                              <Title level={4} className="project-name">
                                {project.name}
                                <Badge 
                                  count={projectOverdue.length} 
                                  className="overdue-badge"
                                  style={{ backgroundColor: '#ff4d4f' }}
                                />
                              </Title>
                              <div className="project-meta">
                                <Tag color={statusColors[project.status]} className="status-tag">
                                  {project.status}
                                </Tag>
                                <Tooltip title="Project duration">
                                  <Text type="secondary">
                                    <CalendarOutlined /> {dayjs(project.startDate).format('DD MMM')} - {dayjs(project.endDate).format('DD MMM YYYY')}
                                  </Text>
                                </Tooltip>
                              </div>
                            </div>
                            <Dropdown 
                              overlay={
                                <Menu>
                                  <Menu.Item key="details" onClick={() => setSelectedProject(project)}>
                                    <EyeOutlined /> View All Steps
                                  </Menu.Item>
                                  <Menu.Item key="export-project" onClick={() => {
                                    setSelectedProject(project);
                                    handleExport('project-excel');
                                  }}>
                                    <DownloadOutlined /> Export Project
                                  </Menu.Item>
                                  <Menu.Item key="share">
                                    <ShareAltOutlined /> Share
                                  </Menu.Item>
                                </Menu>
                              }
                            >
                              <Button icon={<MoreOutlined />} className="more-btn" />
                            </Dropdown>
                          </div>

                          <div className="project-content">
                            <Row gutter={[16, 16]}>
                              <Col xs={24} md={16}>
                                <div className="progress-section">
                                  <div className="progress-header">
                                    <Text strong>Overall Progress</Text>
                                    <Tooltip title={`${project.steps?.filter(s => s.status === 'Completed').length} of ${project.steps?.length} steps completed`}>
                                      <Text className="progress-percent">{progress}%</Text>
                                    </Tooltip>
                                  </div>
                                  <Progress 
                                    percent={progress} 
                                    strokeColor="#007aff"
                                    className="custom-progress"
                                  />
                                </div>

                                <div className="steps-preview">
                                  <Text strong className="section-title">
                                    <FileTextOutlined /> Recent Steps
                                  </Text>
                                  <Row gutter={[12, 12]}>
                                    {project.steps?.slice(0, 3).map((step, idx) => (
                                      <Col xs={24} key={idx}>
                                        <div 
                                          className="step-item"
                                          onClick={() => openStepDrawer(step)}
                                        >
                                          <Badge 
                                            status={
                                              step.status === 'Completed' ? 'success' :
                                              step.status === 'In Progress' ? 'processing' :
                                              step.status === 'Review' ? 'warning' : 'default'
                                            }
                                          />
                                          <div className="step-info">
                                            <Tooltip title="Click to view details">
                                              <Text className="step-name">{step.stepName}</Text>
                                            </Tooltip>
                                            {step.dueDate && (
                                              <Tooltip title={`Due: ${dayjs(step.dueDate).format('DD MMM YYYY')}`}>
                                                <Text type="secondary" className="step-date">
                                                  Due: {dayjs(step.dueDate).format('DD MMM')}
                                                </Text>
                                              </Tooltip>
                                            )}
                                          </div>
                                          <Tooltip title={`Status: ${step.status}`}>
                                            <Tag color={statusColors[step.status]} className="step-status">
                                              {step.status}
                                            </Tag>
                                          </Tooltip>
                                          <Tooltip title="View full details">
                                            <Button 
                                              type="link" 
                                              icon={<EyeOutlined />}
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openStepDetailsModal(step);
                                              }}
                                            />
                                          </Tooltip>
                                        </div>
                                      </Col>
                                    ))}
                                  </Row>
                                  {project.steps?.length > 3 && (
                                    <Button 
                                      type="link" 
                                      className="view-all-btn"
                                      onClick={() => setSelectedProject(project)}
                                    >
                                      View all {project.steps.length} steps
                                    </Button>
                                  )}
                                </div>
                              </Col>

                              <Col xs={24} md={8}>
                                <div className="project-sidebar">
                                  <div className="team-section">
                                    <Text strong className="section-title">
                                      <TeamOutlined /> Team ({project.members?.length || 0})
                                    </Text>
                                    <Avatar.Group 
                                      maxCount={3}
                                      maxStyle={{ color: '#007aff', backgroundColor: '#e6f7ff' }}
                                    >
                                      {project.members?.map(member => (
                                        <Tooltip title={member.name} key={member._id}>
                                          <Avatar style={{ backgroundColor: '#007aff' }}>
                                            {member.name.charAt(0)}
                                          </Avatar>
                                        </Tooltip>
                                      ))}
                                    </Avatar.Group>
                                  </div>

                                  {project.serviceId && (
                                    <div className="service-section">
                                      <Text strong className="section-title">Service</Text>
                                      <Tooltip title={project.serviceId.description}>
                                        <Tag color="blue" className="service-tag">
                                          {project.serviceId.serviceName}
                                        </Tag>
                                      </Tooltip>
                                    </div>
                                  )}

                                  {projectOverdue.length > 0 && (
                                    <Tooltip title={`${projectOverdue.length} overdue step${projectOverdue.length > 1 ? 's' : ''}`}>
                                      <div className="alert-section overdue">
                                        <WarningOutlined style={{ color: '#ff4d4f' }} />
                                        <Text type="danger">
                                          {projectOverdue.length} overdue step{projectOverdue.length > 1 ? 's' : ''}
                                        </Text>
                                      </div>
                                    </Tooltip>
                                  )}

                                  {projectUpcoming.length > 0 && (
                                    <Tooltip title={`${projectUpcoming.length} step${projectUpcoming.length > 1 ? 's' : ''} due within 7 days`}>
                                      <div className="alert-section upcoming">
                                        <ClockCircleOutlined style={{ color: '#faad14' }} />
                                        <Text type="warning">
                                          {projectUpcoming.length} step{projectUpcoming.length > 1 ? 's' : ''} due soon
                                        </Text>
                                      </div>
                                    </Tooltip>
                                  )}
                                </div>
                              </Col>
                            </Row>
                          </div>

                          {/* Steps Timeline for Desktop */}
                          <div className="steps-timeline">
                            <Divider orientation="left" className="timeline-divider">
                              <Text strong>Project Timeline</Text>
                            </Divider>
                            <Steps
                              current={project.steps?.findIndex(s => s.status === 'In Progress' || s.status === 'Review')}
                              size="small"
                              className="desktop-steps"
                              responsive
                            >
                              {project.steps?.map((step, index) => (
                                <Step
                                  key={index}
                                  title={
                                    <Tooltip title={`Click to view ${step.stepName} details`}>
                                      <span 
                                        onClick={() => openStepDrawer(step)}
                                        className="step-title"
                                      >
                                        {step.stepName}
                                      </span>
                                    </Tooltip>
                                  }
                                  status={getStepStatus(step.status)}
                                  icon={
                                    step.status === 'Completed' ? <CheckCircleOutlined /> :
                                    step.status === 'In Progress' ? <LoadingOutlined /> :
                                    step.status === 'Review' ? <ClockCircleOutlined /> : null
                                  }
                                />
                              ))}
                            </Steps>

                            {/* Mobile Steps View */}
                            <div className="mobile-steps">
                              {project.steps?.map((step, index) => (
                                <div 
                                  key={index}
                                  className={`mobile-step-item ${step.status.toLowerCase()}`}
                                  onClick={() => openStepDrawer(step)}
                                >
                                  <div className="step-indicator">
                                    <Tooltip title={`Status: ${step.status}`}>
                                      <div className={`step-dot ${step.status.toLowerCase()}`} />
                                    </Tooltip>
                                    {index < project.steps.length - 1 && <div className="step-line" />}
                                  </div>
                                  <div className="step-content">
                                    <div className="step-header">
                                      <Text strong>{step.stepName}</Text>
                                      <Tag color={statusColors[step.status]} className="step-status-tag">
                                        {step.status}
                                      </Tag>
                                    </div>
                                    {step.dueDate && (
                                      <Tooltip title={`Due date: ${dayjs(step.dueDate).format('DD MMM YYYY')}`}>
                                        <Text type="secondary" className="step-due">
                                          Due: {dayjs(step.dueDate).format('DD MMM YYYY')}
                                        </Text>
                                      </Tooltip>
                                    )}
                                    {step.description && (
                                      <Paragraph ellipsis={{ rows: 2 }} className="step-desc">
                                        {step.description}
                                      </Paragraph>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </Card>
                      </List.Item>
                    );
                  }}
                />
              </Col>

              <Col xs={24} lg={8}>
                {/* Right Sidebar - Alerts and Timeline */}
                <div className="sidebar-content">
                  {/* Upcoming Deadlines */}
                  <Card className="sidebar-card deadlines-card" bordered={false}>
                    <Title level={5}>Upcoming Deadlines</Title>
                    <Timeline className="deadline-timeline">
                      {upcomingSteps.slice(0, 5).map((step, idx) => (
                        <Timeline.Item 
                          key={idx}
                          color={dayjs(step.dueDate).diff(dayjs(), 'day') <= 2 ? 'red' : 'blue'}
                          dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
                        >
                          <div className="deadline-item" onClick={() => openStepDrawer(step)}>
                            <Tooltip title={`Click to view ${step.stepName} details`}>
                              <Text strong>{step.stepName}</Text>
                            </Tooltip>
                            <div>
                              <Tooltip title={`Due: ${dayjs(step.dueDate).format('DD MMM YYYY')}`}>
                                <Tag color="blue">{dayjs(step.dueDate).format('DD MMM')}</Tag>
                              </Tooltip>
                            </div>
                          </div>
                        </Timeline.Item>
                      ))}
                      {upcomingSteps.length === 0 && (
                        <Empty description="No upcoming deadlines" />
                      )}
                    </Timeline>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="sidebar-card activity-card" bordered={false}>
                    <Title level={5}>Recent Activity</Title>
                    <Timeline>
                      {allSteps
                        .filter(s => s.updatedAt)
                        .sort((a, b) => dayjs(b.updatedAt).diff(dayjs(a.updatedAt)))
                        .slice(0, 5)
                        .map((step, idx) => (
                          <Timeline.Item key={idx}>
                            <div className="activity-item" onClick={() => openStepDrawer(step)}>
                              <Tooltip title={`Click to view ${step.stepName} details`}>
                                <Text>{step.stepName}</Text>
                              </Tooltip>
                              <div>
                                <Tag color={statusColors[step.status]}>{step.status}</Tag>
                                <Tooltip title={dayjs(step.updatedAt).format('DD MMM YYYY, HH:mm')}>
                                  <Text type="secondary" className="activity-time">
                                    {dayjs(step.updatedAt).fromNow()}
                                  </Text>
                                </Tooltip>
                              </div>
                            </div>
                          </Timeline.Item>
                        ))}
                    </Timeline>
                  </Card>

                  {/* Quick Stats */}
                  <Card className="sidebar-card stats-card" bordered={false}>
                    <Title level={5}>Quick Stats</Title>
                    <div className="quick-stats-grid">
                      <div className="stat-item">
                        <Text type="secondary">Total Steps</Text>
                        <Tooltip title="Total number of steps across all projects">
                          <Text strong>{allSteps.length}</Text>
                        </Tooltip>
                      </div>
                      <div className="stat-item">
                        <Text type="secondary">Completed</Text>
                        <Tooltip title="Steps marked as completed">
                          <Text strong className="success-text">
                            {allSteps.filter(s => s.status === 'Completed').length}
                          </Text>
                        </Tooltip>
                      </div>
                      <div className="stat-item">
                        <Text type="secondary">In Progress</Text>
                        <Tooltip title="Steps currently in progress">
                          <Text strong className="processing-text">
                            {allSteps.filter(s => s.status === 'In Progress').length}
                          </Text>
                        </Tooltip>
                      </div>
                      <div className="stat-item">
                        <Text type="secondary">Review</Text>
                        <Tooltip title="Steps pending review">
                          <Text strong className="warning-text">
                            {allSteps.filter(s => s.status === 'Review').length}
                          </Text>
                        </Tooltip>
                      </div>
                    </div>
                  </Card>
                </div>
              </Col>
            </Row>
          </TabPane>

          {/* Steps Overview Tab */}
          <TabPane tab="All Steps" key="2">
            <Table
              dataSource={allSteps}
              rowKey={(record, index) => index}
              pagination={{ pageSize: 10 }}
              className="steps-table"
            >
              <Table.Column 
                title="Step Name" 
                dataIndex="stepName"
                render={(text, record) => (
                  <Tooltip title="Click to view details">
                    <Button 
                      type="link" 
                      onClick={() => openStepDrawer(record)}
                    >
                      {text}
                    </Button>
                  </Tooltip>
                )}
              />
              <Table.Column 
                title="Status" 
                dataIndex="status"
                render={status => (
                  <Tag color={statusColors[status]}>
                    {status}
                  </Tag>
                )}
              />
              <Table.Column 
                title="Due Date" 
                dataIndex="dueDate"
                render={date => date ? dayjs(date).format('DD MMM YYYY') : 'N/A'}
              />
              <Table.Column 
                title="Priority" 
                dataIndex="priority"
                render={priority => priority ? (
                  <Tag color={priorityColors[priority]}>
                    {priority}
                  </Tag>
                ) : 'N/A'}
              />
              <Table.Column 
                title="Actions"
                render={(_, record) => (
                  <Space>
                    <Tooltip title="View details">
                      <Button 
                        icon={<EyeOutlined />} 
                        size="small"
                        onClick={() => openStepDrawer(record)}
                      />
                    </Tooltip>
                    <Tooltip title="Download">
                      <Button 
                        icon={<DownloadOutlined />} 
                        size="small"
                        onClick={() => message.success('Download started')}
                      />
                    </Tooltip>
                  </Space>
                )}
              />
            </Table>
          </TabPane>
        </Tabs>
      </Card>

      {/* Step Details Drawer */}
      <Drawer
        title={
          <div className="drawer-header">
            <span>{selectedStep?.stepName || "Step Details"}</span>
            {selectedStep?.status && (
              <Tag color={statusColors[selectedStep.status]}>
                {selectedStep.status}
              </Tag>
            )}
          </div>
        }
        placement="right"
        width={window.innerWidth <= 768 ? '100%' : 450}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="step-drawer"
      >
        {selectedStep ? (
          <div className="step-details">
            <div className="detail-section">
              <Text type="secondary" className="section-label">
                <InfoCircleOutlined /> Description
              </Text>
              <Paragraph className="detail-value">
                {selectedStep.description || "No description provided"}
              </Paragraph>
            </div>

            {selectedStep.url && (
              <div className="detail-section">
                <Text type="secondary" className="section-label">
                  <PaperClipOutlined /> Attachment
                </Text>
                <div className="url-container">
                  <LinkOutlined />
                  <a 
                    href={selectedStep.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="detail-value"
                  >
                    {selectedStep.url}
                  </a>
                </div>
              </div>
            )}

            {selectedStep.dueDate && (
              <div className="detail-section">
                <Text type="secondary" className="section-label">
                  <CalendarOutlined /> Due Date
                </Text>
                <div className={`due-date ${dayjs().isAfter(dayjs(selectedStep.dueDate)) && selectedStep.status !== 'Completed' ? 'overdue' : ''}`}>
                  <CalendarOutlined />
                  <Text className="detail-value">
                    {dayjs(selectedStep.dueDate).format('DD MMMM YYYY')}
                    {dayjs().isAfter(dayjs(selectedStep.dueDate)) && selectedStep.status !== 'Completed' && (
                      <Tag color="red" className="overdue-tag">Overdue</Tag>
                    )}
                  </Text>
                </div>
              </div>
            )}

            {selectedStep.priority && (
              <div className="detail-section">
                <Text type="secondary" className="section-label">Priority</Text>
                <Tag color={priorityColors[selectedStep.priority]}>
                  {selectedStep.priority}
                </Tag>
              </div>
            )}

            {selectedStep.updatedAt && (
              <div className="detail-section">
                <Text type="secondary" className="section-label">
                  <HistoryOutlined /> Last Updated
                </Text>
                <div className="updated-date">
                  <ClockCircleOutlined />
                  <Text className="detail-value">
                    {dayjs(selectedStep.updatedAt).format('DD MMM YYYY, HH:mm')}
                  </Text>
                </div>
              </div>
            )}

            {selectedStep.order && (
              <div className="detail-section">
                <Text type="secondary" className="section-label">Step Order</Text>
                <Text className="detail-value">Step {selectedStep.order}</Text>
              </div>
            )}

            <Divider />

            <div className="drawer-actions">
              <Tooltip title="Download step details">
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  block
                  onClick={() => {
                    message.success('Download started');
                    // Implement download logic here
                  }}
                >
                  Download Details
                </Button>
              </Tooltip>
              <Tooltip title="Share this step">
                <Button 
                  icon={<ShareAltOutlined />}
                  block
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    message.success('Link copied to clipboard');
                  }}
                >
                  Share
                </Button>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div className="loading-state">
            <LoadingOutlined spin />
            <Text>Loading details...</Text>
          </div>
        )}
      </Drawer>

      {/* Step Details Modal (Full View) */}
      <Modal
        title={
          <div className="modal-header">
            <span>{selectedStepForDetails?.stepName}</span>
            <Tag color={statusColors[selectedStepForDetails?.status]}>
              {selectedStepForDetails?.status}
            </Tag>
          </div>
        }
        open={stepDetailsModalVisible}
        onCancel={() => setStepDetailsModalVisible(false)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />}>
            Download
          </Button>,
          <Button key="share" icon={<ShareAltOutlined />}>
            Share
          </Button>,
          <Button key="close" onClick={() => setStepDetailsModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
        className="step-modal"
      >
        {selectedStepForDetails && (
          <div className="modal-step-details">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card className="detail-card" bordered={false}>
                  <Title level={5}>Description</Title>
                  <Paragraph>
                    {selectedStepForDetails.description || "No description provided"}
                  </Paragraph>
                </Card>
              </Col>

              <Col span={12}>
                <Card className="detail-card" bordered={false}>
                  <Title level={5}>Due Date</Title>
                  <div className="detail-item">
                    <CalendarOutlined /> {selectedStepForDetails.dueDate ? 
                      dayjs(selectedStepForDetails.dueDate).format('DD MMMM YYYY') : 'No due date'}
                  </div>
                </Card>
              </Col>

              <Col span={12}>
                <Card className="detail-card" bordered={false}>
                  <Title level={5}>Priority</Title>
                  {selectedStepForDetails.priority ? (
                    <Tag color={priorityColors[selectedStepForDetails.priority]}>
                      {selectedStepForDetails.priority}
                    </Tag>
                  ) : 'Not set'}
                </Card>
              </Col>

              {selectedStepForDetails.url && (
                <Col span={24}>
                  <Card className="detail-card" bordered={false}>
                    <Title level={5}>Attachment</Title>
                    <a href={selectedStepForDetails.url} target="_blank" rel="noopener noreferrer">
                      <LinkOutlined /> {selectedStepForDetails.url}
                    </a>
                  </Card>
                </Col>
              )}

              <Col span={24}>
                <Card className="detail-card" bordered={false}>
                  <Title level={5}>Additional Information</Title>
                  <div className="additional-info">
                    <div className="info-row">
                      <Text type="secondary">Step Order:</Text>
                      <Text>{selectedStepForDetails.order || 'N/A'}</Text>
                    </div>
                    <div className="info-row">
                      <Text type="secondary">Created:</Text>
                      <Text>{selectedStepForDetails.createdAt ? 
                        dayjs(selectedStepForDetails.createdAt).format('DD MMM YYYY, HH:mm') : 'N/A'}</Text>
                    </div>
                    <div className="info-row">
                      <Text type="secondary">Last Updated:</Text>
                      <Text>{selectedStepForDetails.updatedAt ? 
                        dayjs(selectedStepForDetails.updatedAt).format('DD MMM YYYY, HH:mm') : 'N/A'}</Text>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Export Modal */}
      <Modal
        title="Export Single Project"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
        className="export-modal"    
      >
        <div className="export-options">
          <Select
            placeholder="Select a project to export"
            style={{ width: '100%', marginBottom: 16 }}
            onChange={(value) => {
              const project = projects.find(p => p._id === value);
              setSelectedProject(project);
            }}
          >
            {projects.map(project => (
              <Select.Option key={project._id} value={project._id}>
                {project.name}
              </Select.Option>
            ))}
          </Select>
          
          <Button 
            icon={<FileTextOutlined />}
            onClick={() => handleExport('project-excel')}
            block
            disabled={!selectedProject}
          >
            Export as Excel
          </Button>
          <Button 
            icon={<FileTextOutlined />}
            onClick={() => handleExport('project-pdf')}
            block
            disabled={!selectedProject}
          >
            Export as PDF
          </Button>
        </div>
      </Modal>
    </div>
  );
}