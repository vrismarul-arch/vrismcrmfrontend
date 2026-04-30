// components/ApplyLeave.js (Fixed Balance Display)
import React, { useEffect, useState, useContext } from "react";
import {
  Card, Form, DatePicker, Select, Input, Button, Typography, List, 
  Tag, message, Drawer, Row, Col, Statistic, Alert, Space, Modal, Progress
} from "antd";
import { 
  PlusOutlined, CalendarOutlined, CheckCircleOutlined, 
  WarningOutlined, HistoryOutlined, DollarOutlined 
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../../api/axios";
import { PresenceContext } from "../../context/PresenceContext";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const LeaveTypes = [
  { label: "Sick Leave", value: "Sick" },
  { label: "Casual Leave", value: "Casual" },
  { label: "Medical Leave", value: "Medical" },
  { label: "Paid Leave", value: "Paid" },
  { label: "Lop", value: "Unpaid" },
];

// Annual quotas
const ANNUAL_QUOTAS = {
  Sick: 6,
  Casual: 12,
  Medical: 0,
  Paid: 0,
  Unpaid: Infinity,
};

export default function ApplyLeave() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const { socket } = useContext(PresenceContext);
  const [form] = Form.useForm();

  const [myLeaves, setMyLeaves] = useState([]);
  const [balances, setBalances] = useState({});
  const [balanceYear, setBalanceYear] = useState(new Date().getFullYear());
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDays, setSelectedDays] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlySummary, setYearlySummary] = useState(null);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [yearChangeWarning, setYearChangeWarning] = useState(null);
  const [loading, setLoading] = useState(false);

  // Calculate used leaves from history
  const calculateUsedLeaves = () => {
    const used = {
      Sick: 0,
      Casual: 0,
      Medical: 0,
      Paid: 0,
      Unpaid: 0,
    };
    
    myLeaves.forEach(leave => {
      if (leave.status === "Approved" && leave.leaveYear === balanceYear) {
        const days = dayjs(leave.toDate).diff(dayjs(leave.fromDate), "day") + 1;
        if (used[leave.type] !== undefined) {
          used[leave.type] += days;
        }
      }
    });
    
    return used;
  };

  const usedLeaves = calculateUsedLeaves();

  const loadData = async () => {
    setLoading(true);
    try {
      // Get leaves with year filter
      const hist = await api.get(`/api/leaves/my/${currentUser._id}`);
      let leavesData = hist.data.leaves || hist.data || [];
      
      // Filter by selected year if needed
      if (selectedYear) {
        leavesData = leavesData.filter(l => 
          dayjs(l.fromDate).year() === selectedYear || l.leaveYear === selectedYear
        );
      }
      setMyLeaves(leavesData);

      // Get balance for selected year
      const bal = await api.get(`/api/leaves/balance/${currentUser._id}`, {
        params: { year: selectedYear }
      });
      
      setBalances(bal.data?.balances || {});
      setBalanceYear(bal.data?.year || new Date().getFullYear());
      setBalanceHistory(bal.data?.history || []);
      
      // Check for year rollover
      const currentYear = new Date().getFullYear();
      if (bal.data?.year && bal.data.year < currentYear && selectedYear === currentYear) {
        setYearChangeWarning({
          message: `Leave balances have been reset for ${currentYear}!`,
          oldYear: bal.data.year,
          newYear: currentYear,
        });
      }
      
    } catch (err) {
      console.error("Load error:", err);
      message.error("❌ Failed to load leave data");
    } finally {
      setLoading(false);
    }
  };

  const loadYearlySummary = async (year) => {
    try {
      const summary = await api.get(`/api/leaves/summary/${currentUser._id}`, {
        params: { year }
      });
      setYearlySummary(summary.data);
      setSummaryModalVisible(true);
    } catch (err) {
      message.error("Failed to load yearly summary");
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => loadData();
    socket.on("leave_status_update", refresh);
    socket.on("leave_request_received", refresh);
    socket.on("leave_list_refresh", refresh);
    
    return () => {
      socket.off("leave_status_update", refresh);
      socket.off("leave_request_received", refresh);
      socket.off("leave_list_refresh", refresh);
    };
  }, [socket]);

  const applyLeave = async (values) => {
    try {
      const [from, to] = values.dates;
      const fromYear = dayjs(from).year();
      const toYear = dayjs(to).year();
      
      if (fromYear !== toYear) {
        message.error("Leave cannot span across different years. Please apply separately for each year.");
        return;
      }
      
      if (fromYear !== balanceYear) {
        message.warning(`You are applying leave for ${fromYear}, but current balance is for ${balanceYear}. Please refresh.`);
        return;
      }

      await api.post("/api/leaves", {
        type: values.type,
        reason: values.reason,
        userId: currentUser._id,
        fromDate: from.toISOString(),
        toDate: to.toISOString(),
      });

      socket?.emit("new_leave_request", { userId: currentUser._id });
      socket?.emit("leave_applied");

      message.success("✔ Leave Request Sent");
      form.resetFields();
      setSelectedDays(0);
      setDrawerVisible(false);
      loadData();
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to apply");
    }
  };

  const renderApprovalTag = (label, value) => (
    <Tag
      color={value === "Approved" ? "green" : value === "Rejected" ? "red" : "orange"}
      style={{ marginRight: 4 }}
    >
      {label}: {value || "Pending"}
    </Tag>
  );

  // Calculate total balance and total used
  const totalBalance = Object.values(balances).reduce((sum, val) => {
    if (val !== Infinity && typeof val === 'number') return sum + val;
    return sum;
  }, 0);
  
  const totalUsed = Object.values(usedLeaves).reduce((sum, val) => sum + val, 0);
  const totalQuota = Object.values(ANNUAL_QUOTAS).reduce((sum, val) => {
    if (val !== Infinity && typeof val === 'number') return sum + val;
    return sum;
  }, 0);

  return (
    <div style={{ padding: "0 20px" }}>
      {/* Year Change Warning */}
      {yearChangeWarning && (
        <Alert
          message="Year Rollover Notice"
          description={yearChangeWarning.message}
          type="info"
          showIcon
          icon={<WarningOutlined />}
          closable
          onClose={() => setYearChangeWarning(null)}
          style={{ marginBottom: 20 }}
        />
      )}
      
      {/* Year Selector */}
      <Card style={{ marginBottom: 20 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <Space>
              <CalendarOutlined />
              <Text strong>Leave Year: {balanceYear}</Text>
              <Select 
                value={selectedYear}
                onChange={setSelectedYear}
                style={{ width: 120 }}
              >
                <Select.Option value={new Date().getFullYear()}>
                  {new Date().getFullYear()}
                </Select.Option>
                <Select.Option value={new Date().getFullYear() - 1}>
                  {new Date().getFullYear() - 1}
                </Select.Option>
                {balanceHistory.map(h => (
                  <Select.Option key={h.year} value={h.year}>
                    {h.year}
                  </Select.Option>
                ))}
              </Select>
            </Space>
            
          </div>
           
          
        </Space>
      </Card> <Col xs={24} sm={8}><Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setDrawerVisible(true)}
            disabled={selectedYear !== balanceYear}
            block
          >
            Apply New Leave {selectedYear !== balanceYear && "(Switch to current year)"}
          </Button></Col>

      {/* Leave Balance Summary Cards */}
      <Card title="Leave Balance Summary" style={{ marginBottom: 20 }}>
        {/* Overall Summary */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ background: "#f0f5ff", textAlign: "center" }}>
              <Statistic
                title="Total Annual Quota"
                value={totalQuota}
                suffix="days"
                valueStyle={{ color: "#1890ff", fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ background: "#f6ffed", textAlign: "center" }}>
              <Statistic
                title="Total Available"
                value={totalBalance}
                suffix="days"
                valueStyle={{ color: "#52c41a", fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ background: "#fff7e6", textAlign: "center" }}>
              <Statistic
                title="Total Used"
                value={totalUsed}
                suffix="days"
                valueStyle={{ color: "#fa8c16", fontSize: 24 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Individual Leave Type Cards */}
        <Title level={5}>Leave Type Breakdown</Title>
        <Row gutter={[16, 16]}>
          {/* Sick Leave Card */}
          <Col xs={24} md={12} lg={8}>
            <Card 
              size="small"
              style={{ 
                borderLeft: `4px solid ${(balances.Sick || 0) <= 2 ? '#ff4d4f' : '#52c41a'}`,
                background: '#fafafa'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 16 }}>🤒 Sick Leave</Text>
                <Tag color={ANNUAL_QUOTAS.Sick === 6 ? "blue" : "default"}>Annual: 6 days</Tag>
              </div>
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <Statistic 
                    title="Available" 
                    value={balances.Sick || 0} 
                    valueStyle={{ color: (balances.Sick || 0) <= 2 ? '#ff4d4f' : '#52c41a', fontSize: 20 }}
                    suffix="days"
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="Used" 
                    value={usedLeaves.Sick || 0} 
                    valueStyle={{ color: '#fa8c16', fontSize: 20 }}
                    suffix="days"
                  />
                </Col>
              </Row>
              <Progress 
                percent={Math.round(((usedLeaves.Sick || 0) / ANNUAL_QUOTAS.Sick) * 100)} 
                size="small"
                status={((usedLeaves.Sick || 0) / ANNUAL_QUOTAS.Sick) > 0.8 ? "exception" : "active"}
                strokeColor={((usedLeaves.Sick || 0) / ANNUAL_QUOTAS.Sick) > 0.8 ? "#ff4d4f" : "#52c41a"}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>

          {/* Casual Leave Card */}
          <Col xs={24} md={12} lg={8}>
            <Card 
              size="small"
              style={{ 
                borderLeft: `4px solid ${(balances.Casual || 0) <= 3 ? '#ff4d4f' : '#52c41a'}`,
                background: '#fafafa'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 16 }}>🏖️ Casual Leave</Text>
                <Tag color="blue">Annual: 12 days</Tag>
              </div>
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <Statistic 
                    title="Available" 
                    value={balances.Casual || 0} 
                    valueStyle={{ color: (balances.Casual || 0) <= 3 ? '#ff4d4f' : '#52c41a', fontSize: 20 }}
                    suffix="days"
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="Used" 
                    value={usedLeaves.Casual || 0} 
                    valueStyle={{ color: '#fa8c16', fontSize: 20 }}
                    suffix="days"
                  />
                </Col>
              </Row>
              <Progress 
                percent={Math.round(((usedLeaves.Casual || 0) / ANNUAL_QUOTAS.Casual) * 100)} 
                size="small"
                status={((usedLeaves.Casual || 0) / ANNUAL_QUOTAS.Casual) > 0.8 ? "exception" : "active"}
                strokeColor={((usedLeaves.Casual || 0) / ANNUAL_QUOTAS.Casual) > 0.8 ? "#ff4d4f" : "#52c41a"}
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>

          {/* Other Leave Types */}
          {Object.keys(balances).filter(t => t !== 'Sick' && t !== 'Casual').map((t) => {
            const quota = ANNUAL_QUOTAS[t] || 0;
            const used = usedLeaves[t] || 0;
            const percent = quota > 0 ? Math.round((used / quota) * 100) : 0;
            
            return (
              <Col xs={24} md={12} lg={8} key={t}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 16 }}>📋 {t} Leave</Text>
                    {quota > 0 && <Tag color="blue">Annual: {quota} days</Tag>}
                  </div>
                  <Row gutter={16} style={{ marginTop: 12 }}>
                    <Col span={12}>
                      <Statistic 
                        title="Available" 
                        value={balances[t] === Infinity ? "∞" : (balances[t] || 0)} 
                        valueStyle={{ fontSize: 20 }}
                        suffix={balances[t] !== Infinity ? "days" : ""}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic 
                        title="Used" 
                        value={used || 0} 
                        valueStyle={{ color: '#fa8c16', fontSize: 20 }}
                        suffix="days"
                      />
                    </Col>
                  </Row>
                  {quota > 0 && (
                    <Progress 
                      percent={percent} 
                      size="small"
                      status={percent > 80 ? "exception" : "active"}
                      strokeColor={percent > 80 ? "#ff4d4f" : "#52c41a"}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
        
        {/* History Note */}
        {balanceHistory.length > 0 && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Text type="secondary">
              📅 Previous years: {balanceHistory.map(h => h.year).join(", ")}
            </Text>
          </div>
        )}
      </Card>

      {/* Apply Leave Drawer */}
      <Drawer
        title={`Submit Leave Request (${balanceYear})`}
        width={450}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={applyLeave}>
          <Form.Item
            label="Select Dates"
            name="dates"
            rules={[{ required: true }]}
            extra={`Leaves must be within ${balanceYear}`}
          >
            <RangePicker
              style={{ width: "100%" }}
              disabledDate={(current) => {
                return current && current.year() !== balanceYear;
              }}
              onChange={(v) => {
                if (!v) return setSelectedDays(0);
                const days = dayjs(v[1]).diff(dayjs(v[0]), "day") + 1;
                setSelectedDays(days);
              }}
            />
          </Form.Item>

          {selectedDays > 0 && (
            <Alert
              message={`Selected: ${selectedDays} day(s)`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item label="Leave Type" name="type" rules={[{ required: true }]}>
            <Select 
              options={LeaveTypes}
              onChange={(value) => {
                const available = balances[value] || 0;
                if (available < selectedDays && available !== Infinity) {
                  message.warning(`You only have ${available} days available for ${value} leave`);
                }
              }}
            />
          </Form.Item>

          <Form.Item label="Reason" name="reason" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Please provide reason for leave..." />
          </Form.Item>

          <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />} block>
            Submit Request
          </Button>
        </Form>
      </Drawer>

      {/* Yearly Summary Modal */}
      <Modal
        title={`Leave Summary - ${selectedYear}`}
        open={summaryModalVisible}
        onCancel={() => setSummaryModalVisible(false)}
        footer={null}
        width={700}
      >
        {yearlySummary && (
          <>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={12}>
                <Card size="small">
                  <Statistic 
                    title="Total Used Leaves" 
                    value={Object.values(yearlySummary.used || {}).reduce((a, b) => a + b, 0)}
                    suffix="days"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic 
                    title="Total Available" 
                    value={Object.values(yearlySummary.available || {}).reduce((a, b) => {
                      if (b !== Infinity && typeof b === 'number') return a + b;
                      return a;
                    }, 0)}
                    suffix="days"
                  />
                </Card>
              </Col>
            </Row>
            
            <Title level={5}>Breakdown by Leave Type</Title>
            <List
              size="small"
              dataSource={Object.entries(yearlySummary.used || {})}
              renderItem={([type, days]) => (
                <List.Item>
                  <span><strong>{type}</strong></span>
                  <span>
                    Used: {days} days | Available: {yearlySummary.available[type] === Infinity ? "∞" : (yearlySummary.available[type] || 0)} days
                  </span>
                </List.Item>
              )}
            />
            
            {yearlySummary.leaves?.length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 16 }}>Leave History for {selectedYear}</Title>
                <List
                  size="small"
                  dataSource={yearlySummary.leaves}
                  renderItem={(leave) => (
                    <List.Item>
                      <div>
                        <Tag color="blue">{leave.type}</Tag>
                        {dayjs(leave.fromDate).format("DD MMM")} - {dayjs(leave.toDate).format("DD MMM YYYY")}
                        <Tag color={leave.status === "Approved" ? "green" : "orange"} style={{ marginLeft: 8 }}>
                          {leave.status}
                        </Tag>
                      </div>
                      <Text type="secondary">{leave.days} days</Text>
                    </List.Item>
                  )}
                />
              </>
            )}
          </>
        )}
      </Modal>

      {/* Leave History */}
      <Card title={`My Leave History (${balanceYear})`}>
        <List
          loading={loading}
          dataSource={myLeaves}
          locale={{ emptyText: "No leave records found for this year" }}
          renderItem={(item) => {
            const leaveYear = dayjs(item.fromDate).year();
            return (
              <List.Item>
                <div style={{ flex: 1 }}>
                  <Space wrap>
                    <Text strong>
                      {dayjs(item.fromDate).format("DD MMM")} - {dayjs(item.toDate).format("DD MMM YYYY")}
                    </Text>
                    <Tag color="purple">{leaveYear}</Tag>
                    <Tag color={item.type === "Sick" ? "red" : "blue"}>{item.type}</Tag>
                    <Text type="secondary">
                      {dayjs(item.toDate).diff(dayjs(item.fromDate), "day") + 1} days
                    </Text>
                  </Space>
                  <br />
                  <div style={{ marginTop: 8 }}>
                    {renderApprovalTag("Team Leader", item.approval?.["Team Leader"])}
                    {renderApprovalTag("Admin", item.approval?.["Admin"])}
                    {renderApprovalTag("Superadmin", item.approval?.["Superadmin"])}
                  </div>
                  {item.reason && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">Reason: {item.reason}</Text>
                    </div>
                  )}
                  {item.rejectReason && (
                    <Text type="danger">Rejected: {item.rejectReason}</Text>
                  )}
                </div>
                <Tag
                  color={
                    item.status === "Approved"
                      ? "green"
                      : item.status === "Rejected"
                      ? "red"
                      : "orange"
                  }
                  style={{ minWidth: 80, textAlign: "center" }}
                >
                  {item.status}
                </Tag>
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}