// src/pages/TaskBoard.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo
} from "react";
import {
  Card,
  Tag,
  Button,
  Empty,
  Spin,
  Avatar,
  Badge,
  Typography,
  message,
  Select,
  Input,
  Row,
  Col,
  Tooltip,
  Space,
  Modal,
  Dropdown,
  Menu
} from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined
} from "@ant-design/icons";
import axios from "../../api/axios";
import moment from "moment";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./TaskManagement.css";

import TaskForm from "./TaskForm";
import TaskDetailsDrawer from "./TaskDetailsDrawer";

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

// Status configuration
const STATUS_ORDER = [
  "To Do",
  "In Progress",
  "Review",
  "Completed",
  "Overdue"
];

const STATUS_COLORS = {
  "To Do": "red",
  "In Progress": "orange",
  "Review": "blue",
  "Completed": "green",
  "Overdue": "purple"
};

const STATUS_ICONS = {
  "To Do": <ClockCircleOutlined />,
  "In Progress": <PlayCircleOutlined />,
  "Review": <EyeOutlined />,
  "Completed": <CheckCircleOutlined />,
  "Overdue": <ExclamationCircleOutlined />
};

const TaskBoard = () => {
  /* ================= STATE ================= */
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Users for filter
  const [allUsers, setAllUsers] = useState([]);

  // Drawers
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerEditingTask, setDrawerEditingTask] = useState(null);

  // Current user
  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    role: "Employee",
    _id: "temp",
    name: "Unknown"
  };

  const isPrivileged = [
    "Admin",
    "Superadmin",
    "SuperAdmin",
    "Team Leader"
  ].includes(currentUser.role);

  /* ================= FETCH USERS ================= */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get("/api/users");
      setAllUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ================= FETCH TASKS ================= */
  const fetchTasks = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();

        // Add filters to params
        if (!isPrivileged && !filterAssignedTo) {
          params.append("assignedTo", currentUser._id);
        } else if (filterAssignedTo) {
          params.append("assignedTo", filterAssignedTo);
        }

        if (filterStatus) params.append("status", filterStatus);
        if (search) params.append("search", search);
        if (filterPriority) params.append("isImportant", filterPriority === "important");

        // Add date range if selected
        if (dateRange && dateRange[0] && dateRange[1]) {
          params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
          params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
        }

        console.log("Fetching tasks with params:", params.toString());
        const res = await axios.get(`/api/tasks?${params.toString()}`);

        const rawTasks = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.tasks)
          ? res.data.tasks
          : [];

        // Normalize assignedTo to always be an array
        const normalizedTasks = rawTasks.map((t) => ({
          ...t,
          assignedTo: Array.isArray(t.assignedTo)
            ? t.assignedTo
            : t.assignedTo
            ? [t.assignedTo]
            : []
        }));

        setTasks(normalizedTasks);
        if (showRefreshing) message.success("Tasks refreshed");
      } catch (e) {
        console.error("Error fetching tasks:", e);
        message.error("Failed to load tasks");
        setTasks([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      search,
      filterStatus,
      filterAssignedTo,
      filterPriority,
      dateRange,
      currentUser._id,
      isPrivileged
    ]
  );

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, filterStatus, filterAssignedTo, filterPriority, dateRange]);

  /* ================= GROUP TASKS BY STATUS ================= */
  const grouped = useMemo(() => {
    const groups = {};
    STATUS_ORDER.forEach((status) => (groups[status] = []));

    tasks.forEach((task) => {
      // Check if task is overdue
      const isOverdue =
        task.dueDate &&
        moment(task.dueDate).isBefore(moment(), "day") &&
        task.status !== "Completed";

      const statusKey = isOverdue ? "Overdue" : task.status || "To Do";
      
      if (groups[statusKey]) {
        groups[statusKey].push(task);
      } else {
        groups["To Do"].push(task);
      }
    });

    return groups;
  }, [tasks]);

  /* ================= DRAG AND DROP ================= */
  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const newStatus = destination.droppableId === "Overdue"
      ? grouped[source.droppableId][source.index].status
      : destination.droppableId;

    // Optimistically update UI
    const updatedTasks = tasks.map(task =>
      task._id === draggableId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasks);

    try {
      await axios.put(`/api/tasks/${draggableId}`, { status: newStatus });
      message.success(`Task moved to ${newStatus}`);
    } catch (error) {
      // Revert on error
      fetchTasks();
      message.error("Failed to update task status");
    }
  };

  /* ================= DELETE TASK ================= */
  const showDeleteConfirm = (task) => {
    confirm({
      title: "Delete Task",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${task.title}"?`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        try {
          await axios.delete(`/api/tasks/${task._id}`);
          message.success("Task deleted successfully");
          fetchTasks();
          if (selectedTask?._id === task._id) {
            setDetailsVisible(false);
            setSelectedTask(null);
          }
        } catch (error) {
          message.error("Failed to delete task");
        }
      }
    });
  };

  /* ================= STATISTICS ================= */
  const getStatistics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const inProgress = tasks.filter(t => t.status === "In Progress").length;
    const todo = tasks.filter(t => t.status === "To Do").length;
    const overdue = tasks.filter(t => {
      return t.dueDate &&
        moment(t.dueDate).isBefore(moment(), "day") &&
        t.status !== "Completed";
    }).length;
    const important = tasks.filter(t => t.isImportant).length;

    return { total, completed, inProgress, todo, overdue, important };
  }, [tasks]);

  /* ================= RENDER TASK CARD ================= */
  const renderTaskCard = (task, index) => (
    <Draggable key={task._id} draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
            transform: snapshot.isDragging ? provided.draggableProps.style?.transform : "none"
          }}
        >
          <Badge.Ribbon
            text={task.isImportant ? "IMPORTANT" : null}
            color={task.isImportant ? "red" : "transparent"}
            style={{ display: task.isImportant ? "block" : "none" }}
          >
            <div className="task-card-item" onClick={() => {
              setSelectedTask(task);
              setDetailsVisible(true);
            }}>
              {/* Task Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Title level={5} style={{ margin: 0, flex: 1 }}>
                  {task.title}
                </Title>
                <Tag color={STATUS_COLORS[task.status]} style={{ marginLeft: 8 }}>
                  {STATUS_ICONS[task.status]} {task.status}
                </Tag>
              </div>

              {/* Description Preview */}
              {task.description && (
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                  {task.description.length > 60
                    ? task.description.slice(0, 60) + "..."
                    : task.description}
                </Text>
              )}

              {/* Assigned Users and Due Date */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12
              }}>
                <Avatar.Group
                  maxCount={3}
                  size="small"
                  maxStyle={{ color: "#f56a00", backgroundColor: "#fde3cf", cursor: "pointer" }}
                >
                  {task.assignedTo.map((user) => (
                    <Tooltip title={user.name || "Unknown"} key={user._id}>
                      <Avatar src={user.profileImage} style={{ backgroundColor: "#1677ff" }}>
                        {user.name?.charAt(0)?.toUpperCase() || "U"}
                      </Avatar>
                    </Tooltip>
                  ))}
                </Avatar.Group>

                <Space size={4}>
                  <CalendarOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
                  <Text style={{ fontSize: 12, color: "#8c8c8c" }}>
                    {task.dueDate
                      ? moment(task.dueDate).format("MMM Do")
                      : "No due date"}
                  </Text>
                </Space>
              </div>

              {/* Quick Actions */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 8,
                borderTop: "1px solid #f0f0f0",
                paddingTop: 8
              }}>
                <Tooltip title="View Details">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTask(task);
                      setDetailsVisible(true);
                    }}
                  />
                </Tooltip>
                {isPrivileged && (
                  <>
                    <Tooltip title="Edit">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerEditingTask(task);
                          setDrawerVisible(true);
                        }}
                      />
                    </Tooltip>
                    {/* <Tooltip title="Delete">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          showDeleteConfirm(task);
                        }}
                      />
                    </Tooltip> */}
                  </>
                )}
              </div>
            </div>
          </Badge.Ribbon>
        </div>
      )}
    </Draggable>
  );

  /* ================= RENDER STATS CARDS ================= */
 
  /* ================= RENDER FILTERS ================= */
  const renderFilters = () => (
    <Card size="small" style={{ marginBottom: 16, background: "#fafafa" }}>
      <Row gutter={[12, 12]} align="middle">
        <Col xs={24} sm={8} md={6} lg={5}>
          <Input.Search
            placeholder="Search tasks..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<FilterOutlined style={{ color: "#bfbfbf" }} />}
          />
        </Col>

        <Col xs={12} sm={5} md={4} lg={3}>
          <Select
            placeholder="Status"
            allowClear
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: "100%" }}
          >
            <Option value="">All</Option>
            {STATUS_ORDER.map((s) => (
              <Option key={s} value={s}>
                {STATUS_ICONS[s]} {s}
              </Option>
            ))}
          </Select>
        </Col>

        <Col xs={12} sm={5} md={4} lg={3}>
          <Select
            placeholder="Priority"
            allowClear
            value={filterPriority}
            onChange={setFilterPriority}
            style={{ width: "100%" }}
          >
            <Option value="">All</Option>
            <Option value="important">Important</Option>
            <Option value="normal">Normal</Option>
          </Select>
        </Col>

        {isPrivileged && (
          <Col xs={24} sm={6} md={5} lg={4}>
            <Select
              placeholder="Assigned To"
              allowClear
              showSearch
              value={filterAssignedTo}
              onChange={setFilterAssignedTo}
              optionFilterProp="children"
              style={{ width: "100%" }}
            >
              <Option value="">All Users</Option>
              {allUsers.map((u) => (
                <Option key={u._id} value={u._id}>
                  <Space>
                    <Avatar src={u.profileImage} size="small">
                      {u.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    {u.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
        )}

        <Col xs={24} sm={24} md={5} lg={4}>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchTasks(true)}
              loading={refreshing}
            >
              Refresh
            </Button>
            {isPrivileged && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setDrawerEditingTask(null);
                  setDrawerVisible(true);
                }}
              >
                New Task
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Active Filters Display */}
      {(search || filterStatus || filterAssignedTo || filterPriority) && (
        <div style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ marginRight: 8 }}>Active Filters:</Text>
          {search && <Tag closable onClose={() => setSearch("")}>Search: {search}</Tag>}
          {filterStatus && <Tag closable onClose={() => setFilterStatus("")}>Status: {filterStatus}</Tag>}
          {filterPriority && <Tag closable onClose={() => setFilterPriority("")}>Priority: {filterPriority}</Tag>}
          {filterAssignedTo && (
            <Tag closable onClose={() => setFilterAssignedTo("")}>
              Assigned to: {allUsers.find(u => u._id === filterAssignedTo)?.name}
            </Tag>
          )}
        </div>
      )}
    </Card>
  );

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Task Board</Title>
        <Text type="secondary">Manage and track your team's tasks</Text>
      </div>

      {/* Statistics */}

      {/* Filters */}
      {renderFilters()}

      {/* Main Content */}
      <Card bordered={false} style={{ borderRadius: 8 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" tip="Loading tasks..." />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="kanban-board-row">
              {STATUS_ORDER.map((status) => (
                <div key={status} className="kanban-column">
                  <Card
                    size="small"
                    title={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Space>
                          {STATUS_ICONS[status]}
                          <Text strong style={{ color: STATUS_COLORS[status] }}>
                            {status}
                          </Text>
                        </Space>
                        <Tag color={STATUS_COLORS[status]}>{grouped[status].length}</Tag>
                      </div>
                    }
                    style={{ height: "100%" }}
                    bodyStyle={{ padding: "8px" }}
                  >
                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="task-list"
                          style={{
                            backgroundColor: snapshot.isDraggingOver ? "#f0f5ff" : "transparent",
                            transition: "background-color 0.2s ease"
                          }}
                        >
                          {grouped[status].map((task, index) => renderTaskCard(task, index))}
                          {provided.placeholder}
                          {grouped[status].length === 0 && (
                            <Empty
                              description={`No ${status} tasks`}
                              style={{ padding: "20px 0" }}
                            />
                          )}
                        </div>
                      )}
                    </Droppable>
                  </Card>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </Card>

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        visible={detailsVisible}
        task={selectedTask}
        onClose={() => {
          setDetailsVisible(false);
          setSelectedTask(null);
        }}
        onEdit={(task) => {
          setDrawerEditingTask(task);
          setDrawerVisible(true);
          setDetailsVisible(false);
        }}
        onDeleted={() => {
          fetchTasks();
          setSelectedTask(null);
        }}
      />

      {/* Task Form Drawer */}
      <TaskForm
        visible={drawerVisible}
        editing={drawerEditingTask}
        onClose={() => {
          setDrawerVisible(false);
          setDrawerEditingTask(null);
        }}
        onSaved={() => {
          setDrawerVisible(false);
          setDrawerEditingTask(null);
          fetchTasks();
        }}
      />
    </div>
  );
};

export default TaskBoard;