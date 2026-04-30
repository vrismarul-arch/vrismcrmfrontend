import React, { useEffect, useState, useContext } from "react";
import {
  Card,
  List,
  Button,
  Typography,
  Tag,
  message,
  Tabs,
  Skeleton,
  Drawer,
  Input,
  Space,
  Badge,
  Avatar,
  Tooltip,
  Empty,
  Descriptions,
  Modal,
  Alert,
  Spin,
  Select,
  Statistic,
  Row,
  Col,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import api from "../../api/axios";
import { PresenceContext } from "../../context/PresenceContext";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

export default function ManageLeaves() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const { socket } = useContext(PresenceContext);
  const userRole = currentUser?.role;

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [teamsList, setTeamsList] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedLeave, setSelectedLeave] = useState(null);
  
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [selectedViewLeave, setSelectedViewLeave] = useState(null);

  // Load data from API
  const loadData = async () => {
    setLoading(true);
    try {
      // Load pending leaves based on role
      let pendingUrl = "/api/leaves/pending";
      const pendingParams = {};
      
      if (userRole === "Team Leader") {
        pendingParams.role = "Team Leader";
        pendingParams.teamId = currentUser.team;
      } else if (userRole === "Admin") {
        pendingParams.role = "Admin";
      } else if (userRole === "Superadmin") {
        pendingParams.role = "Superadmin";
        pendingParams.all = true;
      }
      
      const pendingRes = await api.get(pendingUrl, { params: pendingParams });
      setPending(pendingRes.data || []);

      // Load all leaves for history with year filter
      const historyUrl = "/api/leaves/all";
      const historyParams = {};
      
      if (userRole === "Team Leader") {
        historyParams.teamId = currentUser.team;
      }
      if (filterYear) {
        historyParams.year = filterYear;
      }
      
      const histRes = await api.get(historyUrl, { params: historyParams });
      setHistory(histRes.data || []);

      // Load teams for filter (if Superadmin)
      if (userRole === "Superadmin") {
        const teamsRes = await api.get("/api/teams");
        setTeamsList(teamsRes.data || []);
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      message.error(err?.response?.data?.message || "Failed to load leave data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterYear]);

  // Real-time Auto Refresh via Socket
  useEffect(() => {
    if (!socket) return;

    const refresh = () => {
      loadData();
    };

    socket.on("leave_request_received", refresh);
    socket.on("leave_status_update", refresh);
    socket.on("leave_created", refresh);
    socket.on("leave_list_refresh", refresh);

    return () => {
      socket.off("leave_request_received", refresh);
      socket.off("leave_status_update", refresh);
      socket.off("leave_created", refresh);
      socket.off("leave_list_refresh", refresh);
    };
  }, [socket]);

  // Check if current user can approve this leave
  const isMyTurn = (leave) => {
    if (!leave) return false;
    
    const currentLevel = leave.currentLevel;
    
    if (userRole === "Team Leader" && currentLevel === "Team Leader") return true;
    if (userRole === "Admin" && currentLevel === "Admin") return true;
    if (userRole === "Superadmin" && currentLevel === "Superadmin") return true;
    
    // Superadmin can approve any pending leave
    if (userRole === "Superadmin" && leave.status === "Pending") return true;
    
    return false;
  };

  // Check if user can view/see this leave
  const canViewLeave = (leave) => {
    if (!leave) return false;
    
    // Superadmin can view all leaves
    if (userRole === "Superadmin") return true;
    
    // Admin can view all leaves
    if (userRole === "Admin") return true;
    
    // Team Leader can view their team members only
    if (userRole === "Team Leader") {
      return leave.userId?.team === currentUser.team;
    }
    
    return false;
  };

  // Approve leave
  const approve = async (leave) => {
    setProcessing(true);
    try {
      await api.patch(`/api/leaves/${leave._id}/status`, {
        status: "Approved",
        role: userRole,
      });

      if (socket) {
        socket.emit("leave_status_update", { 
          leaveId: leave._id, 
          status: "Approved",
          level: userRole 
        });
      }

      message.success(`Leave approved by ${userRole}`);
      loadData();
    } catch (err) {
      console.error("Approval error:", err);
      message.error(err?.response?.data?.message || "Failed to approve leave");
    } finally {
      setProcessing(false);
    }
  };

  // Reject leave
  const rejectConfirm = async () => {
    if (!rejectReason.trim()) {
      message.error("Please enter rejection reason");
      return;
    }

    setProcessing(true);
    try {
      await api.patch(`/api/leaves/${selectedLeave._id}/status`, {
        status: "Rejected",
        role: userRole,
        rejectReason,
      });

      if (socket) {
        socket.emit("leave_status_update", {
          leaveId: selectedLeave._id,
          status: "Rejected",
          level: userRole,
        });
      }

      setDrawerOpen(false);
      setRejectReason("");
      setSelectedLeave(null);
      message.warning(`Leave rejected by ${userRole}`);
      loadData();
    } catch (err) {
      console.error("Rejection error:", err);
      message.error(err?.response?.data?.message || "Failed to reject leave");
    } finally {
      setProcessing(false);
    }
  };

  // Get approval workflow status
  const getApprovalFlow = (leave) => {
    const levels = ["Team Leader", "Admin", "Superadmin"];
    const approval = leave.approval || {};
    
    return levels.map(level => ({
      level,
      status: approval[level] || "Pending",
      isCurrent: leave.currentLevel === level,
    }));
  };

  // Get status color and icon
  const getStatusConfig = (status) => {
    switch (status) {
      case "Approved":
        return { color: "green", icon: <CheckCircleOutlined />, text: "Approved" };
      case "Rejected":
        return { color: "red", icon: <CloseCircleOutlined />, text: "Rejected" };
      default:
        return { color: "orange", icon: <ClockCircleOutlined />, text: "Pending" };
    }
  };

  // Render approval tags
  const renderApprovalTag = (label, value) => {
    const config = getStatusConfig(value);
    return (
      <Tooltip title={`${label} Approval: ${value}`}>
        <Tag 
          color={config.color} 
          icon={config.icon}
          style={{ marginRight: 8, marginBottom: 4 }}
        >
          {label}: {value}
        </Tag>
      </Tooltip>
    );
  };

  // View leave details
  const viewLeaveDetails = (leave) => {
    setSelectedViewLeave(leave);
    setViewDrawerOpen(true);
  };

  // Filter pending leaves based on team and year
  const getFilteredPending = () => {
    if (!pending.length) return [];
    
    let filtered = pending.filter(leave => canViewLeave(leave));
    
    // Filter by team for Superadmin
    if (filterTeam !== "all" && userRole === "Superadmin") {
      filtered = filtered.filter(leave => leave.userId?.team === filterTeam);
    }
    
    // Filter by year
    if (filterYear) {
      filtered = filtered.filter(leave => 
        dayjs(leave.fromDate).year() === filterYear || leave.leaveYear === filterYear
      );
    }
    
    return filtered;
  };

  // Filter history leaves
  const getFilteredHistory = () => {
    if (!history.length) return [];
    
    let filtered = [...history];
    
    // Filter by team for Superadmin
    if (filterTeam !== "all" && userRole === "Superadmin") {
      filtered = filtered.filter(leave => leave.userId?.team === filterTeam);
    }
    
    return filtered.sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix());
  };

  // Get unique teams from leaves
  const getUniqueTeams = () => {
    if (teamsList.length > 0) {
      return teamsList.map(team => team.name || team);
    }
    
    const teams = new Set();
    [...pending, ...history].forEach(leave => {
      if (leave.userId?.team) {
        teams.add(leave.userId.team);
      }
    });
    return Array.from(teams);
  };

  // Stats calculation
  const getStats = () => {
    const filteredHistory = getFilteredHistory();
    const filteredPending = getFilteredPending();
    
    // Calculate total days approved
    const totalApprovedDays = filteredHistory
      .filter(l => l.status === "Approved")
      .reduce((sum, l) => {
        const days = dayjs(l.toDate).diff(dayjs(l.fromDate), "day") + 1;
        return sum + days;
      }, 0);
    
    return {
      total: filteredHistory.length + filteredPending.length,
      pending: filteredPending.length,
      approved: filteredHistory.filter(l => l.status === "Approved").length,
      rejected: filteredHistory.filter(l => l.status === "Rejected").length,
      totalDays: totalApprovedDays,
    };
  };

  const stats = getStats();

  // Render leave item
  const renderLeave = (l) => {
    const statusConfig = getStatusConfig(l.status);
    const canApprove = l.status === "Pending" && isMyTurn(l);
    const approvalFlow = getApprovalFlow(l);
    const daysCount = dayjs(l.toDate).diff(dayjs(l.fromDate), "day") + 1;
    
    return (
      <List.Item
        actions={[
          <Button 
            type="link" 
            icon={<FileTextOutlined />} 
            onClick={() => viewLeaveDetails(l)}
            key="view"
          >
            View
          </Button>,
          l.status !== "Pending" ? (
            <Tag color={statusConfig.color} icon={statusConfig.icon} key="status">
              {statusConfig.text}
            </Tag>
          ) : canApprove ? (
            <Space key="actions">
              <Button 
                type="primary" 
                size="small"
                loading={processing}
                onClick={() => approve(l)}
              >
                Approve
              </Button>
              <Button 
                danger 
                size="small"
                loading={processing}
                onClick={() => {
                  setSelectedLeave(l);
                  setDrawerOpen(true);
                }}
              >
                Reject
              </Button>
            </Space>
          ) : (
            <Tooltip title={`Waiting for ${l.currentLevel} approval`} key="waiting">
              <Tag color="cyan" icon={<ClockCircleOutlined />}>
                Waiting for {l.currentLevel}
              </Tag>
            </Tooltip>
          ),
        ]}
      >
        <List.Item.Meta
          avatar={
            <Avatar 
              icon={<UserOutlined />} 
              src={l.userId?.profileImage}
              style={{ backgroundColor: l.userId?.role === "Team Leader" ? "#52c41a" : "#1677ff" }}
            >
              {!l.userId?.profileImage && (l.userId?.name?.charAt(0) || "U")}
            </Avatar>
          }
          title={
            <Space direction="vertical" size={0}>
              <Space wrap>
                <Text strong>{l.userId?.name || "Unknown User"}</Text>
                <Tag color="blue">{l.type}</Tag>
                {l.userId?.role && <Tag color="geekblue">{l.userId.role}</Tag>}
                {/* {l.userId?.team && <Tag color="purple">Team: {l.userId.team}</Tag>} */}
                <Tag color="cyan">{daysCount} day(s)</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <CalendarOutlined /> {dayjs(l.fromDate).format("DD MMM YYYY")} → {dayjs(l.toDate).format("DD MMM YYYY")}
                {" • "}
                {dayjs(l.fromDate).fromNow()}
              </Text>
            </Space>
          }
          description={
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>
                {approvalFlow.map(flow => (
                  renderApprovalTag(flow.level, flow.status)
                ))}
              </div>
              {l.reason && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <FileTextOutlined /> Reason: {l.reason}
                  </Text>
                </div>
              )}
              {l.rejectReason && (
                <div>
                  <Text type="danger" style={{ fontSize: 12 }}>
                    <ExclamationCircleOutlined /> Rejection: {l.rejectReason}
                  </Text>
                </div>
              )}
            </div>
          }
        />
      </List.Item>
    );
  };

  // Get current year and previous years for filter
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <>
      <Card style={{ borderRadius: 12 }}>
        {/* Header Stats */}
        <div style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <Title level={4} style={{ margin: 0 }}>
                Leave Approvals Management
                {userRole === "Superadmin" && <Tag color="gold" style={{ marginLeft: 8 }}>Super Admin Access</Tag>}
                {userRole === "Admin" && <Tag color="blue" style={{ marginLeft: 8 }}>Admin Access</Tag>}
                {userRole === "Team Leader" && <Tag color="green" style={{ marginLeft: 8 }}>Team Leader Access</Tag>}
              </Title>
              <Button icon={<ReloadOutlined />} onClick={loadData}>Refresh</Button>
            </div>
            
            {/* Stats Cards */}
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Pending"
                    value={stats.pending}
                    valueStyle={{ color: "#faad14" }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Approved"
                    value={stats.approved}
                    valueStyle={{ color: "#52c41a" }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Rejected"
                    value={stats.rejected}
                    valueStyle={{ color: "#ff4d4f" }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="Total Days Approved"
                    value={stats.totalDays}
                    suffix="days"
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* Filters */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <Space size="middle" wrap>
                <FilterOutlined />
                <Text strong>Filters:</Text>
                
                {/* Year Filter */}
                <Select 
                  value={filterYear} 
                  onChange={setFilterYear}
                  style={{ width: 120 }}
                  options={yearOptions.map(year => ({ label: year, value: year }))}
                />
                
                {/* Team Filter for Superadmin */}
                {userRole === "Superadmin" && getUniqueTeams().length > 0 && (
                  <Select 
                    value={filterTeam} 
                    onChange={setFilterTeam}
                    style={{ width: 200 }}
                    placeholder="Filter by team"
                    allowClear
                  >
                    <Select.Option value="all">All Teams</Select.Option>
                    {getUniqueTeams().map(team => (
                      <Select.Option key={team} value={team}>
                        <TeamOutlined /> Team {team}
                      </Select.Option>
                    ))}
                  </Select>
                )}
              </Space>
              
              {/* Summary Badges */}
              <Space size="small">
                <Badge count={stats.pending} style={{ backgroundColor: "#faad14" }}>
                  <Tag color="orange">Pending</Tag>
                </Badge>
                <Badge count={stats.approved} style={{ backgroundColor: "#52c41a" }}>
                  <Tag color="green">Approved</Tag>
                </Badge>
                <Badge count={stats.rejected} style={{ backgroundColor: "#ff4d4f" }}>
                  <Tag color="red">Rejected</Tag>
                </Badge>
              </Space>
            </div>
          </Space>
        </div>

        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: (
                <span>
                  <ClockCircleOutlined /> Pending Requests ({getFilteredPending().length})
                </span>
              ),
              children: loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : getFilteredPending().length === 0 ? (
                <Empty 
                  description={
                    <div>
                      <Text>No pending leave requests</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {userRole === "Superadmin" 
                          ? "All leave requests have been processed" 
                          : "No leaves waiting for your approval"}
                      </Text>
                    </div>
                  } 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List 
                  dataSource={getFilteredPending()} 
                  renderItem={renderLeave}
                  pagination={{
                    pageSize: 10,
                    showTotal: (total) => `${total} pending requests`,
                  }}
                />
              ),
            },
            {
              key: "2",
              label: (
                <span>
                  <FileTextOutlined /> History ({getFilteredHistory().length})
                </span>
              ),
              children: loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : getFilteredHistory().length === 0 ? (
                <Empty 
                  description={`No leave history found for ${filterYear}`}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List 
                  dataSource={getFilteredHistory()} 
                  renderItem={renderLeave}
                  pagination={{
                    pageSize: 10,
                    showTotal: (total) => `${total} records`,
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Reject Drawer */}
      <Drawer
        title={
          <Space>
            <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
            Reject Leave Request
          </Space>
        }
        width={400}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setRejectReason("");
          setSelectedLeave(null);
        }}
        footer={
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => {
                setDrawerOpen(false);
                setRejectReason("");
                setSelectedLeave(null);
              }}>
                Cancel
              </Button>
              <Button 
                danger 
                type="primary" 
                onClick={rejectConfirm}
                loading={processing}
              >
                Confirm Reject
              </Button>
            </Space>
          </div>
        }
      >
        {selectedLeave && (
          <>
            <Alert
              message="Rejection Reason Required"
              description="Please provide a reason for rejecting this leave request. This will be visible to the employee."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginBottom: 16 }}>
              <Text strong>Employee:</Text> {selectedLeave.userId?.name}
              <br />
              <Text strong>Leave Type:</Text> {selectedLeave.type}
              <br />
              <Text strong>Duration:</Text> {dayjs(selectedLeave.fromDate).format("DD MMM")} → {dayjs(selectedLeave.toDate).format("DD MMM YYYY")}
              <br />
              <Text strong>Total Days:</Text> {dayjs(selectedLeave.toDate).diff(dayjs(selectedLeave.fromDate), "day") + 1} days
            </div>
            <Input.TextArea
              rows={5}
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              showCount
            />
          </>
        )}
      </Drawer>

      {/* View Details Drawer */}
      <Drawer
        title={
          <Space>
            <FileTextOutlined />
            Leave Request Details
          </Space>
        }
        width={500}
        open={viewDrawerOpen}
        onClose={() => {
          setViewDrawerOpen(false);
          setSelectedViewLeave(null);
        }}
      >
        {selectedViewLeave && (
          <Spin spinning={!selectedViewLeave}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Employee">
                <Space>
                  <Avatar 
                    style={{ fontSize: 24, backgroundColor: "#122e44" }}
                    src={selectedViewLeave.userId?.profileImage}
                  >
                    {!selectedViewLeave.userId?.profileImage && selectedViewLeave.userId?.name?.charAt(0)}
                  </Avatar>
                  {selectedViewLeave.userId?.name}
                  <Tag color="geekblue">{selectedViewLeave.userId?.role}</Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Team">
                <Tag color="purple">{selectedViewLeave.userId?.team || "N/A"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Leave Type">
                <Tag color="blue">{selectedViewLeave.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {dayjs(selectedViewLeave.fromDate).format("DD MMM YYYY")} → {dayjs(selectedViewLeave.toDate).format("DD MMM YYYY")}
                <br />
                <Text type="secondary">
                  Total: {Math.ceil(dayjs(selectedViewLeave.toDate).diff(dayjs(selectedViewLeave.fromDate), "day") + 1)} day(s)
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Year">
                <Tag color="cyan">{selectedViewLeave.leaveYear || dayjs(selectedViewLeave.fromDate).year()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reason">
                {selectedViewLeave.reason || "No reason provided"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusConfig(selectedViewLeave.status).color}>
                  {selectedViewLeave.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Current Level">
                <Tag color="cyan">{selectedViewLeave.currentLevel || "N/A"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Approval Workflow">
                <Space direction="vertical">
                  {Object.entries(selectedViewLeave.approval || {}).map(([level, status]) => (
                    <div key={level}>
                      <Text strong>{level}:</Text>{" "}
                      <Tag color={getStatusConfig(status).color}>
                        {status}
                      </Tag>
                    </div>
                  ))}
                </Space>
              </Descriptions.Item>
              {selectedViewLeave.rejectReason && (
                <Descriptions.Item label="Rejection Reason">
                  <Text type="danger">{selectedViewLeave.rejectReason}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Requested On">
                {dayjs(selectedViewLeave.createdAt).format("DD MMM YYYY, hh:mm A")}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {dayjs(selectedViewLeave.updatedAt).format("DD MMM YYYY, hh:mm A")}
              </Descriptions.Item>
            </Descriptions>
          </Spin>
        )}
      </Drawer>
    </>
  );
}