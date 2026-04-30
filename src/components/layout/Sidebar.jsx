// src/components/Sidebar/Sidebar.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Menu } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  FileAddOutlined,
  UsergroupAddOutlined,
  SolutionOutlined,
  AppstoreOutlined,
  UserSwitchOutlined,
  LockOutlined,
  MessageOutlined,
  SecurityScanOutlined,
  WalletOutlined,
  ScheduleOutlined,
  ProjectOutlined,
  BarChartOutlined,
  CalendarOutlined,
  IdcardOutlined,
  FolderOpenOutlined,
  NodeIndexOutlined,
  StepForwardFilled,
  ProjectFilled,
  CalendarTwoTone,
  InstagramOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

import logoCollapsed from "../../assets/vrismsmall.png";
import logoExpanded from "../../assets/vrism.png";

const Sidebar = ({ collapsed, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  // Define menu items with unique keys
  const rawMenuItems = useMemo(() => [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      roles: ["Admin", "Superadmin", "Employee", "Team Leader", "Client"],
      children: [
        {
          key: "/eodreport",
          label: "EOD Report",
          roles: ["Admin", "Superadmin"],
          icon: <FileTextOutlined />,
        },
        {
          key: "/dashboard/deals",
          label: "Leads Dashboard",
          roles: ["Admin", "Superadmin", "Team Leader"],
          icon: <BarChartOutlined />,
        },
        {
          key: "/taskmanage",
          label: "Task Dashboard",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
          icon: <ScheduleOutlined />,
        },
        { 
          key: "/content", 
          label: "Content Dashboard", 
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"], 
          icon: <InstagramOutlined /> 
        },
      ],
    },
    {
      key: "/Report",
      icon: <FolderOpenOutlined />,
      label: "Manage Reports",
      roles: ["Admin", "Superadmin", "Employee", "Team Leader"],
      children: [
        {
          key: "/manage-leaves",
          label: "Manage Leaves",
          roles: ["Admin", "Superadmin", "Team Leader"],
          icon: <UserSwitchOutlined />,
        },
        {
          key: "/holidays",
          label: "Manage Holidays",
          roles: ["Admin", "Superadmin", "Team Leader"],
          icon: <CalendarTwoTone />,
        },
        {
          key: "/dailyplan",
          label: "Daily Planner",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
          icon: <CalendarOutlined />,
        },
        {
          key: "/attendance",
          label: "TimeSheet",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
          icon: <LockOutlined />,
        },
        {
          key: "/workingdays",
          label: "Attendance",
          roles: ["Admin", "Superadmin", "Team Leader"],
          icon: <SecurityScanOutlined />,
        },
      ],
    },
    {
      key: "/project-management",
      icon: <ProjectFilled />,
      label: "Project Management",
      roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
      children: [
        {
          key: "/process-step-pm",
          icon: <StepForwardFilled />,
          label: "Process Step",
          roles: ["Admin", "Superadmin", "Team Leader"],
        },
        {
          key: "/projects",
          label: "Projects",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
          icon: <ProjectOutlined />,
        },
        {
          key: "/project-track",
          label: "Tracking",
          roles: ["Admin", "Superadmin", "Team Leader"],
          icon: <AppstoreOutlined />,
        }
      ],
    },
    {
      key: "/application",
      icon: <AppstoreOutlined />,
      label: "Application",
      roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
      children: [
        {
          key: "/leads",
          icon: <SolutionOutlined />,
          label: "Leads",
          roles: ["Admin", "Superadmin", "Team Leader"],
        },
        {
          key: "/clients",
          icon: <UserOutlined />,
          label: "Clients",
          roles: ["Admin", "Superadmin", "Team Leader"],
        },
        {
          key: "/process-step-app",
          icon: <StepForwardFilled />,
          label: "Process Step",
          roles: ["Admin", "Superadmin", "Team Leader"],
        },
        {
          key: "/quotation",
          icon: <FileTextOutlined />,
          label: "Quotations",
          roles: ["Admin", "Superadmin", "Team Leader"],
        },
        {
          key: "/service",
          icon: <FileAddOutlined />,
          label: "Service",
          roles: ["Admin", "Superadmin", "Team Leader"],
        },
      ],
    },
    {
      key: "/personal",
      icon: <LockOutlined />,
      label: "Personal",
      roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
      children: [
        {
          key: "/wallets",
          icon: <WalletOutlined />,
          label: "Wallets",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
        },
        {
          key: "/chat",
          icon: <MessageOutlined />,
          label: "Chat",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
        },
        {
          key: "/master",
          icon: <SecurityScanOutlined />,
          label: "Master",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
        },
        {
          key: "/apply-leave",
          icon: <ScheduleOutlined />,
          label: "Leave",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
        },
      ],
    },
    {
      key: "/super-admin",
      icon: <UserSwitchOutlined />,
      label: "User Manage",
      roles: ["Superadmin", "Admin", "Employee", "Team Leader", "Client"],
      children: [
        {
          key: "/management",
          icon: <UsergroupAddOutlined />,
          label: "User Management",
          roles: ["Superadmin"],
        },
        {
          key: "/profile",
          icon: <IdcardOutlined />,
          label: "Profile",
          roles: ["Superadmin", "Admin", "Employee", "Team Leader"],
        },
      ],
    },
    {
      key: "/client",
      icon: <NodeIndexOutlined />,
      label: "Client",
      roles: ["Superadmin", "Client"],
      children: [
        {
          key: "/mycontent",
          icon: <InstagramOutlined />,
          label: "My Reports",
          roles: ["Client"],
        },
        {
          key: "/client-dashboard",
          icon: <UsergroupAddOutlined />,
          label: "Projects Status",
          roles: ["Client"],
        },
        {
          key: "/subscriptions",
          icon: <UsergroupAddOutlined />,
          label: "Subscriptions",
          roles: ["Client"],
        },
        {
          key: "/createsubscriptions",
          icon: <IdcardOutlined />,
          label: "Create Subscriptions",
          roles: ["Superadmin", "Admin", "Employee", "Team Leader"],
        }
      ],
    },
  ], []);

  // Filter menu items by role with memoization
  const filterByRole = useMemo(() => {
    const filterItems = (items) =>
      items
        .map((item) => {
          // Check role access for parent
          const hasParentAccess = !item.roles || item.roles.includes(role);
          
          if (item.children) {
            const filteredChildren = filterItems(item.children);
            // Show parent if: has access AND has children
            if (hasParentAccess && filteredChildren.length > 0) {
              return { ...item, children: filteredChildren };
            }
            return null;
          } else {
            // Leaf node - show if role matches
            return (!item.roles || item.roles.includes(role)) ? item : null;
          }
        })
        .filter(Boolean);

    return filterItems(rawMenuItems);
  }, [rawMenuItems, role]);

  // Get all root keys for open/close logic
  const rootSubmenuKeys = useMemo(() => 
    filterByRole.map((item) => item.key), 
    [filterByRole]
  );

  // Find parent key for current path
  const getParentKey = (pathname) => {
    const parent = filterByRole.find(item => 
      pathname === item.key || 
      (item.children && item.children.some(child => pathname.startsWith(child.key)))
    );
    return parent ? parent.key : null;
  };

  const [openKeys, setOpenKeys] = useState([]);

  // Handle open/close of submenus
  useEffect(() => {
    if (!collapsed) {
      const currentParent = getParentKey(location.pathname);
      if (currentParent && !openKeys.includes(currentParent)) {
        setOpenKeys([currentParent]);
      }
    } else {
      setOpenKeys([]);
    }
  }, [collapsed, location.pathname, filterByRole]);

  // Handle submenu open/close
  const onOpenChange = (keys) => {
    if (collapsed) {
      // When collapsed, don't allow multiple opens
      const latestOpenKey = keys.find(key => !openKeys.includes(key));
      if (latestOpenKey && rootSubmenuKeys.includes(latestOpenKey)) {
        setOpenKeys([latestOpenKey]);
      } else if (keys.length === 0) {
        setOpenKeys([]);
      }
    } else {
      // When expanded, allow multiple opens
      setOpenKeys(keys);
    }
  };

  // Handle menu click navigation
  const handleMenuClick = ({ key }) => {
    // Navigate to the clicked item
    navigate(key);
    
    // For mobile: close drawer if onMobileClose provided
    if (onMobileClose) {
      onMobileClose();
    }
  };

  // Get current selected keys based on pathname
  const getSelectedKeys = () => {
    // Check if exact match exists
    if (filterByRole.some(item => item.key === location.pathname)) {
      return [location.pathname];
    }
    
    // Check children matches
    for (const item of filterByRole) {
      if (item.children) {
        const childMatch = item.children.find(child => 
          location.pathname === child.key || 
          location.pathname.startsWith(child.key + '/')
        );
        if (childMatch) {
          return [childMatch.key];
        }
      }
    }
    
    return [];
  };

  return (
    <div
      className={`sidebar-container ${collapsed ? 'collapsed' : ''}`}
      style={{
        height: "100%",
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        background: "#fafafa",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="sidebar-logo">
        <img
          src={collapsed ? logoCollapsed : logoExpanded}
          alt="VRISM Logo"
          className="sidebar-logo-img"
        />
      </div>

      <Menu
        mode="inline"
        theme="light"
        items={filterByRole}
        selectedKeys={getSelectedKeys()}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        onClick={handleMenuClick}
        inlineCollapsed={collapsed}
        className="sidebar-menu"
        style={{
          flex: 1,
          borderRight: 0,
          background: "#fafafa",
        }}
      />
    </div>
  );
};

export default Sidebar;