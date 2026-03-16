// src/pages/TaskDetailsDrawer.jsx
import React, { useState, useEffect } from "react";
import {
  Drawer,
  Typography,
  Button,
  Space,
  Divider,
  Tag,
  Avatar,
  Popconfirm,
  notification,
  Card,
  Row,
  Col,
  Progress,
  Badge,
  message
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CopyOutlined,
  FireOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import moment from "moment";
import axios from "../../api/axios"; // Add this import
import AttachmentList from "../../components/attachments/AttachmentList";

const { Title, Text } = Typography;

const getCurrentUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user || { _id: "temp", name: "You", role: "Employee" };
  } catch {
    return { _id: "temp", name: "You", role: "Employee" };
  }
};

/* ---------- HELPER TO GET CLIENT STATUS ---------- */
const getClientStatus = (client) => {
  if (!client) return null;
  
  const staticPosts = client.staticPosts || 0;
  const deliveredStatic = client.deliveredStatic || 0;
  const reels = client.reels || 0;
  const deliveredReels = client.deliveredReels || 0;
  
  const totalPosts = staticPosts + reels;
  const totalDelivered = deliveredStatic + deliveredReels;
  
  const staticProgress = staticPosts > 0 ? Math.round((deliveredStatic / staticPosts) * 100) : 0;
  const reelsProgress = reels > 0 ? Math.round((deliveredReels / reels) * 100) : 0;
  const completionPercent = totalPosts > 0 ? Math.round((totalDelivered / totalPosts) * 100) : 0;
  
  let status = "Pending";
  let color = "orange";
  let icon = "⏳";
  
  if (totalDelivered === 0) {
    status = "Pending";
    color = "orange";
    icon = "⏳";
  } else if (totalDelivered === totalPosts) {
    status = "Completed";
    color = "green";
    icon = "✅";
  } else {
    status = "In Progress";
    color = "blue";
    icon = "🔄";
  }
  
  return {
    status,
    color,
    icon,
    completionPercent,
    staticProgress,
    reelsProgress,
    totalPosts,
    totalDelivered,
    staticPosts,
    deliveredStatic,
    reels,
    deliveredReels
  };
};

