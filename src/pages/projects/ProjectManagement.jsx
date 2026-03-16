import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  message,
  Typography,
  Row,
  Col,
  Space,
  Statistic,
  Divider,
  Empty,
  Avatar,
  Progress,
  Dropdown,
  Menu,
  Tooltip,
  Badge,
  Timeline,
  Tabs,
  List,
  Modal
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CommentOutlined,
  PaperClipOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  FolderOutlined,
  TeamOutlined,
  CalendarOutlined,
  FlagOutlined,
  MoreOutlined,
  FilterOutlined,
  SearchOutlined,
  DownloadOutlined,
  UploadOutlined,
  LinkOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import api from "../../api/axios";

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;
const { confirm } = Modal;

// Project Status Configuration
const projectStatusConfig = {
  Planned: { color: "gold", icon: <FlagOutlined />, label: "Planned" },
  "In Progress": { color: "blue", icon: <PlayCircleOutlined />, label: "In Progress" },
  Completed: { color: "green", icon: <CheckCircleOutlined />, label: "Completed" },
  "On Hold": { color: "orange", icon: <PauseCircleOutlined />, label: "On Hold" },
  Cancelled: { color: "red", icon: <CloseCircleOutlined />, label: "Cancelled" },
};

// Step Status Configuration
const stepStatusConfig = {
  "Pending": { color: "default", icon: <ClockCircleOutlined />, label: "Pending" },
  "In Progress": { color: "processing", icon: <PlayCircleOutlined />, label: "In Progress" },
  "Review": { color: "purple", icon: <EyeOutlined />, label: "Review" },
  "Completed": { color: "success", icon: <CheckCircleOutlined />, label: "Completed" },
  "On Hold": { color: "warning", icon: <PauseCircleOutlined />, label: "On Hold" },
};

// Priority Levels
const priorityLevels = [
  { label: "Highest", value: "highest", color: "#f5222d" },
  { label: "High", value: "high", color: "#fa541c" },
  { label: "Medium", value: "medium", color: "#faad14" },
  { label: "Low", value: "low", color: "#52c41a" },
  { label: "Lowest", value: "lowest", color: "#8c8c8c" },
];

