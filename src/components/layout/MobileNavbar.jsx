import React from "react";
import {
  DashboardOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  FileAddOutlined,
  PlusOutlined,
  MessageFilled,
  CalendarFilled,
  DashboardFilled,
  HomeOutlined,
  TeamOutlined,
  ShoppingOutlined,
  CheckSquareOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import "./MobileTabMenu.css";

const MobileNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  // Icon mapping for consistent styling
  const iconMap = {
    dashboard: <DashboardOutlined />,
    timesheet: <ClockCircleOutlined />,
    task: <CheckSquareOutlined />,
    chat: <MessageFilled />,
    quotations: <FileTextOutlined />,
    customers: <TeamOutlined />,
    products: <ShoppingOutlined />,
    subscriptions: <CalendarFilled />,
    projects: <DashboardFilled />,
  };

  // Define all menu items with better labels
  const allMenuItems = [
    {
      key: "/dashboard",
      icon: iconMap.dashboard,
      label: "Dashboard",
      roles: ["Admin", "Superadmin", "Team Leader"],
    },
            ,        { key: "/content", label: "Content Dashboard", roles: ["Admin", "Superadmin", "Team Leader", "Employee","Client"], icon: <ScheduleOutlined /> },
    
    {
      key: "/attendance",
      icon: iconMap.timesheet,
      label: "Timesheet",
      roles: ["Admin", "Superadmin", "Employee", "Team Leader"],
    },
    {
      key: "/taskmanage",
      icon: iconMap.task,
      label: "Tasks",
      roles: ["Admin", "Superadmin", "Employee", "Team Leader"],
    },
    {
      key: "/chat",
      icon: iconMap.chat,
      label: "Messages",
      roles: ["Admin", "Superadmin", "Employee", "Team Leader"],
    },
    {
      key: "/quotation",
      icon: iconMap.quotations,
      label: "Quotes",
      roles: ["Admin", "Superadmin"],
    },
    {
      key: "/customers",
      icon: iconMap.customers,
      label: "Team",
      roles: ["Admin", "Superadmin"],
    },
    {
      key: "/products",
      icon: iconMap.products,
      label: "Products",
      roles: ["Admin", "Superadmin"],
    },
    {
      key: "/subscriptions",
      icon: iconMap.subscriptions,
      label: "Plans",
      roles: ["Client"],
    },
    {
      key: "/client-dashboard",
      icon: iconMap.projects,
      label: "Projects",
      roles: ["Client"],
    },
  ];

  // Filter by user role
  const visibleItems = allMenuItems.filter(item => item.roles.includes(role));

  return (
    <div className="mobile-tab-menu">
      {visibleItems.map(item => (
        <div
          key={item.key}
          onClick={() => navigate(item.key)}
          className={`tab-item ${location.pathname === item.key ? "active-tab" : ""}`}
        >
          <div className="tab-icon-wrapper">
            {item.icon}
          </div>
          <span className="tab-label">{item.label}</span>
          {location.pathname === item.key && <div className="active-indicator" />}
        </div>
      ))}
    </div>
  );
};

export default MobileNavbar;