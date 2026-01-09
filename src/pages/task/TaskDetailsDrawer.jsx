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
  Card
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CopyOutlined,
  FireOutlined
} from "@ant-design/icons";
import moment from "moment";
import AttachmentList from "../../components/attachments/AttachmentList";

const { Title, Text } = Typography;

const TaskDetailsDrawer = ({
  visible,
  task,
  onClose,
  onEdit,
  onDeleted
}) => {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* RESET LOADERS */
  useEffect(() => {
    if (!visible) {
      setEditing(false);
      setDeleting(false);
    }
  }, [visible]);

  if (!task) return null;

  const handleEdit = () => {
    setEditing(true);
    onEdit?.(task);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onDeleted?.(task);
    } finally {
      setDeleting(false);
      onClose?.();
    }
  };

  /* 🔥 COPY DESCRIPTION */
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
            onConfirm={handleDelete}
            okText="Yes"
            cancelText="No"
            disabled={editing || deleting}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleting}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      {/* TITLE */}
      <Title level={4}>{task.title}</Title>

      {/* STATUS */}
      <Space>
        <Tag color="blue">{task.status}</Tag>
        {task.isImportant && <Tag color="red">Important</Tag>}
      </Space>

      <Divider />

      {/* DESCRIPTION HEADER */}
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={5} style={{ margin: 0 }}>
          Description
        </Title>

        {task.description && (
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopyDescription}
          >
            Copy
          </Button>
        )}
      </Space>

      {/* DESCRIPTION */}
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
          task.assignedTo.map((u) => (
            <Space key={u._id}>
              <Avatar
                src={u.profileImage || null}
                style={{ backgroundColor: "#1677ff" }}
              >
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
          <CalendarOutlined /> Assigned Date:{" "}
          {task.assignedDate
            ? moment(task.assignedDate).format("MMM Do YYYY")
            : "-"}
        </Text>

        <Text>
          <CalendarOutlined /> Due Date:{" "}
          {task.dueDate
            ? moment(task.dueDate).format("MMM Do YYYY")
            : "-"}
        </Text>
      </Space>

      <Divider />

      {/* ATTACHMENTS */}
      <Title level={5}>Attachments</Title>
      <AttachmentList
        extraAttachment={task.extraAttachment}
        attachments={task.attachments}
      />

      <Divider />

      {/* ================= NOTES HISTORY ================= */}
      <Title level={5}>Reason / Notes History</Title>

      {Array.isArray(task.reasonHistory) && task.reasonHistory.length > 0 ? (
        task.reasonHistory
          .slice()
          .reverse()
          .map((note, index) => (
            <Card key={index} size="small" style={{ marginBottom: 8 }}>
              <Space align="start">
                <Avatar
                  src={note.addedBy?.profileImage || null}
                  style={{ backgroundColor: "#13c2c2" }}
                >
                  {note.addedBy?.name?.charAt(0).toUpperCase()}
                </Avatar>

                <div>
                  <Text strong>{note.addedBy?.name || "User"}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {moment(note.createdAt).format(
                      "DD MMM YYYY, hh:mm A"
                    )}
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {note.text}
                  </div>
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
    </Drawer>
  );
};

export default TaskDetailsDrawer;
