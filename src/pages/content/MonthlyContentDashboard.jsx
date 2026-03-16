import React, { useEffect, useState } from "react";
import {
  Table,
  Card,
  Typography,
  Spin,
  Row,
  Col,
  Tag,
  Button,
  Drawer,
  Form,
  InputNumber,
  Space,
  message,
  Modal,
  Select,
  Progress,
  Statistic,
  Empty,
  Divider,
  Input,
  Alert,
  Tooltip,
  Badge,
  Tabs,
  Descriptions,
  Timeline,
  Avatar,
  DatePicker,
  Grid,
} from "antd";
import {
  EditOutlined,
  SaveOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  HistoryOutlined,
  UserOutlined,
  BarChartOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  ShopOutlined,
  FilterOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import axios from "../../api/axios";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const { confirm } = Modal;
const { Option } = Select;
const { TabPane } = Tabs;
const { MonthPicker } = DatePicker;
const { RangePicker } = DatePicker;

const MonthlyContentDashboard = () => {
  const screens = useBreakpoint();
  const [currentUser, setCurrentUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [businessAccounts, setBusinessAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedContentDetails, setSelectedContentDetails] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const [userBusinessId, setUserBusinessId] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false);

  // Available months for filter
  const [availableMonths, setAvailableMonths] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    console.log("Current user from localStorage:", user);
    
    setCurrentUser(user);
    setUserRole(user?.role || '');
    setUserId(user?._id || '');
    
    const businessId = user?.businessAccount?._id || user?.businessAccount;
    setUserBusinessId(businessId);
    
    console.log("User Business ID:", businessId);
    
    fetchAll(user);
    fetchDashboardStats(user);
  }, []);

  // Extract unique months from clients data
  useEffect(() => {
    if (clients.length > 0) {
      const months = [...new Set(clients.map(client => client.month))];
      setAvailableMonths(months.sort());
    }
  }, [clients]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [clients, selectedMonth, selectedBusiness, selectedStatus, dateRange]);

  const fetchAll = async (user) => {
    try {
      setLoading(true);

      const businessId = user?.businessAccount?._id || user?.businessAccount;
      
      let contentEndpoint = "/api/monthly-content";
      
      if (user?.role === "Client" && businessId) {
        contentEndpoint = `/api/monthly-content/client/${businessId}`;
        console.log("Fetching client content for business:", businessId);
      }
      
      const contentRes = await axios.get(contentEndpoint);
      const contentData = contentRes.data.data || contentRes.data || [];
      setClients(contentData);
      setFilteredClients(contentData);

      if (["Admin", "Superadmin", "Employee", "Team Leader"].includes(user?.role)) {
        const clientRes = await axios.get("/api/quotations/leads/customer");
        const monthlyCustomers = clientRes.data.filter(
          (c) => c.billingCycle === "Monthly" && c.status === "Customer"
        );
        setBusinessAccounts(monthlyCustomers);
        
        if (user?.role === "Employee" && user?._id) {
          const assignedClients = monthlyCustomers.filter(
            c => c.assignedTo === user._id || c.assignedTo?._id === user._id
          );
          setBusinessAccounts(assignedClients);
        }
      }

    } catch (err) {
      console.error("Failed to load data:", err);
      message.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...clients];

    // Month filter
    if (selectedMonth) {
      filtered = filtered.filter(client => 
        client.month === selectedMonth
      );
    }

    // Business filter
    if (selectedBusiness) {
      filtered = filtered.filter(client => 
        client.clientId?._id === selectedBusiness || client.clientId === selectedBusiness
      );
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(client => 
        client.status === selectedStatus
      );
    }

    // Date range filter (based on createdAt or updatedAt)
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      
      filtered = filtered.filter(client => {
        const clientDate = dayjs(client.createdAt);
        return clientDate.isAfter(startDate) && clientDate.isBefore(endDate);
      });
    }

    setFilteredClients(filtered);
  };

  const resetFilters = () => {
    setSelectedMonth(null);
    setSelectedBusiness(null);
    setSelectedStatus(null);
    setDateRange(null);
    setFilteredClients(clients);
  };

  const fetchDashboardStats = async (user) => {
    try {
      const businessId = user?.businessAccount?._id || user?.businessAccount;
      
      if (user?.role === "Client" && businessId) {
        const response = await axios.get(`/api/monthly-content/client/${businessId}/stats`);
        setStats(response.data.data);
      } else {
        const response = await axios.get('/api/monthly-content/dashboard/summary');
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Export functions
  const exportToExcel = () => {
    try {
      setExportLoading(true);
      
      const exportData = filteredClients.map(client => ({
        'Business Name': client.businessName || 'N/A',
        'Contact Person': client.clientId?.contactName || 'N/A',
        'Month': client.month || 'N/A',
        'Status': client.status || 'N/A',
        'Static Posts Planned': client.staticPosts || 0,
        'Static Posts Delivered': client.deliveredStatic || 0,
        'Static Progress %': client.staticPosts ? 
          Math.round((client.deliveredStatic / client.staticPosts) * 100) : 0,
        'Reels Planned': client.reels || 0,
        'Reels Delivered': client.deliveredReels || 0,
        'Reels Progress %': client.reels ? 
          Math.round((client.deliveredReels / client.reels) * 100) : 0,
        'Overall Completion %': client.completionPercentage || 0,
        'Created Date': client.createdAt ? dayjs(client.createdAt).format('DD/MM/YYYY') : 'N/A',
        'Last Updated': client.updatedAt ? dayjs(client.updatedAt).format('DD/MM/YYYY HH:mm') : 'N/A',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Content');
      
      // Auto-size columns
      const colWidths = [];
      const maxColWidth = 50;
      Object.keys(exportData[0] || {}).forEach(key => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map(row => String(row[key]).length)
        );
        colWidths.push({ wch: Math.min(maxLength + 5, maxColWidth) });
      });
      ws['!cols'] = colWidths;

      const fileName = `monthly_content_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      message.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export to Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPDF = () => {
    try {
      setExportLoading(true);
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Monthly Content Report', 14, 22);
      
      // Add metadata
      doc.setFontSize(10);
      doc.text(`Generated: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 30);
      doc.text(`Generated by: ${currentUser?.name || 'Unknown'} (${userRole})`, 14, 35);
      
      // Add filter information
      let filterY = 40;
      if (selectedMonth || selectedBusiness || selectedStatus || dateRange) {
        doc.text('Applied Filters:', 14, filterY);
        filterY += 5;
        if (selectedMonth) {
          doc.text(`• Month: ${selectedMonth}`, 14, filterY);
          filterY += 5;
        }
        if (selectedBusiness) {
          const business = businessAccounts.find(b => b._id === selectedBusiness);
          doc.text(`• Business: ${business?.businessName || 'Unknown'}`, 14, filterY);
          filterY += 5;
        }
        if (selectedStatus) {
          doc.text(`• Status: ${selectedStatus}`, 14, filterY);
          filterY += 5;
        }
        if (dateRange) {
          doc.text(`• Date Range: ${dateRange[0].format('DD/MM/YYYY')} - ${dateRange[1].format('DD/MM/YYYY')}`, 14, filterY);
          filterY += 5;
        }
      }
      
      // Prepare table data
      const tableColumn = [
        'Business',
        'Month',
        'Status',
        'Static',
        'Reels',
        'Completion'
      ];
      
      const tableRows = filteredClients.map(client => [
        client.businessName || 'N/A',
        client.month || 'N/A',
        client.status || 'N/A',
        `${client.deliveredStatic || 0}/${client.staticPosts || 0}`,
        `${client.deliveredReels || 0}/${client.reels || 0}`,
        `${client.completionPercentage || 0}%`
      ]);

      // Add summary
      const totalStatic = filteredClients.reduce((sum, c) => sum + (c.staticPosts || 0), 0);
      const totalDeliveredStatic = filteredClients.reduce((sum, c) => sum + (c.deliveredStatic || 0), 0);
      const totalReels = filteredClients.reduce((sum, c) => sum + (c.reels || 0), 0);
      const totalDeliveredReels = filteredClients.reduce((sum, c) => sum + (c.deliveredReels || 0), 0);
      
      const summaryY = filterY + 10;
      doc.text('Summary:', 14, summaryY);
      doc.text(`Total Records: ${filteredClients.length}`, 20, summaryY + 5);
      doc.text(`Static: ${totalDeliveredStatic}/${totalStatic} (${totalStatic ? Math.round(totalDeliveredStatic/totalStatic*100) : 0}%)`, 20, summaryY + 10);
      doc.text(`Reels: ${totalDeliveredReels}/${totalReels} (${totalReels ? Math.round(totalDeliveredReels/totalReels*100) : 0}%)`, 20, summaryY + 15);
      
      // Generate table
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: summaryY + 25,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 122, 255], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      const fileName = `monthly_content_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`;
      doc.save(fileName);
      
      message.success('PDF file downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export to PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const fetchContentDetails = async (id) => {
    try {
      const response = await axios.get(`/api/monthly-content/${id}`);
      setSelectedContentDetails(response.data.data);
      setDetailDrawerVisible(true);
    } catch (err) {
      message.error('Failed to fetch content details');
    }
  };

  const openDrawer = (record = null) => {
    if (!canEdit()) {
      message.error("You don't have permission to edit content");
      return;
    }

    if (userRole === "Employee" && record) {
      const hasAccess = businessAccounts.some(
        account => account._id === record.clientId?._id || account._id === record.clientId
      );
      if (!hasAccess) {
        message.error("You can only edit content for clients assigned to you");
        return;
      }
    }

    setSelectedContent(record);
    if (record) {
      form.setFieldsValue({
        staticPosts: record.staticPosts,
        deliveredStatic: record.deliveredStatic,
        reels: record.reels,
        deliveredReels: record.deliveredReels,
        note: ''
      });
    } else {
      form.resetFields();
    }
    setDrawerVisible(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();

      if (
        values.deliveredStatic > values.staticPosts ||
        values.deliveredReels > values.reels
      ) {
        message.error("Delivered cannot exceed total");
        return;
      }

      if (!canEdit()) {
        message.error("You don't have permission to save changes");
        return;
      }

      if (selectedContent) {
        await axios.put(
          `/api/monthly-content/${selectedContent._id}`,
          values
        );
        message.success("Content updated successfully");
      } else {
        await axios.post("/api/monthly-content", values);
        message.success("Content created successfully");
      }

      fetchAll(currentUser);
      fetchDashboardStats(currentUser);
      setDrawerVisible(false);
    } catch (err) {
      message.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      setDeleting(true);
      
      if (!canDelete()) {
        message.error("You don't have permission to delete content");
        return;
      }

      await axios.delete(`/api/monthly-content/${record._id}`);
      
      setClients((prev) =>
        prev.filter((item) => item._id !== record._id)
      );
      fetchDashboardStats(currentUser);
      message.success("Deleted successfully");
    } catch (err) {
      message.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const showDeleteConfirm = (record) => {
    if (!canDelete()) {
      message.error("You don't have permission to delete content");
      return;
    }

    confirm({
      title: "Delete Monthly Content?",
      icon: <ExclamationCircleOutlined />,
      content: `Delete content for ${record.businessName}?`,
      okType: "danger",
      centered: true,
      onOk() {
        return handleDelete(record);
      },
    });
  };

  // Permission check functions
  const canEdit = () => {
    return ["Admin", "Superadmin", "Employee", "Team Leader"].includes(userRole);
  };

  const canDelete = () => {
    return ["Admin", "Superadmin"].includes(userRole);
  };

  const canCreate = () => {
    return ["Admin", "Superadmin", "Employee", "Team Leader"].includes(userRole);
  };

  /* ================= SUMMARY STATS ================= */

  const totalClients = filteredClients.length;

  const totalStatic = filteredClients.reduce((a, b) => a + (b.staticPosts || 0), 0);
  const totalDeliveredStatic = filteredClients.reduce(
    (a, b) => a + (b.deliveredStatic || 0),
    0
  );

  const totalReels = filteredClients.reduce((a, b) => a + (b.reels || 0), 0);
  const totalDeliveredReels = filteredClients.reduce(
    (a, b) => a + (b.deliveredReels || 0),
    0
  );

  const overallCompletion =
    totalStatic + totalReels === 0
      ? 0
      : Math.round(
          ((totalDeliveredStatic + totalDeliveredReels) /
            (totalStatic + totalReels)) *
            100
        );

  /* ================= MOBILE CARD VIEW ================= */
  
  const renderMobileCard = (record) => {
    const staticPercent = record.staticPosts === 0 ? 0 : Math.round((record.deliveredStatic / record.staticPosts) * 100);
    const reelsPercent = record.reels === 0 ? 0 : Math.round((record.deliveredReels / record.reels) * 100);
    
    const statusConfig = {
      completed: { color: 'green', icon: <CheckCircleOutlined /> },
      active: { color: 'blue', icon: <LoadingOutlined /> },
      pending: { color: 'orange', icon: <ClockCircleOutlined /> }
    };
    const config = statusConfig[record.status] || statusConfig.pending;

    return (
      <Card 
        key={record._id}
        style={{ 
          marginBottom: 12, 
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
        bodyStyle={{ padding: 16 }}
      >
        {/* Header with Business and Status */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col>
            <Space direction="vertical" size={2}>
              <Tag color="blue" style={{ fontSize: 14, padding: '4px 8px' }}>
                {record.businessName}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.clientId?.contactName || 'N/A'}
              </Text>
            </Space>
          </Col>
          <Col>
            <Tag color={config.color} icon={config.icon}>
              {record.status?.toUpperCase()}
            </Tag>
          </Col>
        </Row>

        {/* Month and Completion */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Tag color="purple">{record.month}</Tag>
          </Col>
          <Col>
            <Text strong style={{ color: record.completionPercentage === 100 ? '#52c41a' : '#007aff', fontSize: 16 }}>
              {record.completionPercentage}% Complete
            </Text>
          </Col>
        </Row>

        {/* Static Content Progress */}
        <div style={{ marginBottom: 12 }}>
          <Row justify="space-between" style={{ marginBottom: 4 }}>
            <Col>
              <Text type="secondary">Static Posts</Text>
            </Col>
            <Col>
              <Text strong>{record.deliveredStatic || 0}/{record.staticPosts || 0}</Text>
            </Col>
          </Row>
          <Progress 
            percent={staticPercent} 
            size="small" 
            status={staticPercent === 100 ? "success" : "active"}
            strokeColor="#007aff"
          />
        </div>

        {/* Reels Content Progress */}
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" style={{ marginBottom: 4 }}>
            <Col>
              <Text type="secondary">Reels</Text>
            </Col>
            <Col>
              <Text strong>{record.deliveredReels || 0}/{record.reels || 0}</Text>
            </Col>
          </Row>
          <Progress 
            percent={reelsPercent} 
            size="small" 
            status={reelsPercent === 100 ? "success" : "active"}
            strokeColor="#007aff"
          />
        </div>

        {/* Action Buttons */}
        <Row gutter={8} justify="end">
          <Col>
            <Tooltip title="View Details">
              <Button 
                icon={<EyeOutlined />} 
                size="small"
                onClick={() => fetchContentDetails(record._id)}
              />
            </Tooltip>
          </Col>
          {(canEdit() || (userRole === "Client" && record.clientId?._id === userBusinessId)) && (
            <Col>
              <Tooltip title="Edit">
                <Button 
                  icon={<EditOutlined />} 
                  size="small"
                  onClick={() => openDrawer(record)}
                />
              </Tooltip>
            </Col>
          )}
          {canDelete() && (
            <Col>
              <Tooltip title="Delete">
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                  onClick={() => showDeleteConfirm(record)}
                />
              </Tooltip>
            </Col>
          )}
        </Row>

        {/* Client indicator for employee view */}
        {userRole === "Employee" && record.clientId?._id === userBusinessId && (
          <div style={{ marginTop: 8 }}>
            <Badge status="processing" text="Your Business" />
          </div>
        )}
      </Card>
    );
  };

  /* ================= TABLE COLUMNS ================= */

  const getColumns = () => {
    const baseColumns = [
      {
        title: "Business",
        dataIndex: "businessName",
        fixed: 'left',
        width: 200,
        render: (text, record) => (
          <Space direction="vertical" size={2}>
            <Tag color="blue">{text}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.clientId?.contactName || 'N/A'}
            </Text>
            {userRole === "Client" && userBusinessId === record.clientId?._id && (
              <Badge status="processing" text="Your Business" />
            )}
          </Space>
        ),
      },
      {
        title: "Month",
        dataIndex: "month",
        width: 100,
        render: (month) => (
          <Tag color="purple">{month}</Tag>
        ),
      },
      {
        title: "Static Content",
        children: [
          {
            title: "Planned",
            dataIndex: "staticPosts",
            width: 80,
            align: 'center',
            render: (val) => val || 0,
          },
          {
            title: "Delivered",
            dataIndex: "deliveredStatic",
            width: 80,
            align: 'center',
            render: (val) => val || 0,
          },
          {
            title: "Progress",
            width: 120,
            render: (_, r) => {
              const percent = r.staticPosts === 0 ? 0 : Math.round((r.deliveredStatic / r.staticPosts) * 100);
              return (
                <Tooltip title={`${r.deliveredStatic}/${r.staticPosts} delivered`}>
                  <Progress percent={percent} size="small" status={percent === 100 ? "success" : "active"} />
                </Tooltip>
              );
            },
          },
        ],
      },
      {
        title: "Reels Content",
        children: [
          {
            title: "Planned",
            dataIndex: "reels",
            width: 80,
            align: 'center',
            render: (val) => val || 0,
          },
          {
            title: "Delivered",
            dataIndex: "deliveredReels",
            width: 80,
            align: 'center',
            render: (val) => val || 0,
          },
          {
            title: "Progress",
            width: 120,
            render: (_, r) => {
              const percent = r.reels === 0 ? 0 : Math.round((r.deliveredReels / r.reels) * 100);
              return (
                <Tooltip title={`${r.deliveredReels}/${r.reels} delivered`}>
                  <Progress percent={percent} size="small" status={percent === 100 ? "success" : "active"} />
                </Tooltip>
              );
            },
          },
        ],
      },
      {
        title: "Status",
        dataIndex: "status",
        width: 100,
        render: (status) => {
          const statusConfig = {
            completed: { color: 'green', icon: <CheckCircleOutlined /> },
            active: { color: 'blue', icon: <LoadingOutlined /> },
            pending: { color: 'orange', icon: <ClockCircleOutlined /> }
          };
          const config = statusConfig[status] || statusConfig.pending;
          return (
            <Tag color={config.color} icon={config.icon}>
              {status?.toUpperCase()}
            </Tag>
          );
        },
      },
      {
        title: "Completion",
        dataIndex: "completionPercentage",
        width: 100,
        align: 'center',
        render: (percent) => (
          <Text strong style={{ color: percent === 100 ? '#52c41a' : '#007aff' }}>
            {percent}%
          </Text>
        ),
      },
    ];

    if (canEdit() || userRole === "Client") {
      baseColumns.push({
        title: "Actions",
        fixed: 'right',
        width: 120,
        render: (_, record) => {
          if (userRole === "Client") {
            if (record.clientId?._id === userBusinessId) {
              return (
                <Tooltip title="View Details">
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => fetchContentDetails(record._id)}
                    type="link"
                    size="small"
                  />
                </Tooltip>
              );
            }
            return null;
          }

          if (userRole === "Employee") {
            const hasAccess = businessAccounts.some(
              account => account._id === record.clientId?._id || account._id === record.clientId
            );
            if (!hasAccess) return null;
          }

          return (
            <Space>
              <Tooltip title="View Details">
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => fetchContentDetails(record._id)}
                  type="link"
                  size="small"
                />
              </Tooltip>
              <Tooltip title="Edit">
                <Button
                  icon={<EditOutlined />}
                  onClick={() => openDrawer(record)}
                  type="link"
                  size="small"
                />
              </Tooltip>
              {canDelete() && (
                <Tooltip title="Delete">
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    loading={deleting}
                    onClick={() => showDeleteConfirm(record)}
                    type="link"
                    size="small"
                  />
                </Tooltip>
              )}
            </Space>
          );
        },
      });
    }

    return baseColumns;
  };

  // Filter bar component
  const FilterBar = () => (
    <Card style={{ marginBottom: 16, borderRadius: 8 }} bordered={false}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={2}>
            <Text strong><FilterOutlined /> Filters</Text>
          </Col>
          <Col xs={24} sm={24} md={16}>
            <Space wrap style={{ width: '100%' }}>
              <Select
                placeholder="Select Month"
                style={{ width: screens.xs ? '100%' : 150 }}
                value={selectedMonth}
                onChange={setSelectedMonth}
                allowClear
              >
                {availableMonths.map(month => (
                  <Option key={month} value={month}>{month}</Option>
                ))}
              </Select>

              {userRole !== "Client" && (
                <Select
                  placeholder="Select Business"
                  style={{ width: screens.xs ? '100%' : 200 }}
                  value={selectedBusiness}
                  onChange={setSelectedBusiness}
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {businessAccounts.map(business => (
                    <Option key={business._id} value={business._id}>
                      {business.businessName}
                    </Option>
                  ))}
                </Select>
              )}

              <Select
                placeholder="Select Status"
                style={{ width: screens.xs ? '100%' : 150 }}
                value={selectedStatus}
                onChange={setSelectedStatus}
                allowClear
              >
                <Option value="completed">Completed</Option>
                <Option value="active">Active</Option>
                <Option value="pending">Pending</Option>
              </Select>

              <RangePicker 
                onChange={setDateRange}
                value={dateRange}
                format="DD/MM/YYYY"
                style={{ width: screens.xs ? '100%' : 250 }}
              />
            </Space>
          </Col>
          <Col xs={24} sm={24} md={6}>
            <Space wrap style={{ width: '100%', justifyContent: screens.xs ? 'flex-start' : 'flex-end' }}>
              <Button onClick={resetFilters}>Reset</Button>
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                onClick={exportToExcel}
                loading={exportLoading}
              >
                Excel
              </Button>
              <Button 
                icon={<FilePdfOutlined />}
                onClick={exportToPDF}
                loading={exportLoading}
              >
                PDF
              </Button>
            </Space>
          </Col>
        </Row>
        
        {/* Active filters display */}
        {(selectedMonth || selectedBusiness || selectedStatus || dateRange) && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Active Filters: </Text>
            <Space wrap size={[4, 8]}>
              {selectedMonth && <Tag closable onClose={() => setSelectedMonth(null)}>Month: {selectedMonth}</Tag>}
              {selectedBusiness && (
                <Tag closable onClose={() => setSelectedBusiness(null)}>
                  Business: {businessAccounts.find(b => b._id === selectedBusiness)?.businessName}
                </Tag>
              )}
              {selectedStatus && <Tag closable onClose={() => setSelectedStatus(null)}>Status: {selectedStatus}</Tag>}
              {dateRange && (
                <Tag closable onClose={() => setDateRange(null)}>
                  Date: {dateRange[0].format('DD/MM/YYYY')} - {dateRange[1].format('DD/MM/YYYY')}
                </Tag>
              )}
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );

  // Render role-based header
  const renderHeader = () => {
    const roleColors = {
      Admin: "red",
      Superadmin: "purple",
      Employee: "blue",
      "Team Leader": "gold",
      Client: "green",
    };

    return (
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col xs={24} sm={24} md={12}>
          <Space direction="vertical" size={4}>
            <Space align="center" wrap>
              <Title level={screens.xs ? 4 : 3} style={{ margin: 0 }}>
                Monthly Content Dashboard
              </Title>
              <Badge 
                count={userRole} 
                style={{ backgroundColor: roleColors[userRole] }}
              />
            </Space>
            {currentUser?.name && (
              <div>
                <Text type="secondary">
                  <UserOutlined /> {currentUser.name} ({currentUser.email})
                </Text>
                {userBusinessId && (
                  <div>
                    <Text type="secondary">
                      <ShopOutlined /> Business ID: {userBusinessId}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </Space>
        </Col>
        <Col xs={24} sm={24} md={12} style={{ marginTop: screens.xs ? 12 : 0 }}>
          <Space style={{ width: '100%', justifyContent: screens.xs ? 'flex-start' : 'flex-end' }}>
            {canCreate() && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openDrawer()}
                size={screens.xs ? "middle" : "large"}
                block={screens.xs}
              >
                Create Content
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    );
  };

  // Render role-based stats
  const renderStats = () => {
    const statsCards = userRole === "Client" ? (
      <>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={cardStyle}>
            <Statistic
              title="Your Static Posts"
              value={totalStatic}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#007aff', fontSize: screens.xs ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={cardStyle}>
            <Statistic
              title="Your Reels"
              value={totalReels}
              prefix={<VideoCameraOutlined />}
              valueStyle={{ color: '#007aff', fontSize: screens.xs ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={cardStyle}>
            <Statistic
              title="Your Completion"
              value={overallCompletion}
              suffix="%"
              valueStyle={{ color: overallCompletion === 100 ? '#52c41a' : '#007aff', fontSize: screens.xs ? 20 : 24 }}
            />
          </Card>
        </Col>
      </>
    ) : (
      <>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={cardStyle}>
            <Statistic 
              title="Filtered Clients" 
              value={totalClients} 
              prefix={<UserOutlined />}
              valueStyle={{ color: '#007aff', fontSize: screens.xs ? 20 : 28 }}
            />
            <Text type="secondary">of {clients.length} total</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={cardStyle}>
            <Statistic
              title="Static Completion"
              value={totalStatic ? Math.round((totalDeliveredStatic / totalStatic) * 100) : 0}
              suffix="%"
              valueStyle={{ color: '#007aff', fontSize: screens.xs ? 20 : 28 }}
            />
            <Text type="secondary">{totalStatic - totalDeliveredStatic} pending</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={cardStyle}>
            <Statistic
              title="Reels Completion"
              value={totalReels ? Math.round((totalDeliveredReels / totalReels) * 100) : 0}
              suffix="%"
              valueStyle={{ color: '#007aff', fontSize: screens.xs ? 20 : 28 }}
            />
            <Text type="secondary">{totalReels - totalDeliveredReels} pending</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={cardStyle}>
            <Statistic
              title="Overall Completion"
              value={overallCompletion}
              suffix="%"
              valueStyle={{ color: overallCompletion === 100 ? '#52c41a' : '#007aff', fontSize: screens.xs ? 20 : 28 }}
            />
            <Text type="secondary">{stats?.completedClients || 0} completed</Text>
          </Card>
        </Col>
      </>
    );

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statsCards}
      </Row>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ padding: screens.xs ? 12 : 24 }}>
      {renderHeader()}

      <Divider />

      {/* Filter Bar */}
      <FilterBar />

      {userRole === "Client" && clients.length === 0 && (
        <Alert
          message="No Content Found"
          description="You don't have any monthly content assigned to your business yet."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {renderStats()}

      {/* Export summary */}
      {filteredClients.length > 0 && userRole !== "Client" && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Showing {filteredClients.length} of {clients.length} records
          </Text>
        </div>
      )}

      <Card bordered={false} style={cardStyle}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Content Overview" key="1">
            {/* Mobile Card View */}
            {!screens.md && (
              <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '4px' }}>
                {filteredClients.length > 0 ? (
                  filteredClients.map(record => renderMobileCard(record))
                ) : (
                  <Empty 
                    description={
                      filteredClients.length === 0 && (selectedMonth || selectedBusiness || selectedStatus || dateRange)
                        ? "No results match your filters"
                        : userRole === "Client" 
                          ? "No content assigned to your business yet" 
                          : "No Monthly Content Found"
                    }
                  />
                )}
                
                {/* Mobile Pagination Info */}
                {filteredClients.length > 0 && (
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Text type="secondary">Total {filteredClients.length} items</Text>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Table View */}
            {screens.md && (
              <Table
                rowKey="_id"
                columns={getColumns()}
                dataSource={filteredClients}
                scroll={{ x: 1300 }}
                pagination={{ 
                  pageSize: 10,
                  showTotal: (total) => `Total ${total} items`,
                  responsive: true,
                }}
                locale={{
                  emptyText: (
                    <Empty 
                      description={
                        filteredClients.length === 0 && (selectedMonth || selectedBusiness || selectedStatus || dateRange)
                          ? "No results match your filters"
                          : userRole === "Client" 
                            ? "No content assigned to your business yet" 
                            : "No Monthly Content Found"
                      }
                    />
                  ),
                }}
                rowClassName="custom-row"
                summary={(pageData) => {
                  if (userRole === "Client" || pageData.length === 0) return null;
                  
                  const totalStatic = pageData.reduce((sum, r) => sum + (r.staticPosts || 0), 0);
                  const totalDeliveredStatic = pageData.reduce((sum, r) => sum + (r.deliveredStatic || 0), 0);
                  const totalReels = pageData.reduce((sum, r) => sum + (r.reels || 0), 0);
                  const totalDeliveredReels = pageData.reduce((sum, r) => sum + (r.deliveredReels || 0), 0);
                  
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={2}>
                          <Text strong>Page Totals</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2}>
                          <Text strong>{totalStatic}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          <Text strong>{totalDeliveredStatic}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>
                          <Progress 
                            percent={totalStatic ? Math.round((totalDeliveredStatic / totalStatic) * 100) : 0} 
                            size="small" 
                            showInfo={false}
                          />
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5}>
                          <Text strong>{totalReels}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6}>
                          <Text strong>{totalDeliveredReels}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={7}>
                          <Progress 
                            percent={totalReels ? Math.round((totalDeliveredReels / totalReels) * 100) : 0} 
                            size="small" 
                            showInfo={false}
                          />
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}
          </TabPane>
          
          {userRole !== "Client" && screens.md && (
            <TabPane tab="History & Activity" key="2">
              <Timeline mode="left">
                {filteredClients.slice(0, 10).map((client) => (
                  client.history?.map((entry, idx) => (
                    <Timeline.Item 
                      key={`${client._id}-${idx}`}
                      label={dayjs(entry.date).format('DD/MM/YYYY HH:mm')}
                      color="blue"
                    >
                      <Text strong>{client.businessName}</Text>
                      <div>Updated: {entry.staticPosts}/{entry.reels} posts</div>
                      <Text type="secondary">{entry.note || 'No notes'}</Text>
                    </Timeline.Item>
                  ))
                ))}
              </Timeline>
            </TabPane>
          )}
        </Tabs>
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={
          <Space direction="vertical" size={0}>
            <Title level={screens.xs ? 5 : 4} style={{ margin: 0 }}>
              {selectedContent
                ? "Edit Monthly Content"
                : "Create Monthly Content"}
            </Title>
            <Text type="secondary">
              {userRole === "Employee" 
                ? "Manage your assigned clients' delivery tracking"
                : "Manage client delivery tracking"}
            </Text>
          </Space>
        }
        width={screens.xs ? '100%' : 500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
            <Button
              type="primary"
              loading={saving}
              onClick={handleSave}
              icon={<SaveOutlined />}
            >
              Save
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          {!selectedContent && (
            <Form.Item
              name="clientId"
              label="Select Business"
              rules={[{ required: true, message: "Please select a business" }]}
            >
              <Select 
                placeholder="Select Business"
                showSearch
                optionFilterProp="children"
              >
                {businessAccounts.map((c) => (
                  <Option key={c._id} value={c._id}>
                    {c.businessName} - {c.contactName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="staticPosts"
                label="Total Static Posts"
                rules={[{ required: true, message: "Required" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="Enter number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deliveredStatic"
                label="Delivered Static"
                rules={[{ required: true, message: "Required" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="Enter number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="reels"
                label="Total Reels"
                rules={[{ required: true, message: "Required" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="Enter number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deliveredReels"
                label="Delivered Reels"
                rules={[{ required: true, message: "Required" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="Enter number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="note"
            label="Update Note"
          >
            <Input.TextArea rows={3} placeholder="Add a note about this update" />
          </Form.Item>

          {userRole === "Employee" && (
            <Alert
              message="Note"
              description="You can only create/edit content for clients assigned to you."
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Form>
      </Drawer>

      {/* Details Drawer */}
      <Drawer
        title={
          <Space wrap>
            <Title level={screens.xs ? 5 : 4} style={{ margin: 0 }}>
              Content Details
            </Title>
            {selectedContentDetails?.status && (
              <Tag color={
                selectedContentDetails.status === 'completed' ? 'green' :
                selectedContentDetails.status === 'active' ? 'blue' : 'orange'
              }>
                {selectedContentDetails.status?.toUpperCase()}
              </Tag>
            )}
          </Space>
        }
        width={screens.xs ? '100%' : 600}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDetailDrawerVisible(false)}>Close</Button>
            {canEdit() && (
              <Button 
                type="primary" 
                onClick={() => {
                  setDetailDrawerVisible(false);
                  openDrawer(selectedContentDetails);
                }}
              >
                Edit
              </Button>
            )}
          </Space>
        }
      >
        {selectedContentDetails && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card bordered={false} style={{ background: '#f5f5f5' }}>
              <Descriptions column={screens.xs ? 1 : 1}>
                <Descriptions.Item label="Business">
                  <Tag color="blue">{selectedContentDetails.businessName}</Tag>
                  {selectedContentDetails.clientId?._id === userBusinessId && (
                    <Badge status="processing" text="Your Business" style={{ marginLeft: 8 }} />
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Contact">
                  {selectedContentDetails.clientId?.contactName} ({selectedContentDetails.clientId?.contactEmail})
                </Descriptions.Item>
                <Descriptions.Item label="Month">
                  {selectedContentDetails.month}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card bordered={false} size="small">
                  <Statistic
                    title="Static Posts"
                    value={selectedContentDetails.deliveredStatic}
                    suffix={`/ ${selectedContentDetails.staticPosts}`}
                    valueStyle={{ color: '#007aff', fontSize: screens.xs ? 16 : 20 }}
                  />
                  <Progress 
                    percent={selectedContentDetails.staticPosts ? 
                      Math.round((selectedContentDetails.deliveredStatic / selectedContentDetails.staticPosts) * 100) : 0
                    } 
                    size="small"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card bordered={false} size="small">
                  <Statistic
                    title="Reels"
                    value={selectedContentDetails.deliveredReels}
                    suffix={`/ ${selectedContentDetails.reels}`}
                    valueStyle={{ color: '#007aff', fontSize: screens.xs ? 16 : 20 }}
                  />
                  <Progress 
                    percent={selectedContentDetails.reels ? 
                      Math.round((selectedContentDetails.deliveredReels / selectedContentDetails.reels) * 100) : 0
                    } 
                    size="small"
                  />
                </Card>
              </Col>
            </Row>

            <Card bordered={false}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic 
                    title="Total Planned" 
                    value={selectedContentDetails.totalPlanned || 0}
                    prefix={<BarChartOutlined />}
                    valueStyle={{ fontSize: screens.xs ? 16 : 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Total Delivered" 
                    value={selectedContentDetails.totalDelivered || 0}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a', fontSize: screens.xs ? 16 : 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Completion" 
                    value={selectedContentDetails.completionPercentage || 0}
                    suffix="%"
                    valueStyle={{ color: selectedContentDetails.completionPercentage === 100 ? '#52c41a' : '#007aff', fontSize: screens.xs ? 16 : 20 }}
                  />
                </Col>
              </Row>
            </Card>

            <Card 
              title={
                <Space>
                  <HistoryOutlined />
                  Update History
                </Space>
              }
              bordered={false}
            >
              <Timeline mode={screens.xs ? 'left' : 'left'}>
                {selectedContentDetails.history?.map((entry, idx) => (
                  <Timeline.Item key={idx} color="blue">
                    <Text strong>{dayjs(entry.date).format('DD MMM YYYY, HH:mm')}</Text>
                    <div>
                      Updated: {entry.staticPosts} static, {entry.reels} reels → 
                      {entry.deliveredStatic} delivered, {entry.deliveredReels} delivered
                    </div>
                    {entry.note && (
                      <Text type="secondary">Note: {entry.note}</Text>
                    )}
                    <div>
                      <Text type="secondary">By: {entry.updatedBy?.name || 'Unknown'}</Text>
                    </div>
                  </Timeline.Item>
                ))}
                {!selectedContentDetails.history?.length && (
                  <Empty description="No history available" />
                )}
              </Timeline>
            </Card>

            <Card bordered={false} size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Created">
                  {dayjs(selectedContentDetails.createdAt).format('DD MMM YYYY, HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Last Updated">
                  {dayjs(selectedContentDetails.updatedAt).format('DD MMM YYYY, HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Created By">
                  {selectedContentDetails.createdBy?.name} ({selectedContentDetails.createdBy?.role})
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

const cardStyle = {
  borderRadius: 14,
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
};

export default MonthlyContentDashboard; 