import React from "react";
import { 
  Drawer, 
  Tag, 
  Button, 
  Space, 
  Timeline, 
  Descriptions, 
  Divider, 
  Avatar, 
  List, 
  Input,      // Added missing import
  Alert       // Added for consistency
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  FileTextOutlined,
  UserOutlined,
  LinkOutlined,
  DownloadOutlined,
  MessageOutlined,
  EyeOutlined,
  CalendarOutlined,
  PaperClipOutlined,
  CommentOutlined,
  HistoryOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "./ClientProjectDashboard.css";

dayjs.extend(relativeTime);

const StepDrawer = ({ selectedStep, onClose, isMobile }) => {
  if (!selectedStep) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
        return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
      case "In Progress":
        return <LoadingOutlined style={{ color: "#1890ff" }} />;
      case "Review":
        return <EyeOutlined style={{ color: "#722ed1" }} />;
      case "On Hold":
        return <ClockCircleOutlined style={{ color: "#faad14" }} />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "success";
      case "In Progress":
        return "processing";
      case "Review":
        return "purple";
      case "On Hold":
        return "warning";
      default:
        return "default";
    }
  };

  const isOverdue =
    selectedStep.dueDate &&
    selectedStep.status !== "Completed" &&
    dayjs().isAfter(dayjs(selectedStep.dueDate));

  // Mock data for demonstration
  const activities = [
    { time: dayjs().subtract(2, 'hours'), text: 'Step started', user: 'John Doe' },
    { time: dayjs().subtract(1, 'day'), text: 'Documents uploaded', user: 'Jane Smith' },
    { time: dayjs().subtract(2, 'days'), text: 'Review requested', user: 'Mike Johnson' },
  ];

  const comments = [
    { author: 'John Doe', time: dayjs().subtract(3, 'hours'), text: 'Please review the latest changes' },
    { author: 'Jane Smith', time: dayjs().subtract(5, 'hours'), text: 'Looks good to me!' },
  ];

  const attachments = [
    { name: 'Project_Report.pdf', size: '2.4 MB', url: '#' },
    { name: 'Design_Specs.docx', size: '1.1 MB', url: '#' },
  ];

  return (
    <Drawer
      title={
        <div className="drawer-header">
          <Space align="center">
            {getStatusIcon(selectedStep.status)}
            <span className="drawer-title">{selectedStep.stepName}</span>
            <Tag 
              icon={getStatusIcon(selectedStep.status)} 
              color={getStatusColor(selectedStep.status)}
              className="status-tag"
            >
              {selectedStep.status}
            </Tag>
          </Space>
        </div>
      }
      placement="right"
      width={isMobile ? "100%" : 520}
      onClose={onClose}
      open={!!selectedStep}
      className="step-drawer"
      destroyOnClose
      closeIcon={<CloseOutlined />}
      extra={
        <Space>
          <Button icon={<DownloadOutlined />}>Download</Button>
          <Button type="primary" icon={<MessageOutlined />}>Comment</Button>
        </Space>
      }
    >
      <div className="drawer-content">
        {/* Overview Section */}
        <div className="drawer-section">
          <h4 className="section-title">
            <EyeOutlined /> Overview
          </h4>
          <Descriptions column={1} size="small" bordered={false} className="step-descriptions">
            <Descriptions.Item label="Description">
              {selectedStep.description || "No description provided"}
            </Descriptions.Item>
            <Descriptions.Item label="Due Date">
              <Space>
                <CalendarOutlined />
                <span className={isOverdue ? "overdue-text" : ""}>
                  {selectedStep.dueDate 
                    ? dayjs(selectedStep.dueDate).format("MMMM D, YYYY") 
                    : "No due date"}
                  {isOverdue && " (Overdue)"}
                </span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Assigned To">
              <Space>
                <UserOutlined />
                <span>{selectedStep.assignedTo || "Unassigned"}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              <Space>
                <ClockCircleOutlined />
                <span>{selectedStep.updatedAt 
                  ? dayjs(selectedStep.updatedAt).format("MMMM D, YYYY h:mm A")
                  : "N/A"}</span>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider className="drawer-divider" />

        {/* Attachments Section */}
        <div className="drawer-section">
          <h4 className="section-title">
            <PaperClipOutlined /> Attachments
          </h4>
          <List
            size="small"
            dataSource={attachments}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button type="link" icon={<DownloadOutlined />} size="small">
                    Download
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ color: '#1890ff' }} />}
                  title={<a href={item.url}>{item.name}</a>}
                  description={item.size}
                />
              </List.Item>
            )}
          />
          <Button type="dashed" block icon={<LinkOutlined />} className="upload-btn">
            Upload Attachment
          </Button>
        </div>

        <Divider className="drawer-divider" />

        {/* Activity Timeline */}
        <div className="drawer-section">
          <h4 className="section-title">
            <HistoryOutlined /> Activity
          </h4>
          <Timeline className="activity-timeline">
            {activities.map((activity, index) => (
              <Timeline.Item key={index} dot={<ClockCircleOutlined style={{ fontSize: '12px' }} />}>
                <div className="activity-item">
                  <span className="activity-text">{activity.text}</span>
                  <span className="activity-user">by {activity.user}</span>
                  <span className="activity-time">{dayjs(activity.time).fromNow()}</span>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </div>

        <Divider className="drawer-divider" />

        {/* Comments Section */}
        <div className="drawer-section">
          <h4 className="section-title">
            <CommentOutlined /> Comments ({comments.length})
          </h4>
          <List
            className="comments-list"
            itemLayout="horizontal"
            dataSource={comments}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space>
                      <span className="comment-author">{item.author}</span>
                      <span className="comment-time">{dayjs(item.time).fromNow()}</span>
                    </Space>
                  }
                  description={item.text}
                />
              </List.Item>
            )}
          />
          <div className="comment-input">
            <Input.TextArea 
              placeholder="Add a comment..." 
              rows={2}
              className="comment-textarea"
            />
            <Button type="primary" block className="comment-submit">
              Post Comment
            </Button>
          </div>
        </div>

        {/* Related Info */}
        <div className="drawer-footer">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Alert
              message="Need help?"
              description="Contact your project manager for assistance"
              type="info"
              showIcon
              icon={<MessageOutlined />}
            />
          </Space>
        </div>
      </div>
    </Drawer>
  );
};

export default StepDrawer;