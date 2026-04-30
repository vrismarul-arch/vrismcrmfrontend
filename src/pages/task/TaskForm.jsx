// src/pages/TaskForm.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Drawer,
  Form,
  Input,
  Select,
  Row,
  Col,
  Button,
  message,
  Card,
  Typography,
  Switch,
  TimePicker,
  Upload,
  Spin,
  Badge,
  Progress,
  Tag,
  InputNumber,
  Space,
  Modal,
  Divider,
  Tooltip,
  Avatar,
  Alert,
  Statistic,
  Steps,
  Timeline
} from "antd";
import { 
  InboxOutlined, 
  EditOutlined, 
  SaveOutlined, 
  ReloadOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseOutlined,
  PlusOutlined,
  HistoryOutlined,
  BarChartOutlined,
  LinkOutlined,
  PaperClipOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  WarningOutlined
} from "@ant-design/icons";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import axios from "../../api/axios";
import { uploadFile } from "../../utils/fileStorage";
import "./TaskForm.css";

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { Dragger } = Upload;

/* ---------- FILE TYPES ---------- */
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/* ---------- HELPER TO GET CURRENT USER ---------- */
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
  let icon = <ClockCircleOutlined />;
  
  if (totalDelivered === 0) {
    status = "Pending";
    color = "orange";
    icon = <ClockCircleOutlined />;
  } else if (totalDelivered === totalPosts) {
    status = "Completed";
    color = "green";
    icon = <CheckCircleOutlined />;
  } else {
    status = "In Progress";
    color = "blue";
    icon = <PlayCircleOutlined />;
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

const TaskForm = ({ visible, onClose, editing, onSaved }) => {
  const [form] = Form.useForm();

  /* ---------- CURRENT USER ---------- */
  const currentUser = getCurrentUser();
  const isPrivileged = ["Admin", "Superadmin", "SuperAdmin", "Team Leader"].includes(
    currentUser.role
  );

  /* ---------- STATE ---------- */
  const [allUsers, setAllUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [services, setServices] = useState([]);
  const [monthlyClients, setMonthlyClients] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [selectedClientDetails, setSelectedClientDetails] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Editing states for content
  const [contentForm] = Form.useForm();
  const [updatingContent, setUpdatingContent] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [assignedDate, setAssignedDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(moment().add(1, "days").toDate());
  const [startTime, setStartTime] = useState(moment("09:00", "HH:mm"));

  const [saving, setSaving] = useState(false);
  const [fileList, setFileList] = useState([]);

  /* ---------- NOTES ---------- */
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  /* ---------- LOAD MASTER DATA ---------- */
  useEffect(() => {
    if (visible) {
      loadMasterData();
      loadMonthlyClients();
    }
  }, [visible]);

  const loadMasterData = async () => {
    try {
      setLoadingUsers(true);
      setLoadingAccounts(true);
      setLoadingServices(true);
      
      const [usersRes, accountsRes, servicesRes] = await Promise.all([
        axios.get("/api/users"),
        axios.get("/api/accounts"),
        axios.get("/api/service")
      ]);

      setAllUsers(usersRes.data || []);
      setAccounts(accountsRes.data || []);
      setServices(servicesRes.data || []);
    } catch (err) {
      console.error("Failed to load master data", err);
      message.error("Failed to load master data");
    } finally {
      setLoadingUsers(false);
      setLoadingAccounts(false);
      setLoadingServices(false);
    }
  };

  /* ---------- LOAD MONTHLY CONTENT CLIENTS ---------- */
  const loadMonthlyClients = useCallback(async () => {
    if (!visible) return;
    
    try {
      setLoadingMonthly(true);
      console.log("Loading monthly clients...");
      
      // Fetch monthly content
      const contentRes = await axios.get("/api/monthly-content");
      console.log("Monthly content response:", contentRes.data);
      
      const clients = contentRes.data.data || contentRes.data || [];
      console.log("Monthly clients data:", clients);
      
      // Fetch customer details if available
      let monthlyCustomers = [];
      try {
        const customersRes = await axios.get("/api/quotations/leads/customer");
        monthlyCustomers = customersRes.data.filter(
          (c) => c.billingCycle === "Monthly" && c.status === "Customer"
        );
        console.log("Monthly customers:", monthlyCustomers);
      } catch (err) {
        console.log("Customer details not available, using content data only");
      }
      
      // Enrich clients with additional data
      const enrichedClients = clients.map(client => {
        const customerInfo = monthlyCustomers.find(c => 
          c._id === client.clientId?._id || c._id === client.clientId
        );
        
        // Get business name from various sources
        let businessName = client.businessName;
        if (!businessName && client.clientId) {
          if (typeof client.clientId === 'object') {
            businessName = client.clientId.businessName;
          } else if (customerInfo) {
            businessName = customerInfo.businessName;
          }
        }
        
        // Get contact name
        let contactName = null;
        if (client.clientId && typeof client.clientId === 'object') {
          contactName = client.clientId.contactName;
        } else if (customerInfo) {
          contactName = customerInfo.contactName;
        }
        
        const status = getClientStatus(client);
        
        return {
          ...client,
          businessName: businessName || "Unknown Business",
          contactName: contactName,
          clientDetails: customerInfo,
          ...status
        };
      });
      
      console.log("Enriched clients:", enrichedClients);
      setMonthlyClients(enrichedClients);
      
      // If editing and has monthlyClientId, set selected client
      if (editing && editing.monthlyClientId) {
        const clientId = editing.monthlyClientId._id || editing.monthlyClientId;
        const selectedClient = enrichedClients.find(c => c._id === clientId);
        if (selectedClient) {
          setSelectedClientDetails(selectedClient);
          contentForm.setFieldsValue({
            staticPosts: selectedClient.staticPosts,
            deliveredStatic: selectedClient.deliveredStatic,
            reels: selectedClient.reels,
            deliveredReels: selectedClient.deliveredReels
          });
        }
      }
    } catch (err) {
      console.error("Failed to load monthly clients", err);
      message.error("Failed to load monthly content clients");
    } finally {
      setLoadingMonthly(false);
    }
  }, [visible, editing, contentForm]);

  /* ---------- LOAD FORM DATA ---------- */
  useEffect(() => {
    if (visible) {
      console.log("Form visible, editing:", editing);
      form.resetFields();

      if (editing) {
        // Set basic form fields
        form.setFieldsValue({
          title: editing.title,
          description: editing.description,
          reason: editing.reason,
          assignedTo: editing.assignedTo?.map(u => u._id) || [],
          status: editing.status,
          isImportant: editing.isImportant || false,
          extraAttachment: editing.extraAttachment?.[0] || "",
          accountId: editing.accountId?._id || editing.accountId || undefined,
          serviceId: editing.serviceId?._id || editing.serviceId || undefined,
          monthlyClientId: editing.monthlyClientId?._id || editing.monthlyClientId || undefined
        });

        // Set dates
        setAssignedDate(editing.assignedDate ? new Date(editing.assignedDate) : new Date());
        setDueDate(editing.dueDate ? new Date(editing.dueDate) : moment().add(1, "days").toDate());
        setStartTime(
          editing.startTime
            ? moment(editing.startTime, "HH:mm")
            : moment("09:00", "HH:mm")
        );
        
        // Set file list if attachments exist
        if (editing.attachments?.length) {
          const existingFiles = editing.attachments.map((url, index) => ({
            uid: `-${index}`,
            name: url.split('/').pop() || `file-${index}`,
            status: 'done',
            url: url
          }));
          setFileList(existingFiles);
        }
      } else {
        // Set default values for new task
        form.setFieldsValue({
          assignedTo: [currentUser._id],
          status: "To Do",
          isImportant: false,
          accountId: undefined,
          serviceId: undefined,
          monthlyClientId: undefined
        });

        setAssignedDate(new Date());
        setDueDate(moment().add(1, "days").toDate());
        setStartTime(moment("09:00", "HH:mm"));
        setFileList([]);
        setSelectedClientDetails(null);
        contentForm.resetFields();
      }
    }
  }, [editing, visible, currentUser._id, form, contentForm]);

  /* ---------- HANDLE CLIENT SELECTION ---------- */
  const handleClientChange = (clientId) => {
    console.log("Selected client ID:", clientId);
    
    if (clientId) {
      const client = monthlyClients.find(c => c._id === clientId);
      console.log("Found client:", client);
      
      if (client) {
        setSelectedClientDetails(client);
        
        // Set content form values
        contentForm.setFieldsValue({
          staticPosts: client.staticPosts,
          deliveredStatic: client.deliveredStatic,
          reels: client.reels,
          deliveredReels: client.deliveredReels
        });
        
        // Auto-populate account if available from client
        if (client.clientDetails?._id) {
          form.setFieldsValue({
            accountId: client.clientDetails._id
          });
        }
        
        // Auto-populate title for new tasks
        if (!editing && client.totalDelivered < client.totalPosts) {
          const pendingItems = [];
          if (client.deliveredStatic < client.staticPosts) {
            pendingItems.push(`${client.staticPosts - client.deliveredStatic} Static`);
          }
          if (client.deliveredReels < client.reels) {
            pendingItems.push(`${client.reels - client.deliveredReels} Reels`);
          }
          
          if (pendingItems.length > 0) {
            form.setFieldsValue({
              title: `${client.businessName} - Pending: ${pendingItems.join(', ')}`
            });
          }
        }
      }
    } else {
      setSelectedClientDetails(null);
      contentForm.resetFields();
    }
  };

  /* ---------- HANDLE CONTENT UPDATE ---------- */
  const handleUpdateContent = async () => {
    try {
      const values = await contentForm.validateFields();
      
      // Validation
      if (values.deliveredStatic > values.staticPosts) {
        message.error("Delivered Static cannot exceed Total Static Posts");
        return;
      }
      if (values.deliveredReels > values.reels) {
        message.error("Delivered Reels cannot exceed Total Reels");
        return;
      }
      
      setUpdatingContent(true);
      
      await axios.put(`/api/monthly-content/${selectedClientDetails._id}`, values);
      
      message.success("Content updated successfully");
      
      // Refresh data
      await loadMonthlyClients();
      
      setEditModalVisible(false);
      
    } catch (err) {
      console.error("Update content error:", err);
      message.error(err.response?.data?.message || "Failed to update content");
    } finally {
      setUpdatingContent(false);
    }
  };

  /* ---------- FILE VALIDATION ---------- */
  const beforeUpload = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      message.error("Only PDF, DOC, DOCX, Excel, or image files allowed");
      return Upload.LIST_IGNORE;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      message.error("File size must be less than 10MB");
      return Upload.LIST_IGNORE;
    }
    
    return false;
  };

  const handleFileRemove = (file) => {
    const index = fileList.indexOf(file);
    const newFileList = fileList.slice();
    newFileList.splice(index, 1);
    setFileList(newFileList);
  };

  /* ---------- SAVE TASK ---------- */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Upload files
      const uploadedFiles = [];
      for (const file of fileList) {
        if (file.originFileObj) {
          try {
            const res = await uploadFile(file.originFileObj);
            if (res?.url) {
              uploadedFiles.push(res.url);
            }
          } catch (err) {
            console.error("File upload failed:", err);
            message.error(`Failed to upload ${file.name}`);
          }
        } else if (file.url) {
          uploadedFiles.push(file.url);
        }
      }

      // Prepare payload
      const payload = {
        title: values.title,
        description: values.description || "",
        reason: values.reason || "",
        assignedTo: values.assignedTo,
        status: values.status,
        isImportant: values.isImportant || false,
        assignedBy: editing ? (editing.assignedBy?._id || editing.assignedBy) : currentUser._id,
        assignedDate: assignedDate.toISOString(),
        dueDate: dueDate.toISOString(),
        startTime: startTime.format("HH:mm"),
        extraAttachment: values.extraAttachment ? [values.extraAttachment] : [],
        attachments: uploadedFiles,
        accountId: values.accountId || null,
        serviceId: values.serviceId || null,
        monthlyClientId: values.monthlyClientId || null
      };

      console.log("Saving task with payload:", payload);

      if (editing) {
        await axios.put(`/api/tasks/${editing._id}`, payload);
        message.success("Task updated successfully");
      } else {
        await axios.post("/api/tasks", payload);
        message.success("Task created successfully");
      }

      // Refresh data
      await loadMonthlyClients();

      setFileList([]);
      onSaved();
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
      message.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- ADD NOTE ---------- */
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      setAddingNote(true);

      await axios.put(`/api/tasks/${editing._id}/add-note`, {
        text: noteText,
        addedBy: currentUser._id
      });

      setNoteText("");
      onSaved();
      message.success("Note added successfully");
    } catch (err) {
      console.error(err);
      message.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  /* ---------- CALCULATE DUE DATE STATUS ---------- */
  const getDueDateStatus = () => {
    const today = moment().startOf('day');
    const due = moment(dueDate).startOf('day');
    const diffDays = due.diff(today, 'days');
    
    if (diffDays < 0) return { color: 'red', text: 'Overdue', icon: <WarningOutlined /> };
    if (diffDays === 0) return { color: 'orange', text: 'Today', icon: <ClockCircleOutlined /> };
    if (diffDays === 1) return { color: 'blue', text: 'Tomorrow', icon: <CalendarOutlined /> };
    if (diffDays <= 3) return { color: 'cyan', text: `${diffDays} days left`, icon: <CalendarOutlined /> };
    return { color: 'green', text: `${diffDays} days left`, icon: <CheckCircleOutlined /> };
  };

  const dueStatus = getDueDateStatus();

  /* ================= RENDER ================= */
  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Space size="middle">
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 8, 
                background: '#1890ff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {editing ? <EditOutlined style={{ color: 'white', fontSize: 20 }} /> : <PlusOutlined style={{ color: 'white', fontSize: 20 }} />}
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>{editing ? "Edit Task" : "Create New Task"}</Title>
                <Text type="secondary">{editing ? "Update task details and progress" : "Add a new task to the board"}</Text>
              </div>
            </Space>
            
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadMonthlyClients}
              loading={loadingMonthly}
              size="small"
            >
              Refresh Clients
            </Button>
          </div>
        }
        width={800}
        open={visible}
        onClose={onClose}
        destroyOnClose
        className="task-form-drawer"
        footer={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px 0'
          }}>
            <div>
              {editing && (
                <Text type="secondary">
                  Last updated: {moment(editing.updatedAt).format('DD MMM YYYY, HH:mm')}
                </Text>
              )}
            </div>
            <Space>
              <Button onClick={onClose} icon={<CloseOutlined />}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                loading={saving} 
                onClick={handleSave}
                icon={<SaveOutlined />}
                size="large"
              >
                {editing ? "Update Task" : "Create Task"}
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          
          {/* ================= BASIC INFO ================= */}
          <Card 
            className="zoho-section-card"
            title={
              <Space>
                <FileTextOutlined style={{ color: '#1890ff' }} />
                <span>Basic Information</span>
              </Space>
            }
          >
            <Form.Item
              name="title"
              label={
                <Space>
                  <span>Task Title</span>
                  <Tag color="red" style={{ fontSize: 10 }}>Required</Tag>
                </Space>
              }
              rules={[{ required: true, message: "Task title is required" }]}
            >
              <Input 
                placeholder="Enter task title..." 
                maxLength={100}
                showCount
                prefix={<FlagOutlined style={{ color: '#bfbfbf' }} />}
              />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <TextArea 
                rows={4} 
                placeholder="Provide detailed description of the task..."
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item name="isImportant" label="Priority" valuePropName="checked">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch checkedChildren={<FlagOutlined />} unCheckedChildren={<FlagOutlined />} />
                <Text type={form.getFieldValue('isImportant') ? 'danger' : 'secondary'}>
                  {form.getFieldValue('isImportant') ? 'High Priority' : 'Normal Priority'}
                </Text>
              </div>
            </Form.Item>
          </Card>

          {/* ================= MONTHLY CONTENT CLIENT ================= */}
          {/* <Card 
            className="zoho-section-card"
            title={
              <Space>
                <BarChartOutlined style={{ color: '#722ed1' }} />
                <span>Monthly Content Client</span>
                {loadingMonthly && <Spin size="small" />}
              </Space>
            }
            extra={
              selectedClientDetails && (
                <Badge 
                  count={selectedClientDetails.status} 
                  style={{ backgroundColor: selectedClientDetails.color }} 
                />
              )
            }
          >
            <Form.Item 
              name="monthlyClientId" 
              label="Select Monthly Content Client"
              tooltip="Associate this task with a monthly content client"
            >
              <Select
                placeholder={loadingMonthly ? "Loading clients..." : "Select a monthly content client"}
                allowClear
                loading={loadingMonthly}
                showSearch
                optionFilterProp="children"
                onChange={handleClientChange}
                notFoundContent={loadingMonthly ? <Spin size="small" /> : "No clients found"}
                filterOption={(input, option) => {
                  const client = monthlyClients.find(c => c._id === option.value);
                  return client?.businessName?.toLowerCase().includes(input.toLowerCase()) || false;
                }}
              >
                {monthlyClients.map(client => (
                  <Option key={client._id} value={client._id}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      width: '100%'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          marginBottom: 4
                        }}>
                          <span style={{ fontWeight: 500 }}>{client.businessName}</span>
                          {client.contactName && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              ({client.contactName})
                            </Text>
                          )}
                          <Tag color={client.color} style={{ fontSize: 10, marginLeft: 'auto' }}>
                            {client.status}
                          </Tag>
                        </div>
                        
                        <div style={{ 
                          fontSize: 12, 
                          color: '#666',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <span>
                            {client.totalDelivered}/{client.totalPosts} Completed
                          </span>
                          <span style={{ color: client.color, fontWeight: 500 }}>
                            {client.completionPercent}%
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ marginLeft: 12 }}>
                        <Progress
                          type="circle"
                          percent={client.completionPercent}
                          width={36}
                          strokeColor={client.color}
                          format={() => ''}
                        />
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedClientDetails && (
              <div style={{ 
                marginTop: 16, 
                padding: 16, 
                background: '#f9f9f9', 
                borderRadius: 8,
                border: '1px solid #f0f0f0'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: 12
                }}>
                  <Space>
                    <Avatar 
                      size={32} 
                      style={{ backgroundColor: selectedClientDetails.color }}
                    >
                      {selectedClientDetails.icon}
                    </Avatar>
                    <div>
                      <Text strong style={{ fontSize: 16 }}>{selectedClientDetails.businessName}</Text>
                      {selectedClientDetails.contactName && (
                        <div>
                          <Text type="secondary">{selectedClientDetails.contactName}</Text>
                        </div>
                      )}
                    </div>
                  </Space>
                  
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => setEditModalVisible(true)}
                    ghost
                  >
                    Update Progress
                  </Button>
                </div>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" bordered={false} style={{ background: 'transparent' }}>
                      <Statistic
                        title="Static Posts"
                        value={selectedClientDetails.deliveredStatic}
                        suffix={`/ ${selectedClientDetails.staticPosts}`}
                        valueStyle={{ fontSize: 18, color: '#1890ff' }}
                      />
                      <Progress 
                        percent={selectedClientDetails.staticProgress} 
                        size="small"
                        strokeColor="#1890ff"
                        showInfo={false}
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {selectedClientDetails.staticProgress}% complete
                      </Text>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" bordered={false} style={{ background: 'transparent' }}>
                      <Statistic
                        title="Reels"
                        value={selectedClientDetails.deliveredReels}
                        suffix={`/ ${selectedClientDetails.reels}`}
                        valueStyle={{ fontSize: 18, color: '#722ed1' }}
                      />
                      <Progress 
                        percent={selectedClientDetails.reelsProgress} 
                        size="small"
                        strokeColor="#722ed1"
                        showInfo={false}
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {selectedClientDetails.reelsProgress}% complete
                      </Text>
                    </Card>
                  </Col>
                </Row>
                
                <Divider style={{ margin: '12px 0' }} />
                
                <div style={{ 
                  padding: 12, 
                  background: '#fff',
                  borderRadius: 6,
                  textAlign: 'center'
                }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary">Overall Progress</Text>
                    <Progress 
                      percent={selectedClientDetails.completionPercent} 
                      strokeColor={selectedClientDetails.color}
                      format={percent => (
                        <span style={{ color: selectedClientDetails.color, fontWeight: 'bold' }}>
                          {percent}%
                        </span>
                      )}
                    />
                    <Text>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />{' '}
                      {selectedClientDetails.totalDelivered} of {selectedClientDetails.totalPosts} items completed
                    </Text>
                  </Space>
                </div>
              </div>
            )}
            
            {!loadingMonthly && monthlyClients.length === 0 && (
              <Alert
                message="No Monthly Content Found"
                description="There are no monthly content clients available. Please create monthly content first."
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card> */}

          {/* ================= ACCOUNT & SERVICE ================= */}
          <Card 
            className="zoho-section-card"
            title={
              <Space>
                <TeamOutlined style={{ color: '#fa8c16' }} />
                <span>Account & Service</span>
              </Space>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="accountId" label="Account">
                  <Select 
                    allowClear 
                    placeholder="Select an account"
                    showSearch
                    optionFilterProp="children"
                    loading={loadingAccounts}
                    notFoundContent={loadingAccounts ? <Spin size="small" /> : "No accounts"}
                  >
                    {accounts.map(a => (
                      <Option key={a._id} value={a._id}>
                        {a.businessName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item name="serviceId" label="Service">
                  <Select 
                    allowClear 
                    placeholder="Select a service"
                    showSearch
                    optionFilterProp="children"
                    loading={loadingServices}
                    notFoundContent={loadingServices ? <Spin size="small" /> : "No services"}
                  >
                    {services.map(s => (
                      <Option key={s._id} value={s._id}>
                        {s.serviceName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* ================= ADDITIONAL DETAILS ================= */}
          <Card 
            className="zoho-section-card"
            title={
              <Space>
                <PaperClipOutlined style={{ color: '#eb2f96' }} />
                <span>Additional Details</span>
              </Space>
            }
          >
            <Form.Item name="reason" label="Reason / Additional Notes">
              <TextArea rows={2} placeholder="Add any additional notes or reason for this task..." />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Start Time" required>
                  <TimePicker
                    value={startTime}
                    use12Hours
                    format="hh:mm A"
                    style={{ width: "100%" }}
                    onChange={setStartTime}
                    suffixIcon={<ClockCircleOutlined />}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="extraAttachment" label="Attachment URL">
                  <Input 
                    placeholder="https://example.com/file.pdf"
                    prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Upload Files">
              <Dragger
                multiple
                beforeUpload={beforeUpload}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
                onRemove={handleFileRemove}
              >
                <p className="ant-upload-drag-icon">
                  <CloudUploadOutlined style={{ fontSize: 40, color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">Click or drag files to upload</p>
                <p className="ant-upload-hint">
                  Support: PDF, DOC, DOCX, Excel, Images (Max 10MB each)
                </p>
              </Dragger>
              
              {fileList.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">{fileList.length} file(s) selected</Text>
                </div>
              )}
            </Form.Item>
          </Card>

          {/* ================= ASSIGNMENT ================= */}
          <Card 
            className="zoho-section-card"
            title={
              <Space>
                <UserOutlined style={{ color: '#13c2c2' }} />
                <span>Assignment</span>
              </Space>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="assignedTo"
                  label={
                    <Space>
                      <span>Assign To</span>
                      <Tag color="red" style={{ fontSize: 10 }}>Required</Tag>
                    </Space>
                  }
                  rules={[{ required: true, message: "Please assign to at least one person" }]}
                >
                  <Select 
                    mode="multiple" 
                    disabled={!isPrivileged}
                    placeholder="Select team members"
                    optionLabelProp="label"
                    maxTagCount="responsive"
                    loading={loadingUsers}
                  >
                    {allUsers.map(u => (
                      <Option key={u._id} value={u._id} label={u.name}>
                        <Space>
                          <Avatar src={u.profileImage} size="small">
                            {u.name?.charAt(0).toUpperCase()}
                          </Avatar>
                          {u.name} - {u.role}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item name="status" label="Status">
                  <Select>
                    <Option value="To Do">
                      <Space>
                        <ClockCircleOutlined style={{ color: '#ff4d4f' }} />
                        <span>To Do</span>
                      </Space>
                    </Option>
                    <Option value="In Progress">
                      <Space>
                        <PlayCircleOutlined style={{ color: '#fa8c16' }} />
                        <span>In Progress</span>
                      </Space>
                    </Option>
                    <Option value="Review">
                      <Space>
                        <EyeOutlined style={{ color: '#722ed1' }} />
                        <span>Review</span>
                      </Space>
                    </Option>
                    <Option value="Completed">
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <span>Completed</span>
                      </Space>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* ================= DATES ================= */}
          <Card 
            className="zoho-section-card"
            title={
              <Space>
                <CalendarOutlined style={{ color: '#faad14' }} />
                <span>Timeline</span>
              </Space>
            }
            extra={
              <Tag color={dueStatus.color} icon={dueStatus.icon}>
                {dueStatus.text}
              </Tag>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Assigned Date</Text>
                </div>
                <div className="custom-datepicker-wrapper">
                  <DatePicker 
                    selected={assignedDate} 
                    onChange={setAssignedDate} 
                    className="ant-input"
                    dateFormat="dd/MM/yyyy"
                    minDate={new Date()}
                  />
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Due Date</Text>
                </div>
                <div className="custom-datepicker-wrapper">
                  <DatePicker 
                    selected={dueDate} 
                    onChange={setDueDate} 
                    className="ant-input"
                    dateFormat="dd/MM/yyyy"
                    minDate={assignedDate}
                  />
                </div>
              </Col>
            </Row>

            <Alert
              message="Task Assignment"
              description={
                <Space>
                  <Avatar src={editing ? editing.assignedBy?.profileImage : currentUser.profileImage} size="small">
                    {(editing ? editing.assignedBy?.name : currentUser.name)?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text>
                    Assigned By: <strong>{editing ? editing.assignedBy?.name : currentUser.name}</strong>
                  </Text>
                </Space>
              }
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Card>

          {/* ================= NOTES HISTORY ================= */}
          {editing && (
            <Card 
              className="zoho-section-card"
              title={
                <Space>
                  <HistoryOutlined style={{ color: '#8c8c8c' }} />
                  <span>Activity & Notes History</span>
                </Space>
              }
            >
              <div style={{ marginBottom: 16 }}>
                <TextArea
                  rows={3}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note or comment..."
                  maxLength={300}
                  showCount
                />
                <Button
                  type="primary"
                  disabled={!noteText.trim()}
                  loading={addingNote}
                  style={{ marginTop: 8 }}
                  onClick={handleAddNote}
                  icon={<PlusOutlined />}
                >
                  Add Note
                </Button>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <div style={{ maxHeight: 300, overflowY: 'auto', padding: '0 4px' }}>
                {editing.reasonHistory?.length ? (
                  <Timeline mode="left">
                    {editing.reasonHistory
                      .slice()
                      .reverse()
                      .map((n, i) => (
                        <Timeline.Item 
                          key={i}
                          dot={<Avatar src={n.addedBy?.profileImage} size="small">
                            {n.addedBy?.name?.charAt(0).toUpperCase()}
                          </Avatar>}
                        >
                          <div style={{ marginBottom: 4 }}>
                            <Text strong>{n.addedBy?.name || "User"}</Text>
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                              {moment(n.createdAt).format("DD MMM YYYY, hh:mm A")}
                            </Text>
                          </div>
                          <Card size="small" style={{ background: '#fafafa' }}>
                            <Text>{n.text}</Text>
                          </Card>
                        </Timeline.Item>
                      ))}
                  </Timeline>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Text type="secondary">No notes yet</Text>
                  </div>
                )}
              </div>
            </Card>
          )}
        </Form>
      </Drawer>

      {/* Edit Content Modal */}
      <Modal
        title={
          <Space>
            <div style={{ 
              width: 32, 
              height: 32, 
              borderRadius: 6, 
              background: '#722ed1', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <EditOutlined style={{ color: 'white' }} />
            </div>
            <div>
              <Title level={5} style={{ margin: 0 }}>Update Content Progress</Title>
              <Text type="secondary">{selectedClientDetails?.businessName}</Text>
            </div>
          </Space>
        }
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={updatingContent}
            onClick={handleUpdateContent}
            icon={<SaveOutlined />}
          >
            Update Progress
          </Button>
        ]}
        width={450}
        centered
      >
        <Form form={contentForm} layout="vertical">
          <Card size="small" style={{ marginBottom: 16, background: '#f5f5f5', border: 'none' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic 
                  title="Current Progress" 
                  value={selectedClientDetails?.completionPercent || 0} 
                  suffix="%"
                  valueStyle={{ color: selectedClientDetails?.color }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Items Completed" 
                  value={selectedClientDetails?.totalDelivered || 0}
                  suffix={`/ ${selectedClientDetails?.totalPosts || 0}`}
                />
              </Col>
            </Row>
            <Progress 
              percent={selectedClientDetails?.completionPercent || 0} 
              strokeColor={selectedClientDetails?.color}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>

          <Form.Item
            name="staticPosts"
            label={
              <Space>
                <FileTextOutlined style={{ color: '#1890ff' }} />
                <span>Total Static Posts</span>
              </Space>
            }
            rules={[{ required: true, message: "Required" }]}
          >
            <InputNumber 
              min={0} 
              style={{ width: "100%" }} 
              placeholder="Enter number"
            />
          </Form.Item>

          <Form.Item
            name="deliveredStatic"
            label={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Delivered Static</span>
              </Space>
            }
            rules={[
              { required: true, message: "Required" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value <= getFieldValue('staticPosts')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Cannot exceed total static posts'));
                },
              }),
            ]}
          >
            <InputNumber 
              min={0} 
              style={{ width: "100%" }} 
              placeholder="Enter number"
            />
          </Form.Item>

          <Form.Item
            name="reels"
            label={
              <Space>
                <PlayCircleOutlined style={{ color: '#722ed1' }} />
                <span>Total Reels</span>
              </Space>
            }
            rules={[{ required: true, message: "Required" }]}
          >
            <InputNumber 
              min={0} 
              style={{ width: "100%" }} 
              placeholder="Enter number"
            />
          </Form.Item>

          <Form.Item
            name="deliveredReels"
            label={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Delivered Reels</span>
              </Space>
            }
            rules={[
              { required: true, message: "Required" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value <= getFieldValue('reels')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Cannot exceed total reels'));
                },
              }),
            ]}
          >
            <InputNumber 
              min={0} 
              style={{ width: "100%" }} 
              placeholder="Enter number"
            />
          </Form.Item>

          {/* Live Preview */}
          <Card size="small" style={{ marginTop: 16, background: '#e6f7ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Preview After Update</Text>
              <Form.Item shouldUpdate style={{ margin: 0 }}>
                {() => {
                  const staticVal = contentForm.getFieldValue('staticPosts') || 0;
                  const delStatic = contentForm.getFieldValue('deliveredStatic') || 0;
                  const reelsVal = contentForm.getFieldValue('reels') || 0;
                  const delReels = contentForm.getFieldValue('deliveredReels') || 0;
                  
                  const total = staticVal + reelsVal;
                  const delivered = delStatic + delReels;
                  const percent = total > 0 ? Math.round((delivered / total) * 100) : 0;
                  
                  return (
                    <div>
                      <Row gutter={8}>
                        <Col span={12}>
                          <Text type="secondary">Static:</Text>
                        </Col>
                        <Col span={12}>
                          <Text strong>{delStatic}/{staticVal}</Text>
                        </Col>
                      </Row>
                      <Row gutter={8}>
                        <Col span={12}>
                          <Text type="secondary">Reels:</Text>
                        </Col>
                        <Col span={12}>
                          <Text strong>{delReels}/{reelsVal}</Text>
                        </Col>
                      </Row>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">Completion: </Text>
                        <Text strong style={{ color: percent === 100 ? '#52c41a' : '#722ed1' }}>
                          {percent}%
                        </Text>
                      </div>
                    </div>
                  );
                }}
              </Form.Item>
            </Space>
          </Card>

          <Alert
            message="Note"
            description="Updating content progress here will reflect in the monthly content dashboard."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Form>
      </Modal>
    </>
  );
};

export default TaskForm;