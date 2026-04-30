import React, { useEffect, useState, useContext, useRef } from "react";
import {
  Table, Typography, Tag, Space, Button, Card,
  Row, Col, Select, Spin, DatePicker, Modal, List, Grid
} from "antd";
import axios from "../../api/axios";
import dayjs from "dayjs";
import toast, { Toaster } from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { PresenceContext } from "../../context/PresenceContext";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const formatLastSeen = (date) =>
  date ? dayjs(date).format("DD MMM YYYY, hh:mm A") : "—";

/**
 * EodReport
 * - loads users (once)
 * - loads sessions for range (fetchData)
 * - uses presenceMap (socket) for live presence & lastSeen priority
 * - refreshSessionsOnly() runs every 20s to fetch session updates only
 * - when presenceMap updates, we merge live presence & lastSeen into rows
 */
export default function EodReport() {
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("today");
  const [customRange, setCustomRange] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, working: 0 });
  const [chartData, setChartData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const { presenceMap } = useContext(PresenceContext);
  const screens = useBreakpoint(); // For responsive design

  // keep last fetched sessions raw map for efficient diff/merge
  const sessionsMapRef = useRef({});

  // Helper: build date range (ISO strings)
  const buildRange = () => {
    const today = dayjs();
    let startDate, endDate;
    if (filterType === "today") {
      startDate = today.startOf("day").toISOString();
      endDate = today.endOf("day").toISOString();
    } else if (filterType === "week") {
      startDate = today.startOf("week").toISOString();
      endDate = today.endOf("week").toISOString();
    } else if (filterType === "month") {
      startDate = today.startOf("month").toISOString();
      endDate = today.endOf("month").toISOString();
    } else if (filterType === "custom" && customRange.length === 2) {
      startDate = customRange[0].startOf("day").toISOString();
      endDate = customRange[1].endOf("day").toISOString();
    }
    return { startDate, endDate };
  };

  // Load users + sessions (initial and manual fetch)
  const fetchData = async () => {
    setLoading(true);
    try {
      if (users.length === 0) {
        const uRes = await axios.get("/api/users");
        setUsers(uRes.data || []);
      }

      const { startDate, endDate } = buildRange();
      const sessionRes = await axios.get(`/api/work-sessions/range?start=${startDate}&end=${endDate}`);
      const rangeSessions = sessionRes.data?.history?.flatMap(d => d.sessions) || [];

      const map = {};
      (rangeSessions || []).forEach(s => {
        map[s._id] = s;
      });
      sessionsMapRef.current = map;

      const tableData = (users.length ? users : (await axios.get("/api/users")).data || []).flatMap(user => {
        const live = presenceMap[user._id];

        const lastSeen = live?.lastActiveAt ? new Date(live.lastActiveAt) : (user.lastActiveAt ? new Date(user.lastActiveAt) : null);
        const presence = live?.presence || user.presence || "offline";

        const uSessions = rangeSessions.filter(s => String(s.userId) === String(user._id));
        if (uSessions.length === 0) {
          return {
            key: `no-${user._id}`,
            sessionId: null,
            userId: user._id,
            name: user.name,
            email: user.email,
            team: user.team?.name || '-',
            department: user.department?.name || '-',
            presence,
            lastSeen,
            date: "-",
            loginTimeFormatted: "-",
            logoutTimeFormatted: "-",
            workedHours: "0h",
            eod: "",
            status: "No Session",
            accountIds: [],
            serviceIds: []
          };
        }
        return uSessions.map(s => ({
          key: s._id,
          sessionId: s._id,
          userId: user._id,
          name: user.name,
          email: user.email,
          team: user.team?.name || '-',
          department: user.department?.name || '-',
          presence,
          lastSeen,
          date: s.loginTime ? dayjs(s.loginTime).format("DD-MM-YYYY") : "-",
          loginTimeFormatted: s.loginTime ? dayjs(s.loginTime).format("hh:mm A") : "-",
          logoutTimeFormatted: s.logoutTime ? dayjs(s.logoutTime).format("hh:mm A") : "-",
          workedHours: s.totalHours ? `${Math.floor(s.totalHours)}h ${Math.floor((s.totalHours * 60) % 60)}m` : "0h",
          eod: s.eod || "",
          status: !s.logoutTime ? "Working" : s.eod ? "Completed" : "EOD Pending",
          accountIds: s.accountIds || [],
          serviceIds: s.serviceIds || []
        }));
      });

      setSessions(tableData);

      setStats({
        total: tableData.length,
        completed: tableData.filter(s => s.status === "Completed").length,
        pending: tableData.filter(s => s.status === "EOD Pending").length,
        working: tableData.filter(s => s.status === "Working").length
      });

      const grouped = {};
      (rangeSessions || []).forEach(s => {
        const d = dayjs(s.loginTime).format("DD-MM-YYYY");
        if (!grouped[d]) grouped[d] = { date: d, completed: 0, pending: 0 };
        if (s.eod && s.logoutTime) grouped[d].completed++;
        else grouped[d].pending++;
      });
      setChartData(Object.values(grouped));
    } catch (err) {
      toast.error("Failed to load report");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh sessions only (runs every 20s)
  const refreshSessionsOnly = async () => {
    try {
      const { startDate, endDate } = buildRange();
      const sessionRes = await axios.get(`/api/work-sessions/range?start=${startDate}&end=${endDate}`);
      const newSessionsList = sessionRes.data?.history?.flatMap(d => d.sessions) || [];
      const newMap = {};
      newSessionsList.forEach(s => (newMap[s._id] = s));

      sessionsMapRef.current = newMap;

      setSessions(prevRows => prevRows.map(row => {
        if (!row.sessionId) return row;
        const updated = newMap[row.sessionId];
        if (!updated) return row;
        return {
          ...row,
          loginTimeFormatted: updated.loginTime ? dayjs(updated.loginTime).format("hh:mm A") : "-",
          logoutTimeFormatted: updated.logoutTime ? dayjs(updated.logoutTime).format("hh:mm A") : "-",
          workedHours: updated.totalHours ? `${Math.floor(updated.totalHours)}h ${Math.floor((updated.totalHours * 60) % 60)}m` : "0h",
          eod: updated.eod || "",
          status: !updated.logoutTime ? "Working" : updated.eod ? "Completed" : "EOD Pending"
        };
      }));

      setStats(prev => {
        const allRows = Object.values(newMap).map(s => {
          return !s.logoutTime ? "Working" : s.eod ? "Completed" : "EOD Pending";
        });
        const completed = allRows.filter(x => x === "Completed").length;
        const working = allRows.filter(x => x === "Working").length;
        const pending = allRows.filter(x => x === "EOD Pending").length;
        return { total: sessions.length || 0, completed, pending, working };
      });
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType]);

  useEffect(() => {
    if (!Object.keys(presenceMap || {}).length) return;
    setSessions(prev => prev.map(row => {
      const live = presenceMap[row.userId];
      const lastSeen = live?.lastActiveAt ? new Date(live.lastActiveAt) : row.lastSeen;
      const presence = live?.presence || row.presence || "offline";
      return { ...row, presence, lastSeen };
    }));
  }, [presenceMap]);

  useEffect(() => {
    const id = setInterval(() => {
      refreshSessionsOnly();
    }, 20000);
    return () => clearInterval(id);
  }, [filterType, customRange]);

  // Responsive columns for mobile view
  const getColumns = () => {
    const baseColumns = [
      { title: "Date", dataIndex: "date", key: "date" },
      { title: "Employee", dataIndex: "name", key: "name", render: t => <strong>{t}</strong> },
    ];

    const desktopColumns = [
      { title: "Email", dataIndex: "email", key: "email" },
      {
        title: "Presence",
        dataIndex: "presence",
        key: "presence",
        render: p => {
          const colors = { online: "green", busy: "red", away: "orange", in_meeting: "purple", offline: "gray" };
          return <Tag color={colors[p]}>{(p || "offline").toUpperCase()}</Tag>;
        }
      },
      {
        title: "Last Seen",
        dataIndex: "lastSeen",
        key: "lastSeen",
        render: (t, row) => row.presence === "online" ? <Tag color="green">Online now</Tag> : <span style={{fontSize:12}}>{formatLastSeen(t)}</span>
      },
      { title: "Login", dataIndex: "loginTimeFormatted", key: "loginTimeFormatted" },
      { title: "Logout", dataIndex: "logoutTimeFormatted", key: "logoutTimeFormatted" },
      { title: "Worked Hours", dataIndex: "workedHours", key: "workedHours" },
      {
        title: "EOD Message",
        dataIndex: "eod",
        key: "eod",
        render: text => text ? (
          <div style={{
            maxWidth: screens.xs ? '150px' : '250px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {text.length > 50 ? `${text.substring(0, 50)}...` : text}
          </div>
        ) : <Tag color="red">Pending</Tag>
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: s => {
          const colors = { Working: "blue", Completed: "green", "EOD Pending": "orange", "No Session": "gray" };
          return <Tag color={colors[s]}>{s}</Tag>;
        }
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, r) => r.status !== "No Session" ? 
          <Button type="link" size={screens.xs ? "small" : "middle"} onClick={() => { setSelectedSession(r); setModalVisible(true); }}>
            View EOD
          </Button> : null
      }
    ];

    // For mobile, show fewer columns
    if (screens.xs) {
      return [
        ...baseColumns,
        { title: "Status", dataIndex: "status", key: "status", render: s => {
          const colors = { Working: "blue", Completed: "green", "EOD Pending": "orange", "No Session": "gray" };
          return <Tag color={colors[s]}>{s}</Tag>;
        }},
        { title: "Actions", key: "actions", render: (_, r) => r.status !== "No Session" ? 
          <Button type="link" size="small" onClick={() => { setSelectedSession(r); setModalVisible(true); }}>
            View
          </Button> : null }
      ];
    }

    return [...baseColumns, ...desktopColumns];
  };

  return (
    <div style={{ padding: screens.xs ? 8 : 14 }}>
      <Toaster position="top-right" />
      <Title level={screens.xs ? 3 : 2}>Employee EOD Report</Title>

      {/* Responsive filter section */}
      <div style={{ marginBottom: 24, flexWrap: 'wrap', display: 'flex', gap: 8 }}>
        <Select value={filterType} onChange={setFilterType} style={{ width: screens.xs ? '100%' : 150 }}>
          <Option value="today">Today</Option>
          <Option value="week">This Week</Option>
          <Option value="month">This Month</Option>
          <Option value="custom">Custom Range</Option>
        </Select>

        {filterType === "custom" && (
          <RangePicker 
            onChange={setCustomRange} 
            style={{ width: screens.xs ? '100%' : 'auto' }}
            size={screens.xs ? "small" : "middle"}
          />
        )}

        <Button 
          type="primary" 
          onClick={fetchData} 
          disabled={filterType === "custom" && customRange.length !== 2} 
          loading={loading}
          size={screens.xs ? "small" : "middle"}
          style={{ width: screens.xs ? '100%' : 'auto' }}
        >
          Fetch Data
        </Button>
      </div>

      {/* Summary Cards - Responsive */}
      <Row gutter={[screens.xs ? 8 : 16, screens.xs ? 8 : 16]}>
        <Col xs={12} sm={12} md={6}>
          <Card size={screens.xs ? "small" : "default"}>
            <Title level={screens.xs ? 5 : 4}>Total Records</Title>
            <Text strong style={{ fontSize: screens.xs ? 20 : 24 }}>{stats.total}</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size={screens.xs ? "small" : "default"}>
            <Title level={screens.xs ? 5 : 4} style={{color:"green"}}>Completed</Title>
            <Text strong style={{ fontSize: screens.xs ? 20 : 24 }}>{stats.completed}</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size={screens.xs ? "small" : "default"}>
            <Title level={screens.xs ? 5 : 4} style={{color:"orange"}}>EOD Pending</Title>
            <Text strong style={{ fontSize: screens.xs ? 20 : 24 }}>{stats.pending}</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size={screens.xs ? "small" : "default"}>
            <Title level={screens.xs ? 5 : 4} style={{color:"blue"}}>Working</Title>
            <Text strong style={{ fontSize: screens.xs ? 20 : 24 }}>{stats.working}</Text>
          </Card>
        </Col>
      </Row>

      {/* Chart - Responsive */}
      <Card style={{ marginTop: 24 }} title="EOD Completion Trend" size={screens.xs ? "small" : "default"}>
        {loading ? (
          <div style={{textAlign:"center", padding: screens.xs ? 20 : 50}}>
            <Spin size={screens.xs ? "default" : "large"}/>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={screens.xs ? 250 : 300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: screens.xs ? 10 : 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: screens.xs ? 10 : 12 }} />
              <Tooltip />
              <Bar dataKey="completed" name="Completed" fill="#52c41a" />
              <Bar dataKey="pending" name="Pending" fill="#faad14" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Text type="secondary">No Data Available</Text>
        )}
      </Card>

      {/* Table - Responsive Card with improved mobile view */}
      <Card 
        style={{ marginTop: 24, overflowX: 'auto' }} 
        title="EOD Details"
        size={screens.xs ? "small" : "default"}
      >
        <Table 
          columns={getColumns()} 
          dataSource={sessions} 
          loading={loading} 
          pag={{ 
            pageSize: screens.xs ? 5 : 10, 
            showSizeChanger: !screens.xs, 
            showTotal: (total) => screens.xs ? `Total ${total}` : `Total ${total} records`,
            size: screens.xs ? "small" : "middle"
          }} 
          bordered={!screens.xs}
          scroll={{ x: screens.xs ? 500 : 1300 }}
          rowKey="key"
          size={screens.xs ? "small" : "middle"}
        />
      </Card>

      {/* Modal - Responsive with improved pre tag for mobile */}
      <Modal 
        title={`EOD Details - ${selectedSession?.name}`} 
        open={modalVisible} 
        onCancel={() => setModalVisible(false)} 
        footer={<Button onClick={() => setModalVisible(false)}>Close</Button>} 
        width={screens.xs ? '95%' : 700}
        style={{ top: screens.xs ? 20 : 100 }}
      >
        {selectedSession && (
          <div style={{ fontSize: screens.xs ? 14 : 16 }}>
            <p><strong>Date:</strong> {selectedSession.date}</p>
            <p><strong>Login:</strong> {selectedSession.loginTimeFormatted}</p>
            <p><strong>Logout:</strong> {selectedSession.logoutTimeFormatted}</p>
            <p><strong>Worked Hours:</strong> {selectedSession.workedHours}</p>
            
            <p><strong>EOD Message:</strong></p>
            {/* Improved pre tag for mobile - scrollable and responsive */}
            <pre style={{ 
              background: "#f5f5f5", 
              whiteSpace: screens.xs ? "pre-wrap" : "pre-wrap",
              wordWrap: "break-word",
              padding: screens.xs ? 8 : 10, 
              borderRadius: 4,
              maxHeight: screens.xs ? 200 : 300,
              overflowY: "auto",
              fontSize: screens.xs ? 12 : 14,
              fontFamily: "monospace",
              margin: 0
            }}>
              {selectedSession.eod || "No EOD submitted"}
            </pre>

            <p style={{ marginTop: 16 }}><strong>Accounts:</strong></p>
            <List 
              size="small" 
              bordered 
              dataSource={selectedSession.accountIds} 
              renderItem={item => (
                <List.Item style={{ fontSize: screens.xs ? 12 : 14 }}>
                  {item.businessName || item.name || item || "N/A"}
                </List.Item>
              )}
              locale={{ emptyText: "No accounts assigned" }}
            />

            <p style={{ marginTop: 16 }}><strong>Services:</strong></p>
            <List 
              size="small" 
              bordered 
              dataSource={selectedSession.serviceIds} 
              renderItem={item => (
                <List.Item style={{ fontSize: screens.xs ? 12 : 14 }}>
                  {item.serviceName || item.name || item || "N/A"} ({item.category || "-"})
                </List.Item>
              )}
              locale={{ emptyText: "No services assigned" }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}