export default function ProjectManagement() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isEmployee = currentUser?.role === "Employee";
  const [form] = Form.useForm();
  const [noteForm] = Form.useForm();
  const [searchForm] = Form.useForm();

  // State Management
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [services, setServices] = useState([]);
  const [stepTemplates, setStepTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("board"); // board, list, timeline

  // Drawer States
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [detailProject, setDetailProject] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const [stepModalVisible, setStepModalVisible] = useState(false);

  // Filter States
  const [filters, setFilters] = useState({
    status: null,
    accountId: null,
    serviceId: null,
    priority: null,
    search: ""
  });

  // --- DATA LOADING ---
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadAccounts(),
        loadServices(),
        loadProjects(),
        loadStepTemplates()
      ]);
    } catch (error) {
      console.error("Error loading initial data:", error);
      message.error("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/api/users");
      setUsers(res.data || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await api.get("/api/accounts");
      setAccounts(res.data?.accounts || res.data || []);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  const loadServices = async () => {
    try {
      const res = await api.get("/api/service");
      setServices(res.data?.services || res.data || []);
    } catch (error) {
      console.error("Failed to load services:", error);
    }
  };

  const loadStepTemplates = async () => {
    try {
      const { data } = await api.get("/api/steps");
      setStepTemplates(data);
    } catch (e) {
      console.error("Failed to load step templates:", e);
    }
  };

  const loadProjects = async (customFilters = {}) => {
    setLoading(true);
    try {
      const res = await api.get("/api/projects", {
        params: {
          userId: currentUser._id,
          role: currentUser.role,
          ...filters,
          ...customFilters
        },
      });
      setProjects(res.data?.projects || []);
    } catch (error) {
      console.error("Failed to load projects:", error);
      message.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  // Step template autofill
  const serviceId = Form.useWatch('serviceId', form);
  useEffect(() => {
    if (drawerOpen && !editingProject && serviceId) {
      const service = services.find(s => s._id === serviceId);
      const stepType = service?.serviceName;

      if (stepType) {
        const templateGroup = stepTemplates.find(g => g._id === stepType);
        if (templateGroup) {
          const projectSteps = templateGroup.steps.map(step => ({
            stepName: step.stepName,
            description: step.description,
            dueDate: step.dueDate ? dayjs(step.dueDate) : null,
            status: 'Pending',
            priority: 'medium',
            assignee: null
          }));

          form.setFieldsValue({ steps: projectSteps });
          message.success(`Auto-populated ${projectSteps.length} steps from '${stepType}' template`);
        }
      }
    }
  }, [serviceId, form, services, stepTemplates, drawerOpen, editingProject]);

  // Permission Check
  const canEdit = (project) =>
    !isEmployee || project?.members?.some(m => m._id === currentUser._id);

  const canEditStep = (step) => {
    if (!isEmployee) return true;
    if (!step.assignee) return false;
    return step.assignee._id === currentUser._id;
  };

  // CRUD Operations
  const openCreateDrawer = () => {
    setEditingProject(null);
    form.resetFields();
    form.setFieldsValue({ 
      steps: [],
      priority: 'medium',
      status: 'Planned'
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (project) => {
    setEditingProject(project);
    form.setFieldsValue({
      ...project,
      accountId: project.accountId?._id,
      serviceId: project.serviceId?._id,
      members: project.members?.map(m => m._id),
      status: project.status,
      priority: project.priority || 'medium',
      dates: [
        project.startDate ? dayjs(project.startDate) : null,
        project.endDate ? dayjs(project.endDate) : null,
      ],
      attachments: project.attachments || [],
      steps: project.steps?.map(s => ({
        ...s,
        dueDate: s.dueDate ? dayjs(s.dueDate) : null,
        assignee: s.assignee?._id
      })) || []
    });
    setDrawerOpen(true);
  };

  const openDetails = async (project) => {
    try {
      const res = await api.get(`/api/projects/${project._id}`);
      setDetailProject(res.data.project);
      setDetailDrawerOpen(true);
    } catch (error) {
      console.error("Failed to load project details:", error);
      message.error("Failed to load project details");
    }
  };

  const saveProject = async (values) => {
    const [start, end] = values.dates || [];
    const serviceNameForBackend = !editingProject
      ? services.find(s => s._id === values.serviceId)?.serviceName
      : undefined;

    const payload = {
      ...values,
      startDate: start?.toISOString(),
      endDate: end?.toISOString(),
      createdBy: currentUser._id,
      serviceName: serviceNameForBackend,
      attachments: (values.attachments || []).map(a => ({
        filename: a.filename || a.url?.split("/").pop(),
        url: a.url,
        uploadedBy: currentUser._id,
        uploadedAt: new Date().toISOString()
      })),
      steps: (values.steps || []).map(s => ({
        ...s,
        dueDate: s.dueDate ? s.dueDate.toISOString() : null,
        assignee: s.assignee || null
      })),
    };

    try {
      if (editingProject) {
        await api.put(`/api/projects/${editingProject._id}`, payload);
        message.success({ content: 'Project updated successfully', icon: <CheckCircleOutlined /> });
      } else {
        await api.post("/api/projects", payload);
        message.success({ content: 'Project created successfully', icon: <CheckCircleOutlined /> });
      }

      form.resetFields();
      setEditingProject(null);
      setDrawerOpen(false);
      loadProjects();
    } catch (e) {
      console.error("Save error:", e);
      message.error("Error saving project");
    }
  };

  const deleteProject = (id) => {
    confirm({
      title: 'Are you sure you want to delete this project?',
      icon: <CloseCircleOutlined style={{ color: 'red' }} />,
      content: 'This action cannot be undone. All project data will be permanently removed.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      onOk: async () => {
        try {
          await api.delete(`/api/projects/${id}`);
          message.success('Project deleted successfully');
          loadProjects();
        } catch (error) {
          console.error("Failed to delete project:", error);
          message.error("Failed to delete project");
        }
      }
    });
  };

  // Notes Management
  const addNoteToProject = async (values) => {
    if (!detailProject) return;
    try {
      const note = {
        text: values.noteText,
        author: currentUser,
        timestamp: new Date().toISOString()
      };

      await api.put(`/api/projects/${detailProject._id}/note`, { note });
      message.success('Note added successfully');

      const res = await api.get(`/api/projects/${detailProject._id}`);
      setDetailProject(res.data.project);
      noteForm.resetFields();
    } catch (error) {
      console.error('Error adding note:', error);
      message.error('Failed to add note');
    }
  };

  const deleteProjectNote = async (projectId, noteId) => {
    try {
      await api.put(`/api/projects/${projectId}/note/delete`, { noteId });
      message.success('Note deleted successfully');
      const res = await api.get(`/api/projects/${detailProject._id}`);
      setDetailProject(res.data.project);
    } catch (error) {
      console.error('Error deleting note:', error);
      message.error('Failed to delete note');
    }
  };

  // Step Management
  const updateStepStatus = async (projectId, stepIndex, newStatus) => {
    try {
      await api.put(`/api/projects/${projectId}/step/${stepIndex}`, { status: newStatus });
      message.success('Step status updated');
      loadProjects();
      if (detailProject?._id === projectId) {
        const res = await api.get(`/api/projects/${projectId}`);
        setDetailProject(res.data.project);
      }
    } catch (error) {
      console.error('Error updating step:', error);
      message.error('Failed to update step');
    }
  };

  // Filtering
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    loadProjects(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      status: null,
      accountId: null,
      serviceId: null,
      priority: null,
      search: ""
    };
    setFilters(emptyFilters);
    searchForm.resetFields();
    loadProjects(emptyFilters);
  };

  // Get filtered projects for board view
  const getProjectsByStatus = () => {
    const grouped = {};
    Object.keys(projectStatusConfig).forEach(status => {
      grouped[status] = projects.filter(p => p.status === status);
    });
    return grouped;
  };

  // Calculate project progress
  const calculateProgress = (steps) => {
    if (!steps || steps.length === 0) return 0;
    const completed = steps.filter(s => s.status === 'Completed').length;
    return Math.round((completed / steps.length) * 100);
  };

  // Get due date status
  const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null;
    const now = dayjs();
    const due = dayjs(dueDate);
    if (now.isAfter(due)) return 'overdue';
    if (now.add(3, 'day').isAfter(due)) return 'upcoming';
    return 'normal';
  };

  // Render Methods
  const renderProjectCard = (project) => {
    const editable = canEdit(project);
    const progress = calculateProgress(project.steps);
    const members = project.members || [];
    const statusConfig = projectStatusConfig[project.status] || projectStatusConfig.Planned;

    return (
      <Card
        className="project-card"
        hoverable
        style={{ 
          marginBottom: 16,
          borderRadius: 8,
          // boxShadow: '0 2px 8px rgba(0,0,0,0.09)'
        }}
        bodyStyle={{ padding: 16 }}
        onClick={() => openDetails(project)}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            <Badge status={statusConfig.color} />
            <Text strong style={{ fontSize: 16 }}>{project.name}</Text>
          </Space>
          <Dropdown
            overlay={
              <Menu>
                {editable && (
                  <Menu.Item 
                    key="edit" 
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.domEvent.stopPropagation();
                      openEditDrawer(project);
                    }}
                  >
                    Edit
                  </Menu.Item>
                )}
                {!isEmployee && (
                  <Menu.Item 
                    key="delete" 
                    icon={<DeleteOutlined />} 
                    danger
                    onClick={(e) => {
                      e.domEvent.stopPropagation();
                      deleteProject(project._id);
                    }}
                  >
                    Delete
                  </Menu.Item>
                )}
                <Menu.Item 
                  key="notes" 
                  icon={<CommentOutlined />}
                  onClick={(e) => {
                    e.domEvent.stopPropagation();
                    openNotesDrawer(project);
                  }}
                >
                  View Notes
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
          >
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              onClick={(e) => e.stopPropagation()}
              size="small"
            />
          </Dropdown>
        </div>

        {/* Description */}
        <Paragraph 
          ellipsis={{ rows: 2 }} 
          type="secondary"
          style={{ fontSize: 13, marginBottom: 12 }}
        >
          {project.description || 'No description provided'}
        </Paragraph>

        {/* Progress Bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Progress</Text>
            <Text strong style={{ fontSize: 12 }}>{progress}%</Text>
          </div>
          <Progress percent={progress} size="small" showInfo={false} strokeColor={statusConfig.color} />
        </div>

        {/* Project Details */}
        <div style={{ marginBottom: 12 }}>
          <Space wrap size={[0, 8]}>
            <Tag icon={<FolderOutlined />} color="blue">
              {project.accountId?.businessName || 'No Account'}
            </Tag>
            <Tag icon={<PlayCircleOutlined />} color="cyan">
              {project.serviceId?.serviceName || 'No Service'}
            </Tag>
            {project.priority && (
              <Tag color={priorityLevels.find(p => p.value === project.priority)?.color}>
                {project.priority}
              </Tag>
            )}
          </Space>
        </div>

        {/* Footer with Dates and Members */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size={12}>
            {project.startDate && (
              <Tooltip title="Start Date">
                <Space size={4}>
                  <CalendarOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(project.startDate).format('MMM D')}
                  </Text>
                </Space>
              </Tooltip>
            )}
            {project.endDate && (
              <Tooltip title="Due Date">
                <Space size={4}>
                  <ClockCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: 12,
                      color: getDueDateStatus(project.endDate) === 'overdue' ? '#f5222d' : 'inherit'
                    }}
                  >
                    {dayjs(project.endDate).format('MMM D')}
                  </Text>
                </Space>
              </Tooltip>
            )}
          </Space>

          {/* Member Avatars */}
          <Avatar.Group maxCount={3} size="small">
            {members.map(member => (
              <Tooltip key={member._id} title={member.name}>
                <Avatar src={member.avatar} icon={<UserOutlined />}>
                  {member.name?.charAt(0)}
                </Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        </div>

        {/* Steps Summary */}
        {project.steps && project.steps.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
            <Space wrap size={[0, 4]}>
              {project.steps.slice(0, 3).map((step, idx) => (
                <Badge 
                  key={idx}
                  status={stepStatusConfig[step.status]?.color || 'default'} 
                  text={
                    <Text style={{ fontSize: 11 }}>
                      {step.stepName.length > 15 ? step.stepName.substring(0, 15) + '...' : step.stepName}
                    </Text>
                  }
                />
              ))}
              {project.steps.length > 3 && (
                <Text type="secondary" style={{ fontSize: 11 }}>+{project.steps.length - 3} more</Text>
              )}
            </Space>
          </div>
        )}
      </Card>
    );
  };

  const renderBoardView = () => {
    const groupedProjects = getProjectsByStatus();

    return (
      <Row gutter={16} style={{ marginTop: 16, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {Object.entries(projectStatusConfig).map(([status, config]) => (
          <Col key={status} span={6} style={{ minWidth: 280 }}>
            <Card
              title={
                <Space>
                  {config.icon}
                  <Text strong>{config.label}</Text>
                  <Badge count={groupedProjects[status]?.length || 0} style={{ backgroundColor: config.color }} />
                </Space>
              }
              size="small"
              headStyle={{ backgroundColor: '#fafafa' }}
              bodyStyle={{ 
                padding: '12px 8px',
                maxHeight: 'calc(100vh - 250px)',
                overflowY: 'auto'
              }}
            >
              {(groupedProjects[status] || []).map(project => (
                <div key={project._id} style={{ marginBottom: 12 }}>
                  {renderProjectCard(project)}
                </div>
              ))}
              {(!groupedProjects[status] || groupedProjects[status].length === 0) && (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description={`No ${status} projects`}
                  style={{ margin: '20px 0' }}
                />
              )}
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const renderListView = () => (
    <List
      style={{ marginTop: 16 }}
      loading={loading}
      dataSource={projects}
      renderItem={project => (
        <List.Item
          key={project._id}
          actions={[
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => openDetails(project)}
            >
              View
            </Button>,
            canEdit(project) && (
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                onClick={() => openEditDrawer(project)}
              >
                Edit
              </Button>
            ),
            !isEmployee && (
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => deleteProject(project._id)}
              >
                Delete
              </Button>
            )
          ].filter(Boolean)}
        >
          <List.Item.Meta
            avatar={
              <Avatar 
                icon={<FolderOutlined />} 
                style={{ backgroundColor: projectStatusConfig[project.status]?.color }}
              />
            }
            title={
              <Space>
                <Text strong>{project.name}</Text>
                <Tag color={projectStatusConfig[project.status]?.color}>
                  {project.status}
                </Tag>
              </Space>
            }
            description={
              <Space direction="vertical" size={4}>
                <Text type="secondary">{project.description}</Text>
                <Space split={<Divider type="vertical" />}>
                  <Text type="secondary">
                    <FolderOutlined /> {project.accountId?.businessName}
                  </Text>
                  <Text type="secondary">
                    <PlayCircleOutlined /> {project.serviceId?.serviceName}
                  </Text>
                  <Text type="secondary">
                    <TeamOutlined /> {project.members?.length || 0} members
                  </Text>
                  <Text type="secondary">
                    <CheckCircleOutlined /> {project.steps?.filter(s => s.status === 'Completed').length || 0}/{project.steps?.length || 0} steps
                  </Text>
                </Space>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  const renderTimelineView = () => {
    const sortedProjects = [...projects].sort((a, b) => 
      dayjs(a.startDate || 0).unix() - dayjs(b.startDate || 0).unix()
    );

    return (
      <Timeline mode="left" style={{ marginTop: 24 }}>
        {sortedProjects.map(project => (
          <Timeline.Item
            key={project._id}
            dot={projectStatusConfig[project.status]?.icon}
            color={projectStatusConfig[project.status]?.color}
          >
            <Card 
              size="small" 
              hoverable 
              onClick={() => openDetails(project)}
              style={{ marginBottom: 8 }}
            >
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Text strong>{project.name}</Text>
                </Col>
                <Col span={6}>
                  <Tag color={projectStatusConfig[project.status]?.color}>
                    {project.status}
                  </Tag>
                </Col>
                <Col span={10}>
                  <Space>
                    <CalendarOutlined />
                    <Text type="secondary">
                      {project.startDate ? dayjs(project.startDate).format('MMM D, YYYY') : 'Not set'} - 
                      {project.endDate ? dayjs(project.endDate).format('MMM D, YYYY') : 'Not set'}
                    </Text>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  return (
    <div style={{  minHeight: '100vh' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            Project Management
            <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>
              {projects.length} active projects
            </Text>
          </Title>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<FilterOutlined />}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
            {!isEmployee && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateDrawer}
              >
                New Project
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Projects"
              value={projects.length}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={projects.filter(p => p.status === 'In Progress').length}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={projects.filter(p => p.status === 'Completed').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Team Members"
              value={new Set(projects.flatMap(p => p.members?.map(m => m._id) || [])).size}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Form
          form={searchForm}
          layout="inline"
          initialValues={filters}
          onValuesChange={(_, allValues) => handleFilterChange('search', allValues.search)}
        >
          <Form.Item name="search" style={{ flex: 1 }}>
            <Input 
              placeholder="Search projects by name or description..." 
              prefix={<SearchOutlined />}
              allowClear
            />
          </Form.Item>
          <Form.Item>
            <Select
              placeholder="Status"
              style={{ width: 140 }}
              allowClear
              value={filters.status}
              onChange={(v) => handleFilterChange('status', v)}
            >
              {Object.keys(projectStatusConfig).map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Select
              placeholder="Account"
              style={{ width: 160 }}
              allowClear
              showSearch
              value={filters.accountId}
              onChange={(v) => handleFilterChange('accountId', v)}
              optionFilterProp="children"
            >
              {accounts.map(account => (
                <Option key={account._id} value={account._id}>
                  {account.businessName}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Select
              placeholder="Service"
              style={{ width: 160 }}
              allowClear
              value={filters.serviceId}
              onChange={(v) => handleFilterChange('serviceId', v)}
            >
              {services.map(service => (
                <Option key={service._id} value={service._id}>
                  {service.serviceName}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Select
              placeholder="Priority"
              style={{ width: 130 }}
              allowClear
              value={filters.priority}
              onChange={(v) => handleFilterChange('priority', v)}
            >
              {priorityLevels.map(p => (
                <Option key={p.value} value={p.value}>{p.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Card>

      {/* View Toggle */}
      <Card>
        <Tabs 
          activeKey={viewMode} 
          onChange={setViewMode}
          tabBarExtraContent={
            <Text type="secondary">
              Showing {projects.length} of {projects.length} projects
            </Text>
          }
        >
          <TabPane tab="Board" key="board" />
          <TabPane tab="List" key="list" />
          <TabPane tab="Timeline" key="timeline" />
        </Tabs>

        {/* Content based on view mode */}
        {viewMode === 'board' && renderBoardView()}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'timeline' && renderTimelineView()}
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        width={720}
        open={drawerOpen}
        title={
          <Space>
            {editingProject ? <EditOutlined /> : <PlusOutlined />}
            <Text strong>{editingProject ? "Edit Project" : "Create New Project"}</Text>
          </Space>
        }
        onClose={() => {
          setDrawerOpen(false);
          setEditingProject(null);
          form.resetFields();
        }}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setDrawerOpen(false);
                setEditingProject(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" onClick={() => form.submit()}>
                {editingProject ? "Update Project" : "Create Project"}
              </Button>
            </Space>
          </div>
        }
      >
        <Form 
          layout="vertical" 
          form={form} 
          onFinish={saveProject}
          initialValues={{ status: "Planned", priority: "medium" }}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item 
                name="name" 
                label="Project Name" 
                rules={[{ required: true, message: 'Please enter project name' }]}
              >
                <Input 
                  placeholder="e.g., Website Redesign 2024"
                  disabled={editingProject && !canEdit(editingProject)}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Status">
                <Select disabled={editingProject && !canEdit(editingProject)}>
                  {Object.keys(projectStatusConfig).map(status => (
                    <Option key={status} value={status}>{status}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea 
              rows={3} 
              placeholder="Describe the project goals and objectives..."
              disabled={editingProject && !canEdit(editingProject)}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="accountId" 
                label="Account" 
                rules={[{ required: true, message: 'Please select account' }]}
              >
                <Select
                  disabled={isEmployee}
                  showSearch
                  placeholder="Select client account"
                  optionFilterProp="children"
                >
                  {accounts.map(a => (
                    <Option key={a._id} value={a._id}>{a.businessName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="serviceId" 
                label="Service" 
                rules={[{ required: true, message: 'Please select service' }]}
              >
                <Select
                  disabled={isEmployee}
                  placeholder="Select service type"
                >
                  {services.map(s => (
                    <Option key={s._id} value={s._id}>{s.serviceName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label="Priority">
                <Select placeholder="Select priority">
                  {priorityLevels.map(p => (
                    <Option key={p.value} value={p.value}>
                      <Space>
                        <Badge color={p.color} />
                        {p.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="members" label="Team Members">
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="Assign team members"
                  disabled={editingProject && !canEdit(editingProject)}
                  optionFilterProp="children"
                >
                  {users.map(u => (
                    <Option key={u._id} value={u._id}>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} />
                        {u.name}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dates" label="Project Timeline">
            <RangePicker 
              style={{ width: '100%' }} 
              disabled={editingProject && !canEdit(editingProject)}
              placeholder={['Start Date', 'End Date']}
            />
          </Form.Item>

          <Divider orientation="left">
            <Space>
              <CheckCircleOutlined />
              Project Steps
            </Space>
          </Divider>

          {(!editingProject || canEdit(editingProject)) ? (
            <Form.List name="steps">
              {(fields, { add, remove }) => (
                <div style={{ maxHeight: 400, overflowY: 'auto', padding: '0 4px' }}>
                  {fields.map(({ key, name, ...rest }) => (
                    <Card
                      key={key}
                      size="small"
                      style={{ marginBottom: 16, background: '#fafafa' }}
                      extra={
                        <Button 
                          type="text" 
                          danger 
                          icon={<DeleteOutlined />} 
                          onClick={() => remove(name)}
                          size="small"
                        />
                      }
                    >
                      <Row gutter={16}>
                        <Col span={16}>
                          <Form.Item
                            {...rest}
                            name={[name, "stepName"]}
                            label="Step Name"
                            rules={[{ required: true }]}
                            style={{ marginBottom: 12 }}
                          >
                            <Input placeholder="e.g., Design Review" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            {...rest}
                            name={[name, "status"]}
                            label="Status"
                            rules={[{ required: true }]}
                            style={{ marginBottom: 12 }}
                          >
                            <Select placeholder="Select status">
                              {Object.entries(stepStatusConfig).map(([value, config]) => (
                                <Option key={value} value={value}>
                                  <Space>
                                    {config.icon}
                                    {config.label}
                                  </Space>
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item {...rest} name={[name, "assignee"]} label="Assignee" style={{ marginBottom: 12 }}>
                            <Select
                              placeholder="Assign to"
                              allowClear
                              showSearch
                              optionFilterProp="children"
                            >
                              {users.map(u => (
                                <Option key={u._id} value={u._id}>
                                  <Space>
                                    <Avatar size="small" src={u.avatar} icon={<UserOutlined />} />
                                    {u.name}
                                  </Space>
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item {...rest} name={[name, "dueDate"]} label="Due Date" style={{ marginBottom: 12 }}>
                            <DatePicker style={{ width: '100%' }} placeholder="Select due date" />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item {...rest} name={[name, "description"]} label="Description" style={{ marginBottom: 0 }}>
                            <Input.TextArea rows={1} placeholder="Step description..." />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}

                  <Button
                    type="dashed"
                    onClick={() => add({ status: 'Pending' })}
                    block
                    icon={<PlusOutlined />}
                    style={{ marginBottom: 16 }}
                  >
                    Add New Step
                  </Button>
                </div>
              )}
            </Form.List>
          ) : (
            <Tag color="orange" style={{ display: 'block', textAlign: 'center', padding: 12 }}>
              Steps can only be modified by assigned team members or managers
            </Tag>
          )}

          <Divider orientation="left">
            <Space>
              <PaperClipOutlined />
              Attachments
            </Space>
          </Divider>

          <Form.List name="attachments">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Row key={key} gutter={8} style={{ marginBottom: 8 }}>
                    <Col span={20}>
                      <Form.Item {...rest} name={[name, "url"]} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                        <Input 
                          placeholder="File URL" 
                          disabled={editingProject && !canEdit(editingProject)}
                          addonBefore={<LinkOutlined />}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Button 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => remove(name)}
                        block
                      />
                    </Col>
                  </Row>
                ))}
                <Button 
                  type="dashed" 
                  onClick={() => add()} 
                  block 
                  icon={<UploadOutlined />}
                  style={{ marginTop: 8 }}
                >
                  Add Attachment
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer
        width={800}
        open={detailDrawerOpen}
        title={
          <Space>
            <EyeOutlined />
            <Text strong>Project Details: {detailProject?.name}</Text>
          </Space>
        }
        onClose={() => setDetailDrawerOpen(false)}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              {canEdit(detailProject) && (
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => {
                    setDetailDrawerOpen(false);
                    openEditDrawer(detailProject);
                  }}
                >
                  Edit Project
                </Button>
              )}
              <Button onClick={() => setDetailDrawerOpen(false)}>Close</Button>
            </Space>
          </div>
        }
      >
        {detailProject && (
          <div>
            {/* Header Section */}
            <Row gutter={16}>
              <Col span={16}>
                <Title level={5}>Description</Title>
                <Paragraph>{detailProject.description || 'No description provided'}</Paragraph>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Statistic
                    title="Overall Progress"
                    value={calculateProgress(detailProject.steps)}
                    suffix="%"
                    prefix={<CheckCircleOutlined />}
                  />
                  <Progress 
                    percent={calculateProgress(detailProject.steps)} 
                    showInfo={false} 
                    strokeColor={projectStatusConfig[detailProject.status]?.color}
                  />
                </Card>
              </Col>
            </Row>

            <Divider />

            {/* Project Info Grid */}
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small" title="Status" bordered={false}>
                  <Tag color={projectStatusConfig[detailProject.status]?.color} style={{ fontSize: 14, padding: '4px 8px' }}>
                    {projectStatusConfig[detailProject.status]?.icon} {detailProject.status}
                  </Tag>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="Priority" bordered={false}>
                  {detailProject.priority && (
                    <Tag color={priorityLevels.find(p => p.value === detailProject.priority)?.color}>
                      {detailProject.priority}
                    </Tag>
                  )}
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="Account" bordered={false}>
                  <Tag icon={<FolderOutlined />} color="blue">
                    {detailProject.accountId?.businessName}
                  </Tag>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="Service" bordered={false}>
                  <Tag icon={<PlayCircleOutlined />} color="cyan">
                    {detailProject.serviceId?.serviceName}
                  </Tag>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="Timeline" bordered={false}>
                  <Space direction="vertical">
                    <Space>
                      <CalendarOutlined />
                      Start: {detailProject.startDate ? dayjs(detailProject.startDate).format('MMM D, YYYY') : 'Not set'}
                    </Space>
                    <Space>
                      <ClockCircleOutlined />
                      End: {detailProject.endDate ? dayjs(detailProject.endDate).format('MMM D, YYYY') : 'Not set'}
                    </Space>
                  </Space>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="Team Members" bordered={false}>
                  <Avatar.Group maxCount={5}>
                    {detailProject.members?.map(member => (
                      <Tooltip key={member._id} title={member.name}>
                        <Avatar src={member.avatar} icon={<UserOutlined />}>
                          {member.name?.charAt(0)}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </Avatar.Group>
                </Card>
              </Col>
            </Row>

            <Divider orientation="left">
              <Space>
                <CheckCircleOutlined />
                Steps ({detailProject.steps?.length || 0})
              </Space>
            </Divider>

            {/* Steps Timeline */}
            <Timeline mode="left" style={{ marginTop: 16 }}>
              {detailProject.steps?.map((step, index) => {
                const statusConfig = stepStatusConfig[step.status] || stepStatusConfig.Pending;
                const dueStatus = getDueDateStatus(step.dueDate);
                
                return (
                  <Timeline.Item
                    key={index}
                    dot={statusConfig.icon}
                    color={statusConfig.color}
                  >
                    <Card 
                      size="small" 
                      style={{ 
                        marginBottom: 8,
                        borderLeft: `3px solid ${statusConfig.color}`,
                        backgroundColor: step.status === 'Completed' ? '#f6ffed' : 'white'
                      }}
                    >
                      <Row gutter={16} align="middle">
                        <Col span={12}>
                          <Text strong>{step.stepName}</Text>
                          {step.description && (
                            <div>
                              <Text type="secondary" style={{ fontSize: 12 }}>{step.description}</Text>
                            </div>
                          )}
                        </Col>
                        <Col span={6}>
                          <Tag color={statusConfig.color}>{step.status}</Tag>
                        </Col>
                        <Col span={6}>
                          {step.dueDate && (
                            <Tooltip title="Due Date">
                              <Tag 
                                color={dueStatus === 'overdue' ? 'red' : dueStatus === 'upcoming' ? 'orange' : 'default'}
                                icon={<ClockCircleOutlined />}
                              >
                                {dayjs(step.dueDate).format('MMM D')}
                              </Tag>
                            </Tooltip>
                          )}
                        </Col>
                      </Row>
                      {step.assignee && (
                        <div style={{ marginTop: 8 }}>
                          <Space>
                            <Avatar size="small" src={step.assignee.avatar} icon={<UserOutlined />} />
                            <Text type="secondary">{step.assignee.name}</Text>
                          </Space>
                        </div>
                      )}
                      {canEditStep(step) && step.status !== 'Completed' && (
                        <div style={{ marginTop: 8, textAlign: 'right' }}>
                          <Select
                            size="small"
                            value={step.status}
                            onChange={(value) => updateStepStatus(detailProject._id, index, value)}
                            style={{ width: 120 }}
                          >
                            {Object.entries(stepStatusConfig).map(([value, config]) => (
                              <Option key={value} value={value}>
                                <Space>
                                  {config.icon}
                                  {config.label}
                                </Space>
                              </Option>
                            ))}
                          </Select>
                        </div>
                      )}
                    </Card>
                  </Timeline.Item>
                );
              })}
            </Timeline>

            <Divider orientation="left">
              <Space>
                <PaperClipOutlined />
                Attachments ({detailProject.attachments?.length || 0})
              </Space>
            </Divider>

            {/* Attachments */}
            <List
              size="small"
              dataSource={detailProject.attachments || []}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<FileOutlined />} />}
                    title={<a href={item.url} target="_blank" rel="noopener noreferrer">{item.filename}</a>}
                    description={`Uploaded by ${item.uploadedBy?.name || 'Unknown'} on ${item.uploadedAt ? dayjs(item.uploadedAt).format('MMM D, YYYY') : 'Unknown date'}`}
                  />
                  <Button type="link" icon={<DownloadOutlined />} href={item.url} target="_blank" />
                </List.Item>
              )}
            />

            <Divider orientation="left">
              <Space>
                <CommentOutlined />
                Notes & Comments ({detailProject.notes?.length || 0})
              </Space>
            </Divider>

            {/* Notes */}
            <List
              size="small"
              dataSource={detailProject.notes || []}
              renderItem={(note, index) => (
                <List.Item
                  actions={[
                    <Button 
                      type="text" 
                      danger 
                      size="small"
                      onClick={() => deleteProjectNote(detailProject._id, note._id)}
                    >
                      Delete
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} src={note.author?.avatar} />}
                    title={
                      <Space>
                        <Text strong>{note.author?.name || 'Unknown'}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(note.timestamp).fromNow()}
                        </Text>
                      </Space>
                    }
                    description={note.text}
                  />
                </List.Item>
              )}
            />

            {/* Add Note */}
            <Form 
              form={noteForm} 
              onFinish={addNoteToProject}
              style={{ marginTop: 16 }}
            >
              <Row gutter={8}>
                <Col span={20}>
                  <Form.Item 
                    name="noteText" 
                    rules={[{ required: true, message: "Please enter a note" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input.TextArea 
                      placeholder="Add a comment or note..." 
                      rows={2}
                    />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    block
                    style={{ height: '100%' }}
                  >
                    Add
                  </Button>
                </Col>
              </Row>
            </Form>
          </div>
        )}
      </Drawer>

      {/* Step Modal for Quick Updates */}
      <Modal
        title="Update Step"
        open={stepModalVisible}
        onCancel={() => setStepModalVisible(false)}
        footer={null}
      >
        {selectedStep && (
          <Form
            layout="vertical"
            initialValues={selectedStep}
            onFinish={(values) => {
              // Handle step update
              setStepModalVisible(false);
            }}
          >
            <Form.Item name="status" label="Status">
              <Select>
                {Object.entries(stepStatusConfig).map(([value, config]) => (
                  <Option key={value} value={value}>
                    <Space>
                      {config.icon}
                      {config.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="dueDate" label="Due Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="assignee" label="Assignee">
              <Select
                showSearch
                placeholder="Assign to"
                optionFilterProp="children"
              >
                {users.map(u => (
                  <Option key={u._id} value={u._id}>
                    <Space>
                      <Avatar size="small" src={u.avatar} icon={<UserOutlined />} />
                      {u.name}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Update Step
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
} 