const TaskDetailsDrawer = ({ visible, task, onClose, onEdit, onDeleted, onDeleteSuccess }) => {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clientDetails, setClientDetails] = useState(null);

  useEffect(() => {
    if (!visible) {
      setEditing(false);
      setDeleting(false);
      setClientDetails(null);
    }
  }, [visible]);

  useEffect(() => {
    if (task?.monthlyClientId && typeof task.monthlyClientId === 'object') {
      const status = getClientStatus(task.monthlyClientId);
      setClientDetails({
        ...task.monthlyClientId,
        ...status
      });
    } else {
      setClientDetails(null);
    }
  }, [task]);

  if (!task) return null;

  const handleEdit = () => {
    setEditing(true);
    onEdit?.(task);
  };

  const handleDelete = async () => {
    if (!task?._id) {
      message.error("Invalid task ID");
      return;
    }

    try {
      setDeleting(true);
      
      console.log("Deleting task with ID:", task._id);
      
      // Direct API call to delete the task
      const response = await axios.delete(`/api/tasks/${task._id}`);
      
      console.log("Delete response:", response.data);
      message.success("Task deleted successfully");
      
      // Call the onDeleteSuccess callback if provided
      if (onDeleteSuccess) {
        onDeleteSuccess(task._id);
      }
      
      // Also call onDeleted for backward compatibility
      if (onDeleted) {
        onDeleted(task);
      }
      
      // Close the drawer
      onClose?.();
      
    } catch (error) {
      console.error("Delete error:", error);
      
      // Better error handling
      if (error.response) {
        // Server responded with error
        message.error(error.response.data?.message || "Failed to delete task");
      } else if (error.request) {
        // Request made but no response
        message.error("No response from server. Please check your connection.");
      } else {
        // Something else happened
        message.error("Error: " + error.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyDescription = async () => {
    if (!task.description) return;

    try {
      await navigator.clipboard.writeText(task.description);

      notification.open({
        message: "Copied Successfully 🔥",
        description: "Description copied to clipboard",
        icon: <FireOutlined style={{ color: "#ff4d4f" }} />,
        placement: "top",
        duration: 1.8
      });
    } catch {
      notification.open({
        message: "Copy Failed",
        description: "Unable to copy description",
        placement: "top",
        duration: 2
      });
    }
  };

  const currentUser = getCurrentUser();

  return (
    <Drawer
      title="Task Details"
      width={560}
      open={visible}
      onClose={onClose}
      destroyOnClose
      footer={
        <Space style={{ float: "right" }}>
          <Button onClick={onClose} disabled={editing || deleting}>
            Close
          </Button>

          <Button
            type="primary"
            icon={<EditOutlined />}
            loading={editing}
            disabled={!onEdit || deleting}
            onClick={handleEdit}
          >
            Edit
          </Button>

          <Popconfirm
            title="Delete this task?"
            description="Are you sure you want to delete this task? This action cannot be undone."
            onConfirm={handleDelete}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true, loading: deleting }}
            cancelButtonProps={{ disabled: deleting }}
            disabled={editing || deleting}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              loading={deleting}
              disabled={editing}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      {/* TITLE */}
      <Title level={4}>{task.title}</Title>

      {/* STATUS */}
      <Space wrap>
        <Tag color="blue">{task.status}</Tag>
        {task.isImportant && <Tag color="red">Important</Tag>}
        {task.monthlyClientId && (
          <Tag color="purple" icon={<FileTextOutlined />}>
            Monthly Content
          </Tag>
        )}
      </Space>

      <Divider />

      {/* MONTHLY CONTENT DETAILS - NEW SECTION */}
      {clientDetails && (
        <>
          <Card 
            size="small" 
            style={{ 
              marginBottom: 16, 
              background: '#f6f6f6',
              border: '1px solid #d9d9d9'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Space>
                <FileTextOutlined style={{ color: '#722ed1' }} />
                <Title level={5} style={{ margin: 0 }}>Monthly Content Progress</Title>
              </Space>
              <Badge 
                count={clientDetails.status} 
                style={{ backgroundColor: clientDetails.color }} 
              />
            </div>

            {/* Business Name */}
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 12 }}>
              {clientDetails.businessName || 'Client'}
            </Text>

            {/* Overall Progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">Overall Completion</Text>
                <Text strong style={{ color: clientDetails.color }}>
                  {clientDetails.completionPercent}%
                </Text>
              </div>
              <Progress 
                percent={clientDetails.completionPercent} 
                size="small"
                strokeColor={clientDetails.color}
                showInfo={false}
              />
            </div>

            {/* Static Posts Progress */}
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={12}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space>
                    <FileTextOutlined style={{ color: '#1890ff' }} />
                    <Text type="secondary">Static Posts</Text>
                  </Space>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>{clientDetails.deliveredStatic}/{clientDetails.staticPosts}</Text>
                    <Text type="secondary">{clientDetails.staticProgress}%</Text>
                  </div>
                  <Progress 
                    percent={clientDetails.staticProgress} 
                    size="small"
                    strokeColor="#1890ff"
                    showInfo={false}
                  />
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space>
                    <PlayCircleOutlined style={{ color: '#722ed1' }} />
                    <Text type="secondary">Reels</Text>
                  </Space>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>{clientDetails.deliveredReels}/{clientDetails.reels}</Text>
                    <Text type="secondary">{clientDetails.reelsProgress}%</Text>
                  </div>
                  <Progress 
                    percent={clientDetails.reelsProgress} 
                    size="small"
                    strokeColor="#722ed1"
                    showInfo={false}
                  />
                </Space>
              </Col>
            </Row>

            {/* Summary */}
            <div style={{ 
              marginTop: 12, 
              padding: 8, 
              background: '#fff',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16
            }}>
              <Text>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />{' '}
                {clientDetails.totalDelivered} Delivered
              </Text>
              <Text type="secondary">of</Text>
              <Text>{clientDetails.totalPosts} Total</Text>
            </div>
          </Card>
          <Divider />
        </>
      )}

      {/* DESCRIPTION */}
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={5} style={{ margin: 0 }}>Description</Title>
        {task.description && (
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopyDescription}>
            Copy
          </Button>
        )}
      </Space>
      <textarea
        readOnly
        value={task.description || ""}
        placeholder="No description provided"
        style={{
          width: "100%",
          marginTop: 8,
          padding: 12,
          minHeight: 160,
          maxHeight: 300,
          resize: "vertical",
          borderRadius: 6,
          border: "1px solid #d9d9d9",
          background: "#fafafa",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "inherit"
        }}
      />

      <Divider />

      {/* ASSIGNED USERS */}
      <Title level={5}>Assigned To</Title>
      <Space direction="vertical" size={12}>
        {Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? (
          task.assignedTo.map(u => (
            <Space key={u._id}>
              <Avatar src={u.profileImage || null} style={{ backgroundColor: "#1677ff" }}>
                {u.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Text strong>{u.name}</Text>
            </Space>
          ))
        ) : (
          <Text type="secondary">No users assigned</Text>
        )}
      </Space>

      <Divider />

      {/* DATES */}
      <Title level={5}>Dates</Title>
      <Space direction="vertical">
        <Text>
          <CalendarOutlined /> Assigned Date: {task.assignedDate ? moment(task.assignedDate).format("MMM Do YYYY") : "-"}
        </Text>
        <Text>
          <CalendarOutlined /> Due Date: {task.dueDate ? moment(task.dueDate).format("MMM Do YYYY") : "-"}
        </Text>
        {task.startTime && (
          <Text>
            <CalendarOutlined /> Start Time: {task.startTime}
          </Text>
        )}
      </Space>

      <Divider />

      {/* ATTACHMENTS */}
      <Title level={5}>Attachments</Title>
      <AttachmentList extraAttachment={task.extraAttachment} attachments={task.attachments} />

      <Divider />

      {/* NOTES HISTORY */}
      <Title level={5}>Reason / Notes History</Title>
      {Array.isArray(task.reasonHistory) && task.reasonHistory.length > 0 ? (
        task.reasonHistory.slice().reverse().map((note, i) => (
          <Card key={i} size="small" style={{ marginBottom: 8 }}>
            <Space align="start">
              <Avatar src={note.addedBy?.profileImage || null} style={{ backgroundColor: "#13c2c2" }}>
                {note.addedBy?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Text strong>{note.addedBy?.name || "User"}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {moment(note.createdAt).format("DD MMM YYYY, hh:mm A")}
                </Text>
                <div style={{ marginTop: 4 }}>{note.text}</div>
              </div>
            </Space>
          </Card>
        ))
      ) : (
        <Text type="secondary">No notes added yet</Text>
      )}

      <Divider />

      {/* ASSIGNED BY */}
      <Text type="secondary">
        Assigned By: <b>{task.assignedBy?.name || "-"}</b>
      </Text>

      {/* REASON if exists */}
      {task.reason && (
        <>
          <Divider />
          <Title level={5}>Reason</Title>
          <Text>{task.reason}</Text>
        </>
      )}

      {/* Account and Service info if exists */}
      {(task.accountId || task.serviceId) && (
        <>
          <Divider />
          <Title level={5}>Related To</Title>
          <Space direction="vertical">
            {task.accountId && (
              <Text>
                Account: <b>{typeof task.accountId === 'object' ? task.accountId.businessName : task.accountId}</b>
              </Text>
            )}
            {task.serviceId && (
              <Text>
                Service: <b>{typeof task.serviceId === 'object' ? task.serviceId.serviceName : task.serviceId}</b>
              </Text>
            )}
          </Space>
        </>
      )}
    </Drawer>
  );
};

export default TaskDetailsDrawer;