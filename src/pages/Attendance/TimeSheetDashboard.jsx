import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Button,
  Typography,
  Modal,
  Form,
  Input,
  Row,
  Col,
  Select,
  DatePicker,
  Popconfirm,
  Space,
  Card,
  Grid,
  Alert,
  Badge,
  Timeline,
  Avatar,
  Tooltip,
  Empty,
  Tag,
  Divider,
  Calendar as AntCalendar,
} from "antd";
import {
  StopOutlined,
  BellOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  GiftOutlined,
  StarOutlined,
  FireOutlined,
} from "@ant-design/icons";
import axios from "../../api/axios";
import dayjs from "dayjs";
import toast, { Toaster } from "react-hot-toast";
import "./TimeSheetDashboard.css";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

// Import PartyPopperOutlined separately if needed, or use an alternative
// Since PartyPopperOutlined might not exist, use these alternatives:
const PartyPopperOutlined = () => <span>🎉</span>; // Fallback emoji
// Or use: import { PartyPopperOutlined } from "@ant-design/icons"; // Only if available

export default function TimeSheetDashboard() {
  const screens = useBreakpoint();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEodModalVisible, setIsEodModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [form] = Form.useForm();
  const [timers, setTimers] = useState({});
  const [runningSessions, setRunningSessions] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [services, setServices] = useState([]);
  const [isEodViewModalVisible, setIsEodViewModalVisible] = useState(false);
  const [viewSession, setViewSession] = useState(null);

  // Notice Board States
  const [notices, setNotices] = useState([]);
  const [isNoticeModalVisible, setIsNoticeModalVisible] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [noticeForm] = Form.useForm();
  const [noticeLoading, setNoticeLoading] = useState(false);

  // Holiday States
  const [holidays, setHolidays] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(dayjs().month() + 1);
  const [currentYear, setCurrentYear] = useState(dayjs().year());

  // Birthday States
  const [birthdays, setBirthdays] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [showBirthdayAlert, setShowBirthdayAlert] = useState(false);

  const [excludeSundays, setExcludeSundays] = useState(false);
  const [dateFilterPreset, setDateFilterPreset] = useState('today');
  const [tableFilters, setTableFilters] = useState({});

  const [stats, setStats] = useState({
    totalSessions: 0,
    sessionsStopped: 0,
    totalWorkedHours: 0,
    uniqueWorkingDays: 0,
  });

  const [dateRange, setDateRange] = useState([dayjs().startOf("day"), dayjs().endOf("day")]);

  const currentUser = JSON.parse(localStorage.getItem("user")) || {
    _id: "temp_id_123",
    name: "Guest User",
    role: "Employee",
    email: "guest@example.com",
  };

  const isAdmin = ["Superadmin", "Admin"].includes(currentUser.role);

  // --- Fetch Holidays ---
  const fetchHolidays = async () => {
    try {
      const response = await axios.get("/api/public-holidays", {
        params: {
          year: currentYear,
          month: getMonthName(currentMonth),
        },
      });
      setHolidays(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch holidays:", err);
    }
  };

  // --- Fetch Birthdays ---
  const fetchBirthdays = async () => {
    try {
      // Fetch today's birthdays
      const todayRes = await axios.get("/api/users/birthdays/today");
      if (todayRes.data.success && todayRes.data.users.length > 0) {
        setBirthdays(todayRes.data.users);
        setShowBirthdayAlert(true);
        // Auto-hide birthday alert after 10 seconds
        setTimeout(() => setShowBirthdayAlert(false), 10000);
      } else {
        setBirthdays([]);
      }
      
      // Fetch upcoming birthdays (next 7 days)
      const upcomingRes = await axios.get("/api/users/birthdays/upcoming?days=7");
      if (upcomingRes.data.success && upcomingRes.data.users.length > 0) {
        setUpcomingBirthdays(upcomingRes.data.users);
      } else {
        setUpcomingBirthdays([]);
      }
    } catch (err) {
      console.error("Failed to fetch birthdays:", err);
    }
  };

  // Get month name
  const getMonthName = (month) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[month - 1];
  };

  // Get upcoming holidays
  const getUpcomingHolidays = () => {
    const today = dayjs();
    const upcoming = holidays
      .filter(h => h.date >= today.format("YYYY-MM-DD") && h.status !== "Rejected")
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
    return upcoming;
  };

  // Get holidays by month
  const getHolidaysByMonth = (month) => {
    return holidays.filter(h => {
      const holidayMonth = dayjs(h.date).month() + 1;
      return holidayMonth === month;
    });
  };

  // Format holiday display
  const formatHolidayDisplay = (holiday) => {
    const date = dayjs(holiday.date);
    const today = dayjs();
    const isToday = date.isSame(today, "day");
    const isUpcoming = date.isAfter(today, "day") && date.diff(today, "day") <= 7;
    
    return {
      ...holiday,
      displayDate: date.format("DD MMM YYYY"),
      dayName: date.format("dddd"),
      isToday,
      isUpcoming,
      daysLeft: date.diff(today, "day"),
    };
  };

  // --- Notice Board Functions ---

  // Fetch all notices
  const fetchNotices = async () => {
    try {
      const response = await axios.get("/api/notices");
      setNotices(response.data || []);
    } catch (err) {
      console.error("Failed to fetch notices:", err);
    }
  };

  // Create/Update Notice
  const handleSaveNotice = async (values) => {
    setNoticeLoading(true);
    try {
      if (editingNotice) {
        await axios.put(`/api/notices/${editingNotice._id}`, {
          ...values,
          updatedBy: currentUser._id,
        });
        toast.success("Notice updated successfully!");
      } else {
        await axios.post("/api/notices", {
          ...values,
          createdBy: currentUser._id,
        });
        toast.success("Notice added successfully!");
      }
      fetchNotices();
      setIsNoticeModalVisible(false);
      noticeForm.resetFields();
      setEditingNotice(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save notice");
    } finally {
      setNoticeLoading(false);
    }
  };

  // Delete Notice
  const handleDeleteNotice = async (noticeId) => {
    try {
      await axios.delete(`/api/notices/${noticeId}`);
      toast.success("Notice deleted successfully!");
      fetchNotices();
    } catch (err) {
      toast.error("Failed to delete notice");
    }
  };

  // Get notice priority color
  const getNoticePriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#ff4d4f";
      case "medium":
        return "#faad14";
      case "low":
        return "#52c41a";
      default:
        return "#1890ff";
    }
  };

  // Get notice priority icon
  const getNoticePriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "📢";
    }
  };

  // --- Utility Functions ---

  const formatTime = (sec) => {
    const h = Math.floor(Math.abs(sec) / 3600);
    const m = Math.floor((Math.abs(sec) % 3600) / 60);
    const s = Math.floor(Math.abs(sec) % 60);
    const prefix = sec < 0 ? "+" : "";
    return `${prefix}${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatWorkedTime = (totalHours) => {
    if (totalHours === null || totalHours === undefined) return "";
    const totalSec = Math.floor(totalHours * 3600);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const getDateRangeByPreset = (preset) => {
    const today = dayjs();
    switch (preset) {
      case 'today':
        return [today.startOf('day'), today.endOf('day')];
      case 'thisWeek':
        return [today.startOf('week'), today.endOf('week')];
      case 'thisMonth':
        return [today.startOf('month'), today.endOf('month')];
      case 'custom':
      default:
        return dateRange;
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2 && dayjs.isDayjs(dates[0]) && dayjs.isDayjs(dates[1])) {
      setDateRange(dates);
      setDateFilterPreset('custom');
    } else {
      const todayRange = getDateRangeByPreset('today');
      setDateRange(todayRange);
      setDateFilterPreset('today');
    }
  };

  const handlePresetChange = (preset) => {
    setDateFilterPreset(preset);
    if (preset !== 'custom') {
      const newRange = getDateRangeByPreset(preset);
      setDateRange(newRange);
    }
  };

  const calculateStats = (data) => {
    const totalHours = data.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const totalSessions = data.length;
    const sessionsStopped = data.filter(s => s.logoutTime).length;

    const uniqueDates = new Set(data.map(s => s.dateLabel));
    const uniqueWorkingDays = uniqueDates.size;

    setStats({
      totalSessions,
      sessionsStopped,
      totalWorkedHours: totalHours,
      uniqueWorkingDays,
    });
  };

  // --- Data Fetching ---
  const fetchAccountsAndServices = async () => {
    try {
      const [accRes, svcRes] = await Promise.all([
        axios.get("/api/accounts"),
        axios.get("/api/service"),
      ]);
      setAccounts(accRes.data || []);
      setServices(svcRes.data || []);
    } catch (err) {
      toast.error("Failed to fetch accounts or services");
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      let start, end;

      if (dateRange && dateRange.length === 2 && dayjs.isDayjs(dateRange[0]) && dayjs.isDayjs(dateRange[1])) {
        start = dateRange[0].startOf("day").toISOString();
        end = dateRange[1].endOf("day").toISOString();
      } else {
        start = dayjs().startOf("day").toISOString();
        end = dayjs().endOf("day").toISOString();
      }

      const params = { start, end };
      if (!isAdmin) params.userId = currentUser._id;

      const res = await axios.get("/api/work-sessions/range", { params });

      const grouped = res.data.history || [];
      const flatSessions = [];

      grouped.forEach((group) => {
        group.sessions.forEach((s) => {
          if (isAdmin || s.userId === currentUser._id) {
            const sessionAccounts = s.accountIds?.map(id => accounts.find(a => a._id === id))?.filter(Boolean) || [];
            const sessionServices = s.serviceIds?.map(id => services.find(s => s._id === id))?.filter(Boolean) || [];

            flatSessions.push({
              ...s,
              key: s._id,
              dateLabel: group.date,
              loginTimeFormatted: dayjs(s.loginTime).format("hh:mm:ss A"),
              logoutTimeFormatted: s.logoutTime
                ? dayjs(s.logoutTime).format("hh:mm:ss A")
                : "",
              accountIds: sessionAccounts,
              serviceIds: sessionServices,
            });
          }
        });
      });

      setSessions(flatSessions);

      const initTimers = {};
      const initRunning = {};
      flatSessions.forEach((s) => {
        const totalWorkedSec = s.totalHours ? Math.floor(s.totalHours * 3600) : 0;
        initTimers[s.key] = s.logoutTime
          ? totalWorkedSec
          : Math.floor(8 * 3600 - (Date.now() - new Date(s.loginTime).getTime()) / 1000);
        initRunning[s.key] = !s.logoutTime;
      });
      setTimers(initTimers);
      setRunningSessions(initRunning);

    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  // --- Effects ---

  useEffect(() => {
    fetchAccountsAndServices();
    fetchNotices();
    fetchHolidays();
    fetchBirthdays();
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [currentMonth, currentYear]);

  // Refresh birthdays every hour
  useEffect(() => {
    const interval = setInterval(fetchBirthdays, 3600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (dateRange && dateRange.length === 2) {
      fetchSessions();
    }
  }, [dateRange, accounts.length, services.length]);

  // Timer interval
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = {};
        Object.keys(prev).forEach((key) => {
          updated[key] = runningSessions[key] ? prev[key] - 1 : prev[key];
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [runningSessions]);

  // --- Combined Local Filtering Logic ---

  const filteredSessions = useMemo(() => {
    let result = sessions;

    if (excludeSundays) {
      result = result.filter(session => dayjs(session.loginTime).day() !== 0);
    }

    const selectedNames = tableFilters.name;
    if (selectedNames && selectedNames.length > 0) {
      result = result.filter(session => selectedNames.includes(session.name));
    }

    return result;
  }, [sessions, excludeSundays, tableFilters]);

  useEffect(() => {
    calculateStats(filteredSessions);
  }, [filteredSessions]);

  const handleTableChange = (pagination, filters, sorter) => {
    setTableFilters(filters);
  };

  // --- Action Handlers ---
  const handleStartWork = async () => {
    const hasRunningSession = Object.values(runningSessions).some(isRunning => isRunning);
    if (hasRunningSession) {
      toast.error("A work session is already running.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/work-sessions/start", {
        userId: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
      });
      const s = res.data.session;
      const newSession = {
        key: s._id,
        ...s,
        loginTimeFormatted: dayjs(s.loginTime).format("hh:mm:ss A"),
        logoutTimeFormatted: "",
        dateLabel: dayjs(s.loginTime).format("DD-MM-YYYY"),
        accountIds: [],
        serviceIds: [],
      };
      setSessions((prev) => [newSession, ...prev]);
      setTimers((prev) => ({
        ...prev,
        [s._id]: Math.floor(8 * 3600 - (Date.now() - new Date(s.loginTime).getTime()) / 1000)
      }));
      setRunningSessions((prev) => ({ ...prev, [s._id]: true }));
      toast.success("Work started successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start work");
    } finally {
      setLoading(false);
    }
  };

  const handleStopWork = async (sessionId) => {
    setLoading(true);
    try {
      const res = await axios.post("/api/work-sessions/stop", { sessionId });
      const s = res.data.session;

      setSessions((prev) =>
        prev.map((sess) =>
          sess.key === sessionId
            ? {
              ...sess,
              logoutTimeFormatted: dayjs(s.logoutTime).format("hh:mm:ss A"),
              totalHours: s.totalHours,
            }
            : sess
        )
      );
      setRunningSessions((prev) => ({ ...prev, [sessionId]: false }));
      setTimers((prev) => ({ ...prev, [sessionId]: Math.floor(s.totalHours * 3600) }));
      toast.success("Work stopped successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to stop work");
    } finally {
      setLoading(false);
    }
  };

  const handleEodSubmit = async (values) => {
    try {
      await axios.post("/api/work-sessions/eod", {
        sessionId: selectedSession.key,
        eod: values.eod,
        accountIds: values.accountIds,
        serviceIds: values.serviceIds,
        date: values.date ? values.date.toISOString() : null,
      });

      const updatedAccountIds = values.accountIds?.map(id => accounts.find(a => a._id === id))?.filter(Boolean) || [];
      const updatedServiceIds = values.serviceIds?.map(id => services.find(s => s._id === id))?.filter(Boolean) || [];

      setSessions((prev) =>
        prev.map((s) =>
          s.key === selectedSession.key
            ? {
              ...s,
              eod: values.eod,
              accountIds: updatedAccountIds,
              serviceIds: updatedServiceIds,
              date: values.date ? values.date.toISOString() : s.date,
            }
            : s
        )
      );
      setIsEodModalVisible(false);
      form.resetFields();
      toast.success("EOD saved!");
    } catch (err) {
      toast.error("Failed to save EOD");
    }
  };

  const handleViewEod = (session) => {
    setViewSession(session);
    setIsEodViewModalVisible(true);
  };

  const exportToCSV = () => {
    if (filteredSessions.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const headers = [
      "S.No.", "Date", "Name", "Login Time", "Logout Time", "Worked Hours", "EOD Message", "Accounts", "Services"
    ];

    const csvRows = filteredSessions.map((s, index) => {
      const accountsList = s.accountIds?.map(acc => acc.businessName).join(" | ") || "";
      const servicesList = s.serviceIds?.map(svc => svc.serviceName || svc.name).join(" | ") || "";

      return [
        index + 1,
        `"${s.dateLabel}"`,
        `"${s.name}"`,
        `"${s.loginTimeFormatted}"`,
        `"${s.logoutTimeFormatted}"`,
        `"${formatWorkedTime(s.totalHours)}"`,
        `"${(s.eod || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${accountsList}"`,
        `"${servicesList}"`,
      ].join(",");
    });

    const csvContent = [
      headers.join(","),
      ...csvRows
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `timesheet_report_${dayjs().format("YYYYMMDD_HHmmss")}.csv`);
    link.click();

    toast.success("Report downloaded successfully!");
  };

  // --- Render Holiday Board Component ---
  const renderHolidayBoard = () => {
    const monthHolidays = getHolidaysByMonth(currentMonth);
    const upcomingHolidays = getUpcomingHolidays();
    const formattedHolidays = monthHolidays.map(formatHolidayDisplay);
    
    // Combine holidays and birthdays for timeline
    const allUpcomingEvents = [
      ...upcomingHolidays.map(h => ({ ...h, type: 'holiday', eventType: 'holiday' })),
      ...upcomingBirthdays.map(b => ({ 
        ...b, 
        type: 'birthday', 
        eventType: 'birthday',
        name: `${b.name}'s Birthday`,
        date: b.birthdayDate,
        daysLeft: b.daysUntil
      }))
    ].sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0));

    if (monthHolidays.length === 0 && upcomingHolidays.length === 0 && upcomingBirthdays.length === 0 && birthdays.length === 0) {
      return null;
    }

    return (
      <Card 
        className="holiday-board"
        style={{ 
          marginBottom: 20, 
          borderRadius: 12,
          background: "linear-gradient(135deg, #122e44 0%, #122e44 100%)",
          border: "none"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <Space>
            <GiftOutlined style={{ fontSize: 24, color: "#fff" }} />
            <Title level={4} style={{ margin: 0, color: "#fff" }}>
              🎉 Events & Celebrations - {getMonthName(currentMonth)} {currentYear}
            </Title>
          </Space>
          <Space>
            <Button 
              size="small"
              onClick={() => {
                let newMonth = currentMonth - 1;
                let newYear = currentYear;
                if (newMonth < 1) {
                  newMonth = 12;
                  newYear--;
                }
                setCurrentMonth(newMonth);
                setCurrentYear(newYear);
              }}
              style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", border: "none" }}
            >
              ◀ Previous
            </Button>
            <Button 
              size="small"
              onClick={() => {
                let newMonth = currentMonth + 1;
                let newYear = currentYear;
                if (newMonth > 12) {
                  newMonth = 1;
                  newYear++;
                }
                setCurrentMonth(newMonth);
                setCurrentYear(newYear);
              }}
              style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", border: "none" }}
            >
              Next ▶
            </Button>
            <Button 
              size="small"
              onClick={() => {
                setCurrentMonth(dayjs().month() + 1);
                setCurrentYear(dayjs().year());
              }}
              style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", border: "none" }}
            >
              Today
            </Button>
          </Space>
        </div>

        {/* Birthday Alert Banner */}
        {birthdays.length > 0 && showBirthdayAlert && (
          <Alert
            message={
              <Space>
                <span style={{ fontSize: 20 }}>🎉</span>
                <span style={{ fontWeight: "bold" }}>🎂 Happy Birthday! 🎂</span>
              </Space>
            }
            description={
              <div>
                {birthdays.map(b => (
                  <div key={b._id}>
                    🎉 Wishing <strong>{b.name}</strong> a fantastic birthday! 
                    {b.age && <span> Turning {b.age} years old!</span>}
                  </div>
                ))}
              </div>
            }
            type="success"
            showIcon
            closable
            onClose={() => setShowBirthdayAlert(false)}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        <Row gutter={[16, 16]}>
          {/* Upcoming Events Section */}
          {(upcomingHolidays.length > 0 || upcomingBirthdays.length > 0) && (
            <Col xs={24} md={8}>
              <Card 
                size="small" 
                title={
                  <Space>
                    <StarOutlined style={{ color: "#ffd700" }} />
                    <Text strong>Upcoming Events</Text>
                    <Badge count={allUpcomingEvents.length} style={{ backgroundColor: "#ff4d4f" }} />
                  </Space>
                }
                style={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 8 }}
              >
                <Timeline
                  items={allUpcomingEvents.map((event) => {
                    const isBirthday = event.eventType === 'birthday';
                    return {
                      color: isBirthday ? "pink" : (event.isToday ? "green" : "blue"),
                      dot: isBirthday ? <GiftOutlined /> : (event.isToday ? <GiftOutlined /> : <CalendarOutlined />),
                      children: (
                        <div>
                          <Space>
                            {isBirthday ? (
                              <Tag color="pink" icon={<GiftOutlined />}>Birthday</Tag>
                            ) : (
                              <Tag color={event.type === "National" ? "blue" : "green"}>
                                {event.type || "Holiday"}
                              </Tag>
                            )}
                            <Text strong>{event.name}</Text>
                          </Space>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {event.displayDate || dayjs(event.date).format("DD MMM YYYY")}
                          </Text>
                          {event.daysLeft === 0 && (
                            <Tag color="green" style={{ marginLeft: 8 }}>Today!</Tag>
                          )}
                          {event.daysLeft > 0 && event.daysLeft <= 7 && (
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                              • in {event.daysLeft} day{event.daysLeft !== 1 ? 's' : ''}
                            </Text>
                          )}
                          {isBirthday && event.turningAge && (
                            <div>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Turning {event.turningAge} years old
                              </Text>
                            </div>
                          )}
                        </div>
                      ),
                    };
                  })}
                />
              </Card>
            </Col>
          )}

          {/* Month Events List */}
          <Col xs={24} md={(upcomingHolidays.length > 0 || upcomingBirthdays.length > 0) ? 16 : 24}>
            <Card 
              size="small" 
              title={
                <Space>
                  <CalendarOutlined />
                  <Text strong>Events in {getMonthName(currentMonth)} {currentYear}</Text>
                  <Badge count={monthHolidays.length + (birthdays.filter(b => {
                    const bMonth = dayjs(b.dob).month() + 1;
                    return bMonth === currentMonth;
                  }).length)} style={{ backgroundColor: "#ff4d4f" }} />
                </Space>
              }
              style={{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 8 }}
            >
              {formattedHolidays.length === 0 && birthdays.filter(b => {
                const bMonth = dayjs(b.dob).month() + 1;
                return bMonth === currentMonth;
              }).length === 0 ? (
                <Empty 
                  description="No events this month" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: "20px 0" }}
                />
              ) : (
                <Row gutter={[12, 12]}>
                  {/* Holidays */}
                  {formattedHolidays.map((holiday, index) => (
                    <Col xs={24} sm={12} md={8} key={`holiday-${index}`}>
                      <Card 
                        size="small" 
                        style={{ 
                          backgroundColor: holiday.isToday ? "#f6ffed" : "#fafafa",
                          borderLeft: `3px solid ${holiday.type === "National" ? "#1890ff" : holiday.type === "Regional" ? "#52c41a" : "#fa8c16"}`
                        }}
                      >
                        <Space direction="vertical" size={4}>
                          <Space>
                            <CalendarOutlined />
                            <Text strong>{holiday.name}</Text>
                            {holiday.isToday && <Tag color="green">Today</Tag>}
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {holiday.displayDate} • {holiday.dayName}
                          </Text>
                          <Tag color={
                            holiday.type === "National" ? "blue" : 
                            holiday.type === "Regional" ? "green" : "orange"
                          }>
                            {holiday.type}
                          </Tag>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                  
                  {/* Birthdays in this month */}
                  {birthdays.filter(b => {
                    const bMonth = dayjs(b.dob).month() + 1;
                    return bMonth === currentMonth;
                  }).map((birthday, index) => {
                    const birthDate = dayjs(birthday.dob);
                    const isToday = birthDate.date() === dayjs().date() && 
                                   birthDate.month() === dayjs().month();
                    return (
                      <Col xs={24} sm={12} md={8} key={`birthday-${index}`}>
                        <Card 
                          size="small" 
                          style={{ 
                            backgroundColor: isToday ? "#fff7e6" : "#fafafa",
                            borderLeft: "3px solid #ff69b4"
                          }}
                        >
                          <Space direction="vertical" size={4}>
                            <Space>
                              <GiftOutlined style={{ color: "#ff69b4" }} />
                              <Text strong>{birthday.name}'s Birthday</Text>
                              {isToday && <Tag color="gold">Today!</Tag>}
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {birthDate.format("DD MMM")} • {birthDate.format("dddd")}
                            </Text>
                            <Tag color="pink">
                              🎂 Age: {birthday.age}
                            </Tag>
                          </Space>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </Card>
          </Col>
        </Row>
      </Card>
    );
  };

  // --- Render Birthday Corner Component ---
  const renderBirthdayCorner = () => {
    const currentMonthBirthdays = birthdays.filter(b => {
      const bMonth = dayjs(b.dob).month() + 1;
      return bMonth === currentMonth;
    });

    if (currentMonthBirthdays.length === 0 && upcomingBirthdays.length === 0) {
      return null;
    }

    return (
      <Card 
        style={{ 
          marginBottom: 20, 
          borderRadius: 12,
          background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)"
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <GiftOutlined style={{ fontSize: 24, color: "#ff4d4f" }} />
            <Title level={4} style={{ margin: 0 }}>
              🎈 Birthday Corner
            </Title>
          </Space>
          
          {birthdays.length > 0 && (
            <Alert
              message="Birthday Today!"
              description={
                <Space direction="vertical">
                  {birthdays.map(b => (
                    <div key={b._id}>
                      🎉 <strong>{b.name}</strong> is celebrating birthday today!
                      {b.age && <span> Turning {b.age} years old! 🎂</span>}
                    </div>
                  ))}
                </Space>
              }
              type="success"
              showIcon
              icon={<GiftOutlined />}
              style={{ marginBottom: 12 }}
            />
          )}
          
          {upcomingBirthdays.length > 0 && (
            <div>
              <Text strong>Upcoming Birthdays (Next 7 days):</Text>
              <div style={{ marginTop: 8 }}>
                {upcomingBirthdays.map(b => (
                  <Tag 
                    key={b._id} 
                    color="pink" 
                    icon={<GiftOutlined />}
                    style={{ marginBottom: 4, padding: '4px 12px' }}
                  >
                    {b.name} - {b.daysUntil === 0 ? 'Today!' : `in ${b.daysUntil} days`}
                    {b.turningAge && ` (Turning ${b.turningAge})`}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </Space>
      </Card>
    );
  };

  // --- Render Notice Board Component ---
  const renderNoticeBoard = () => {
    const activeNotices = notices.filter(n => n.isActive !== false);
    
    // Create birthday notice if there are birthdays today
    const birthdayNotice = birthdays.length > 0 ? {
      _id: 'birthday-special',
      title: '🎂 Birthday Celebrations! 🎂',
      content: birthdays.map(b => `🎉 Happy Birthday to ${b.name}! ${b.age ? `Turning ${b.age} years old. ` : ''}Wishing you a wonderful day! 🎂`).join('\n'),
      priority: 'high',
      createdAt: new Date(),
      isBirthdayNotice: true
    } : null;

    // Create holiday notice if there are holidays today
    const todayHolidays = holidays.filter(h => {
      const holidayDate = dayjs(h.date);
      const today = dayjs();
      return holidayDate.isSame(today, 'day') && h.status !== "Rejected";
    });
    
    const holidayNotice = todayHolidays.length > 0 ? {
      _id: 'holiday-special',
      title: '📅 Holiday Today!',
      content: todayHolidays.map(h => `🎉 ${h.name} - ${h.type || 'Public Holiday'}`).join('\n'),
      priority: 'high',
      createdAt: new Date(),
      isHolidayNotice: true
    } : null;

    const allNotices = [
      ...(birthdayNotice ? [birthdayNotice] : []),
      ...(holidayNotice ? [holidayNotice] : []),
      ...activeNotices
    ];

    if (allNotices.length === 0) {
      return null;
    }

    return (
      <Card 
        className="notice-board"
        style={{ 
          marginBottom: 20, 
          borderRadius: 12,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Space>
            <BellOutlined style={{ fontSize: 24, color: "#fff" }} />
            <Title level={4} style={{ margin: 0, color: "#fff" }}>
              Announcements & Notices
            </Title>
            <Badge count={allNotices.length} style={{ backgroundColor: "#ff4d4f" }} />
          </Space>
          {isAdmin && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingNotice(null);
                noticeForm.resetFields();
                setIsNoticeModalVisible(true);
              }}
              style={{ backgroundColor: "#fff", color: "#667eea", border: "none" }}
            >
              Add Notice
            </Button>
          )}
        </div>

        <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 8 }}>
          <Timeline
            items={allNotices.map((notice) => {
              const isBirthdayNotice = notice.isBirthdayNotice;
              const isHolidayNotice = notice.isHolidayNotice;
              
              return {
                dot: isBirthdayNotice ? (
                  <Avatar size="small" style={{ backgroundColor: "#ff69b4" }}>
                    <GiftOutlined />
                  </Avatar>
                ) : isHolidayNotice ? (
                  <Avatar size="small" style={{ backgroundColor: "#52c41a" }}>
                    <span>🎉</span>
                  </Avatar>
                ) : (
                  <Avatar 
                    size="small" 
                    style={{ 
                      backgroundColor: getNoticePriorityColor(notice.priority),
                      fontSize: 12
                    }}
                  >
                    {getNoticePriorityIcon(notice.priority)}
                  </Avatar>
                ),
                children: (
                  <Card 
                    size="small" 
                    style={{ 
                      marginBottom: 8, 
                      borderRadius: 8,
                      backgroundColor: "rgba(255,255,255,0.95)",
                      borderLeft: isBirthdayNotice ? '3px solid #ff69b4' : 
                                 isHolidayNotice ? '3px solid #52c41a' : 'none'
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Space direction="vertical" size={4} style={{ flex: 1 }}>
                        <Space>
                          {isBirthdayNotice && <GiftOutlined style={{ color: "#ff69b4" }} />}
                          {isHolidayNotice && <span>🎉</span>}
                          <Text strong style={{ fontSize: 14 }}>
                            {notice.title}
                          </Text>
                          {!isBirthdayNotice && !isHolidayNotice && (
                            <Tag color={getNoticePriorityColor(notice.priority)} style={{ fontSize: 10 }}>
                              {notice.priority?.toUpperCase() || "NORMAL"}
                            </Tag>
                          )}
                          {isBirthdayNotice && <Tag color="pink">Birthday Special</Tag>}
                          {isHolidayNotice && <Tag color="green">Holiday Alert</Tag>}
                        </Space>
                        <Paragraph 
                          style={{ margin: 0, fontSize: 13, color: "#666" }}
                          ellipsis={{ rows: 3, expandable: true, symbol: "more" }}
                        >
                          {notice.content}
                        </Paragraph>
                        <Space size="small" style={{ fontSize: 11, color: "#999" }}>
                          <ClockCircleOutlined />
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {isBirthdayNotice || isHolidayNotice ? 'Auto-generated' : `Posted: ${dayjs(notice.createdAt).format("DD MMM YYYY")}`}
                          </Text>
                          {notice.expiryDate && !isBirthdayNotice && !isHolidayNotice && (
                            <>
                              <span>•</span>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Expires: {dayjs(notice.expiryDate).format("DD MMM YYYY")}
                              </Text>
                            </>
                          )}
                          {!isBirthdayNotice && !isHolidayNotice && notice.createdBy?.name && (
                            <>
                              <span>•</span>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                By: {notice.createdBy.name}
                              </Text>
                            </>
                          )}
                        </Space>
                      </Space>
                      {!isBirthdayNotice && !isHolidayNotice && isAdmin && (
                        <Space>
                          <Tooltip title="Edit">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setEditingNotice(notice);
                                noticeForm.setFieldsValue({
                                  title: notice.title,
                                  content: notice.content,
                                  priority: notice.priority || "medium",
                                  expiryDate: notice.expiryDate ? dayjs(notice.expiryDate) : null,
                                });
                                setIsNoticeModalVisible(true);
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="Delete">
                            <Popconfirm
                              title="Delete this notice?"
                              onConfirm={() => handleDeleteNotice(notice._id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                              />
                            </Popconfirm>
                          </Tooltip>
                        </Space>
                      )}
                    </div>
                  </Card>
                ),
              };
            })}
          />
        </div>
      </Card>
    );
  };

  // --- Table Columns ---

  const columns = [
    {
      title: "S.No.",
      key: "sno",
      render: (_, __, index) => index + 1,
      width: 60,
      fixed: 'left',
      align: 'center',
    },
    { title: "Date", dataIndex: "dateLabel", responsive: ['md'] },
    {
      title: "Name",
      dataIndex: "name",
      responsive: ['lg'],
      filters: Array.from(new Set(sessions.map(s => s.name))).map(name => ({
        text: name,
        value: name
      })),
      onFilter: (value, record) => record.name === value,
      key: 'name',
    },
    { title: "Login", dataIndex: "loginTimeFormatted" },
    { title: "Logout", dataIndex: "logoutTimeFormatted" },
    {
      title: "Timer",
      render: (_, record) => (
        <span className={runningSessions[record.key] ? "countdown" : (timers[record.key] < 0 ? "overtime" : "")}>
          {formatTime(timers[record.key] || 0)}
        </span>
      ),
    },
    {
      title: "Worked Hours",
      dataIndex: "totalHours",
      render: (_, r) => formatWorkedTime(r.totalHours),
      responsive: ['md']
    },
    {
      title: "EOD",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedSession(record);
              setIsEodModalVisible(true);
              form.setFieldsValue({
                eod: record.eod || "",
                accountIds: record.accountIds?.map(a => a._id) || [],
                serviceIds: record.serviceIds?.map(s => s._id) || [],
                date: record.date ? dayjs(record.date) : dayjs(record.loginTime),
              });
            }}
          >
            {record.eod ? "Edit" : "Add"}
          </Button>
          {record.eod && <Button type="link" size="small" onClick={() => handleViewEod(record)}>View</Button>}
        </Space>
      ),
    },
    {
      title: "Actions",
      render: (_, record) => {
        const isRunning = runningSessions[record.key];
        const isCurrentUser = record.userId === currentUser._id;
        const canStop = isRunning && (isAdmin || isCurrentUser);
        if (!canStop) return null;
        return (
          <Popconfirm
            title="Are you sure you want to stop work?"
            onConfirm={() => handleStopWork(record.key)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<StopOutlined />}
            >
              Stop
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  const hasRunningSessionForCurrentUser = sessions.some(s => s.userId === currentUser._id && runningSessions[s.key]);
  const isMobileView = !screens.md;

  const renderCardView = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      {filteredSessions.map((record) => {
        const isRunning = runningSessions[record.key];
        const isCurrentUser = record.userId === currentUser._id;
        const canStop = isRunning && (isAdmin || isCurrentUser);

        const cardStyle = {
          borderLeft: `2px solid ${isRunning ? '#52c41a' : (record.logoutTime ? '#1677ff' : '#faad14')}`
        };

        return (
          <Card
            key={record.key}
            className="timesheet-mobile-card"
            title={
              <Row justify="space-between" align="middle">
                <Title level={5} style={{ margin: 0 }}>
                  {record.dateLabel}
                </Title>
                <Title level={5} style={{ margin: 0 }}>
                  {record.name}
                </Title>
                <span className={isRunning ? "countdown" : (timers[record.key] < 0 ? "overtime" : "")}>
                  {formatTime(timers[record.key] || 0)}
                </span>
              </Row>
            }
            extra={
              canStop ? (
                <Popconfirm
                  title="Stop work?"
                  onConfirm={() => handleStopWork(record.key)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<StopOutlined />}
                    style={{ padding: '4px 8px' }}
                  >
                    Stop
                  </Button>
                </Popconfirm>
              ) : null
            }
            style={cardStyle}
            loading={loading}
          >
            <p><strong>Login:</strong> {record.loginTimeFormatted}</p>
            <p><strong>Logout:</strong> {record.logoutTimeFormatted || "RUNNING"}</p>
            <p><strong>Worked:</strong> {formatWorkedTime(record.totalHours)}</p>

            <Space size="middle" style={{ marginTop: 8 }}>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setSelectedSession(record);
                  setIsEodModalVisible(true);
                  form.setFieldsValue({
                    eod: record.eod || "",
                    accountIds: record.accountIds?.map(a => a._id) || [],
                    serviceIds: record.serviceIds?.map(s => s._id) || [],
                    date: record.date ? dayjs(record.date) : dayjs(record.loginTime),
                  });
                }}
              >
                EOD ({record.eod ? "Edit" : "Add"})
              </Button>
              {record.eod && (
                <Button type="link" size="small" onClick={() => handleViewEod(record)}>View Details</Button>
              )}
            </Space>
          </Card>
        );
      })}
    </Space>
  );

  // --- Main Render ---

  return (
    <div className="timesheet-dashboard-container">
      <Toaster position="top-right" reverseOrder={false} />

      {/* Holiday Board with Birthday Integration */}
      {renderHolidayBoard()}
      
      {/* Birthday Corner */}
      {renderBirthdayCorner()}

      {/* Notice Board with Birthday & Holiday Notices */}
      {renderNoticeBoard()}

      {/* Header and Controls */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={2}>Timesheet Dashboard</Title>
        <Space wrap size="middle">
          <Select
            value={dateFilterPreset}
            onChange={handlePresetChange}
            style={{ width: 120 }}
          >
            <Option value="today">Today</Option>
            <Option value="thisWeek">This Week</Option>
            <Option value="thisMonth">This Month</Option>
            <Option value="custom">Custom Range</Option>
          </Select>

          <RangePicker
            onChange={handleDateRangeChange}
            value={dateRange}
            style={{ width: '100%' }}
            disabled={dateFilterPreset !== 'custom'}
          />

          <Button type="primary" onClick={fetchSessions} loading={loading}>
            Fetch History
          </Button>

          <Button
            onClick={exportToCSV}
            disabled={filteredSessions.length === 0}
          >
            Export Report
          </Button>

          {!isAdmin && !hasRunningSessionForCurrentUser && (
            <Button type="primary" loading={loading} onClick={handleStartWork}>
              Start Work
            </Button>
          )}
        </Space>
      </Row>

      {/* Summary Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card title="Total Sessions" bordered={false} className="stat-card">
            <Title level={3} style={{ margin: 0 }}>{stats.totalSessions}</Title>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card title="Working Days" bordered={false} className="stat-card">
            <Title level={3} style={{ margin: 0 }}>{stats.uniqueWorkingDays}</Title>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card title="Sessions Stopped" bordered={false} className="stat-card">
            <Title level={3} style={{ margin: 0 }}>{stats.sessionsStopped}</Title>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card title="Total Worked Time" bordered={false} className="stat-card">
            <Title level={3} style={{ margin: 0 }}>{formatWorkedTime(stats.totalWorkedHours)}</Title>
          </Card>
        </Col>
      </Row>

      {/* Main Content: Conditional Rendering based on screen size */}
      {isMobileView ? (
        renderCardView()
      ) : (
        <Table
          columns={columns}
          dataSource={sessions}
          pagination={false}
          rowKey="key"
          loading={loading}
          scroll={{ x: 'max-content' }}
          onChange={handleTableChange}
        />
      )}

      {/* EOD Modals */}
      <Modal
        title="End of Day Notes"
        open={isEodModalVisible}
        onCancel={() => {
          setIsEodModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleEodSubmit}>
          <Form.Item
            label="EOD Message"
            name="eod"
            rules={[{ required: true, message: 'Please enter your EOD message' }]}
          >
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item
            label="Select Accounts"
            name="accountIds"
            rules={[{ type: 'array', message: 'Please select at least one account' }]}
          >
            <Select mode="multiple" placeholder="Select accounts">
              {accounts.map((a) => (
                <Option key={a._id} value={a._id}>{a.businessName}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Select Services"
            name="serviceIds"
            rules={[{ type: 'array', message: 'Please select at least one service' }]}
          >
            <Select mode="multiple" placeholder="Select services">
              {services.map((s) => (
                <Option key={s._id} value={s._id}>{s.serviceName || s.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Date" name="date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Save EOD</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`EOD Details - ${viewSession?.name}`}
        open={isEodViewModalVisible}
        onCancel={() => setIsEodViewModalVisible(false)}
        footer={<Button onClick={() => setIsEodViewModalVisible(false)}>Close</Button>}
        width={700}
      >
        {viewSession && (
          <div>
            <p><strong>Date:</strong> {viewSession.date ? dayjs(viewSession.date).format("DD-MM-YYYY") : viewSession.dateLabel || "-"}</p>
            <p><strong>Login:</strong> {viewSession.loginTimeFormatted || "-"}</p>
            <p><strong>Logout:</strong> {viewSession.logoutTimeFormatted || "-"}</p>
            <p><strong>Worked Hours:</strong> {formatWorkedTime(viewSession.totalHours)}</p>
            <p><strong>EOD Message:</strong></p>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 10, borderRadius: 4 }}>
              {viewSession.eod || "No EOD provided"}
            </pre>
            <p><strong>Accounts:</strong></p>
            <ul>
              {viewSession.accountIds?.map(acc => <li key={acc._id}>{acc.businessName}</li>) || <li>-</li>}
            </ul>
            <p><strong>Services:</strong></p>
            <ul>
              {viewSession.serviceIds?.map(svc => <li key={svc._id}>{svc.serviceName || svc.name}</li>) || <li>-</li>}
            </ul>
          </div>
        )}
      </Modal>

      {/* Notice Board Modal (Add/Edit) */}
      <Modal
        title={editingNotice ? "Edit Notice" : "Add New Notice"}
        open={isNoticeModalVisible}
        onCancel={() => {
          setIsNoticeModalVisible(false);
          noticeForm.resetFields();
          setEditingNotice(null);
        }}
        footer={null}
        width={500}
      >
        <Form form={noticeForm} layout="vertical" onFinish={handleSaveNotice}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Please enter notice title" }]}
          >
            <Input placeholder="Enter notice title" />
          </Form.Item>
          <Form.Item
            label="Content"
            name="content"
            rules={[{ required: true, message: "Please enter notice content" }]}
          >
            <TextArea rows={4} placeholder="Enter notice details..." />
          </Form.Item>
          <Form.Item
            label="Priority"
            name="priority"
            initialValue="medium"
          >
            <Select>
              <Option value="high">🔴 High Priority</Option>
              <Option value="medium">🟡 Medium Priority</Option>
              <Option value="low">🟢 Low Priority</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="Expiry Date (Optional)"
            name="expiryDate"
          >
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={noticeLoading}>
              {editingNotice ? "Update Notice" : "Post Notice"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}