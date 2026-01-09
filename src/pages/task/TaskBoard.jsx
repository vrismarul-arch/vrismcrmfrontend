import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Space
} from "antd";
import { PlusOutlined, CalendarOutlined } from "@ant-design/icons";
import axios from "../../api/axios";
import moment from "moment";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./TaskManagement.css";

import TaskForm from "./TaskForm";
import TaskDetailsDrawer from "./TaskDetailsDrawer";

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_ORDER = ["To Do", "In Progress", "Review", "Completed", "Overdue"];
const STATUS_COLORS = {
  "To Do": "red",
  "In Progress": "orange",
  Review: "blue",
  Completed: "green",
  Overdue: "#7f00ff"
};

const TaskBoard = () => {
  /* ================= STATE ================= */
  const [tasks, setTasks] = useState([]); // ✅ ALWAYS ARRAY
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerEditingTask, setDrawerEditingTask] = useState(null);

  const currentUser =
    JSON.parse(localStorage.getItem("user")) || {
      role: "Employee",
      _id: "temp",
      name: "Unknown"
    };

  const isPrivileged =
    ["Admin", "Superadmin", "SuperAdmin", "Team Leader"].includes(
      currentUser.role
    );

  /* ================= USERS ================= */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get("/api/users");
      setAllUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ================= TASKS (SAFE) ================= */
  const fetchTasks = useCallback(
    async (opts = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();

        const qSearch = opts.search ?? search;
        const qStatus = opts.status ?? filterStatus;
        const qAssignedTo = opts.assignedTo ?? filterAssignedTo;

        if (!isPrivileged && !qAssignedTo) {
          params.append("assignedTo", currentUser._id);
        } else if (qAssignedTo) {
          params.append("assignedTo", qAssignedTo);
        }

        if (qStatus) params.append("status", qStatus);
        if (qSearch) params.append("search", qSearch);

        const res = await axios.get(`/api/tasks?${params.toString()}`);

        // ✅ ABSOLUTE SAFETY
        const safeTasks = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.tasks)
          ? res.data.tasks
          : [];

        setTasks(safeTasks);
      } catch (e) {
        console.error(e);
        message.error("Failed to load tasks");
        setTasks([]); // ✅ NEVER BREAK
      } finally {
        setLoading(false);
      }
    },
    [search, filterStatus, filterAssignedTo, currentUser._id, isPrivileged]
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchTasks({
        search,
        status: filterStatus,
        assignedTo: filterAssignedTo
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search, filterStatus, filterAssignedTo, fetchTasks]);

  /* ================= GROUP TASKS (SAFE) ================= */
  const grouped = useMemo(() => {
    const grouped = {};
    STATUS_ORDER.forEach((s) => (grouped[s] = []));

    (Array.isArray(tasks) ? tasks : []).forEach((t) => {
      const overdue =
        t.dueDate &&
        moment(t.dueDate).isBefore(moment(), "day") &&
        t.status !== "Completed";

      const key = overdue ? "Overdue" : t.status || "To Do";
      grouped[key].push(t);
    });

    return grouped;
  }, [tasks]);

  /* ================= DRAG ================= */
  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const newStatus =
      destination.droppableId === "Overdue"
        ? grouped[source.droppableId][source.index].status
        : destination.droppableId;

    try {
      await axios.put(`/api/tasks/${draggableId}`, { status: newStatus });
      fetchTasks();
    } catch {
      message.error("Failed to update task");
      fetchTasks();
    }
  };

  /* ================= UI ================= */
  return (
    <Card
      title={<Title level={4}>Task Board</Title>}
      extra={
        isPrivileged && (
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
        )
      }
    >
      {/* FILTERS */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={10} md={8} lg={6}>
          <Input.Search
            placeholder="Search task..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>

        <Col xs={12} sm={6} md={5} lg={4}>
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
                {s}
              </Option>
            ))}
          </Select>
        </Col>

        <Col xs={12} sm={8} md={6} lg={6}>
          <Select
            placeholder="Assigned To"
            allowClear
            showSearch
            value={filterAssignedTo}
            onChange={setFilterAssignedTo}
            optionFilterProp="children"
            style={{ width: "100%" }}
          >
            <Option value="">All</Option>
            {allUsers.map((u) => (
              <Option key={u._id} value={u._id}>
                {u.name}
              </Option>
            ))}
          </Select>
        </Col>
      </Row>

      {loading ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board-row">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="kanban-column">
                <Card
                  size="small"
                  title={
                    <Space>
                      <Title
                        level={5}
                        style={{ margin: 0, color: STATUS_COLORS[status] }}
                      >
                        {status}
                      </Title>
                      <Tag>{grouped[status].length}</Tag>
                    </Space>
                  }
                >
                  <Droppable droppableId={status}>
                    {(p) => (
                      <div
                        ref={p.innerRef}
                        {...p.droppableProps}
                        className="task-list"
                      >
                        {grouped[status].map((task, index) => (
                          <Draggable
                            key={task._id}
                            draggableId={task._id}
                            index={index}
                          >
                            {(prov) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                              >
                                {task.isImportant ? (
                                  <Badge.Ribbon text="IMPORTANT">
                                    <TaskCard
                                      task={task}
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setDetailsVisible(true);
                                      }}
                                    />
                                  </Badge.Ribbon>
                                ) : (
                                  <TaskCard
                                    task={task}
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setDetailsVisible(true);
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {p.placeholder}
                        {!grouped[status].length && (
                          <Empty description="No tasks" />
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

      <TaskDetailsDrawer
        visible={detailsVisible}
        task={selectedTask}
        onClose={() => setDetailsVisible(false)}
        onEdit={(t) => {
          setDrawerEditingTask(t);
          setDrawerVisible(true);
          setDetailsVisible(false);
        }}
        onDeleted={fetchTasks}
      />

      <TaskForm
        visible={drawerVisible}
        editing={drawerEditingTask}
        onClose={() => setDrawerVisible(false)}
        onSaved={() => {
          setDrawerVisible(false);
          fetchTasks();
        }}
      />
    </Card>
  );
};

/* ================= TASK CARD ================= */
const TaskCard = ({ task, onClick }) => (
  <div className="task-card-item" onClick={onClick}>
    <Title level={5} style={{ marginBottom: 6 }}>
      {task.title}
    </Title>

    {task.description && (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {task.description.length > 80
          ? task.description.slice(0, 80) + "..."
          : task.description}
      </Text>
    )}

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10
      }}
    >
      <Avatar.Group maxCount={4} size="small">
        {task.assignedTo?.map((u) => (
          <Tooltip title={u.name} key={u._id}>
            <Avatar src={u.profileImage || undefined}>
              {u.name?.charAt(0)?.toUpperCase()}
            </Avatar>
          </Tooltip>
        ))}
      </Avatar.Group>

      <Space>
        <CalendarOutlined />
        <Text style={{ fontSize: 12 }}>
          {task.dueDate
            ? moment(task.dueDate).format("MMM Do")
            : "No Due"}
        </Text>
      </Space>
    </div>
  </div>
);

export default TaskBoard;
                                  