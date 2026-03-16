// src/components/TopNavbar/TopNavbar.jsx
import React, { useState, useEffect, useContext } from "react";
import {
  Avatar,
  Dropdown,
  Badge,
  Tooltip,
  Divider,
  List,
  Tag,
  Popover,
  Empty,
} from "antd";
import {
  AudioMutedOutlined,
  AudioOutlined,
  LogoutOutlined,
  UserOutlined,
  WarningFilled,
  WhatsAppOutlined,
} from "@ant-design/icons";
import logo from "../../assets/vrism.png";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import { PresenceContext } from "../../context/PresenceContext";
import {
  playNotificationSound,
  toggleMute,
  isMuted,
} from "../../utils/notificationSound";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "./TopNavbar.css";

dayjs.extend(relativeTime);

const TopNavbar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const lsUser = JSON.parse(localStorage.getItem("user"));
  const { presenceMap, socket } = useContext(PresenceContext);

  if (!lsUser) return null;

  /* ================= PRESENCE ================= */
  const presenceColors = {
    online: "#00d12e",
    busy: "#ff2d2d",
    away: "#ffb300",
    in_meeting: "#8b32ff",
    offline: "#8c8c8c",
  };

  const livePresence = presenceMap[lsUser._id]?.presence || "offline";

  const presenceDot = {
    backgroundColor: presenceColors[livePresence],
    width: 12,
    height: 12,
    borderRadius: "50%",
    position: "absolute",
    bottom: 0,
    right: 0,
    border: "2px solid white",
    boxShadow: `0 0 6px ${presenceColors[livePresence]}`,
  };

  /* ================= OLD NOTIFICATIONS ================= */
  const [notificationCount, setNotificationCount] = useState(0);
  const [prevNotificationCount, setPrevNotificationCount] = useState(0);

  const loadUnreadNotifications = () => {
    axios
      .get(`/api/notifications/${lsUser._id}`)
      .then((res) => {
        const newCount = res.data.notifications.filter((n) => !n.read).length;
        setNotificationCount(newCount);

        if (newCount > prevNotificationCount && !isMuted()) {
          playNotificationSound();
        }
        setPrevNotificationCount(newCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadUnreadNotifications();
    const intv = setInterval(loadUnreadNotifications, 6000);
    return () => clearInterval(intv);
  }, [prevNotificationCount]);

  /* ================= ALERT SYSTEM ================= */
  const [alerts, setAlerts] = useState([]);
  const [alertOpen, setAlertOpen] = useState(false);

  const loadAlerts = () => {
    axios
      .get(`/api/alerts?userId=${lsUser._id}`)
      .then((res) => setAlerts(res.data.alerts || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadAlerts();
    const intv = setInterval(loadAlerts, 7000);
    return () => clearInterval(intv);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleAlert = () => {
      loadAlerts();
      if (!isMuted()) playNotificationSound();
    };

    socket.on("alert_received", handleAlert);
    return () => socket.off("alert_received", handleAlert);
  }, [socket]);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  /* ================= ALERT CLICK ================= */
  const handleAlertClick = async (alert) => {
    await axios.put(`/api/alerts/${alert._id}/read`);

    if (alert.type === "Task" && alert.refId) {
      navigate(`/taskmanage?open=${alert.refId}`);
    } else if (alert.type === "Project" && alert.refId) {
      navigate(`/projects?open=${alert.refId}`);
    } else if (alert.type === "Leave") {
      if (lsUser.role === "Employee")
        navigate(`/apply-leave?open=${alert.refId}`);
      else navigate(`/manage-leaves?open=${alert.refId}`);
    } else if (alert.type === "Work") {
      if (lsUser.role === "Employee")
        navigate(`/attendance?open=${alert.refId}`);
      else navigate(`/eodreport?open=${alert.refId}`);
    } else {
      navigate("/alerts");
    }

    setAlertOpen(false);
    loadAlerts();
  };

  const clearUnread = async () => {
    await axios.put(`/api/alerts/mark-all-read?userId=${lsUser._id}`);
    toast.success("Unread Alerts Cleared");
    loadAlerts();
  };

  const clearAll = async () => {
    await axios.delete(`/api/alerts/clear?userId=${lsUser._id}`);
    toast.success("All Alerts Cleared");
    loadAlerts();
  };

  /* ================= PRESENCE UPDATE ================= */
  const updatePresence = async (status) => {
    await axios.post("/api/users/status/update", {
      userId: lsUser._id,
      presence: status,
    });
    socket?.emit("presence_change", {
      userId: lsUser._id,
      presence: status,
    });
  };

  /* ================= ALERT PANEL ================= */
  const AlertPanel = (
    <div style={{ width: 360, maxHeight: 380, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <b>Unread ({unreadCount})</b>
        <div style={{ display: "flex", gap: 12 }}>
          <span onClick={clearUnread} style={{ color: "#fa8c16", cursor: "pointer" }}>
            Clear Unread
          </span>
          <span onClick={clearAll} style={{ color: "red", cursor: "pointer" }}>
            Clear All
          </span>
        </div>
      </div>

      <List
        dataSource={alerts.filter((a) => !a.isRead)}
        locale={{ emptyText: <Empty description="🎉 No unread alerts" /> }}
        renderItem={(item) => (
          <div
            onClick={() => handleAlertClick(item)}
            style={{
              padding: 10,
              marginBottom: 8,
              border: "1px solid #eee",
              background: "#fff7e6",
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            <b>{item.type} Alert</b>
            <Tag style={{ marginLeft: 8 }}>{item.type}</Tag>
            <div>{item.message}</div>
            <small>{dayjs(item.createdAt).fromNow()}</small>
          </div>
        )}
      />
    </div>
  );

  /* ================= DROPDOWN ================= */
  const dropdownMenu = {
    items: [
      {
        type: "group",
        label: "Status",
        children: Object.keys(presenceColors).map((status) => ({
          key: status,
          label: (
            <div onClick={() => updatePresence(status)}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: presenceColors[status],
                  borderRadius: "50%",
                  display: "inline-block",
                  marginRight: 8,
                }}
              />
              {status.replace("_", " ")}
            </div>
          ),
        })),
      },
      { type: "divider" },
      {
        key: "profile",
        icon: <UserOutlined />,
        label: "Profile",
        onClick: () => navigate("/profile"),
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Logout",
        onClick: () => {
          updatePresence("offline");
          localStorage.clear();
          navigate("/login");
        },
      },
    ],
  };

  const showWhatsApp = lsUser.role !== "Client";

  return (
    <div className="top-navbar-container">
      <div
        className="navbar-left-content"
        onClick={() => setCollapsed(!collapsed)}
      />

      {/* MOBILE LOGO ONLY */}
      <div className="mobile-logo-only">
        <img src={logo} alt="Logo" className="mobile-logo-img" />
      </div>

      <div className="top-navbar-right">
        {/* MUTE */}
        <Tooltip title={isMuted() ? "Enable Sound" : "Mute"}>
         <span
  className="mute-toggle"
  onClick={() =>
    toast(toggleMute() ? "Muted" : "Sound Enabled")
  }
>
  {isMuted() ? (
    <AudioMutedOutlined style={{ fontSize: 19 }} />
  ) : (
    <AudioOutlined style={{ fontSize: 19 }} />
  )}
</span>

        </Tooltip>

        {/* WHATSAPP – NOT FOR CLIENT */}
        {showWhatsApp && (
          <Tooltip title="Notifications">
            <Badge count={notificationCount}>
              <WhatsAppOutlined
                className="bell-icon"
                style={{ fontSize: 24, marginLeft: 15 }}
                onClick={() => navigate("/notifications")}
              />
            </Badge>
          </Tooltip>
        )}

        {/* ALERT BELL */}
        <Popover
          content={AlertPanel}
          trigger="click"
          placement="bottomRight"
          open={alertOpen}
          onOpenChange={setAlertOpen}
        >
          <Badge count={unreadCount}>
            <WarningFilled
              className="bell-icon"
              style={{ fontSize: 24, marginLeft: 15 }}
            />
          </Badge>
        </Popover>

     <Dropdown menu={dropdownMenu} trigger={["click"]}>
          <div style={{ cursor: "pointer", position: "relative" }}>
            <Avatar 
              style={{ fontSize: 24, backgroundColor: "#122e44" }}
              src={lsUser?.profileImage} // <-- CHANGE: Use profile image URL
            >
              {/* CHANGE: Fallback to first letter only if profileImage is missing */}
              {!lsUser?.profileImage && lsUser?.name?.charAt(0)}
            </Avatar>
            <span style={presenceDot}></span>
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default TopNavbar;
