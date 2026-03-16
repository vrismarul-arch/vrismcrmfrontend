import React, { useState, useEffect } from "react";
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
  DockerOutlined,
  ScheduleOutlined,
  ProjectOutlined, // Imported for Projects
  BarChartOutlined, // Imported for Leads Dashboard/Tracking
  CalendarOutlined, // Imported for Daily Planner/Attendance
  IdcardOutlined, // Imported for Profile
  FolderOpenOutlined,
  NodeIndexOutlined,
  StepForwardFilled,
  ProjectFilled, // Imported for Leads/Clients/Quotations
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import "./sidebar.css";

import logoCollapsed from "../../assets/vrismsmall.png";
import logoExpanded from "../../assets/vrism.png";

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the first part of the path (e.g., '/dashboard' from '/dashboard/deals')
  const selectedKey = "/" + location.pathname.split("/")[1];

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  const rawMenuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      roles: ["Admin", "Superadmin", "Employee", "Team Leader","Client"],
      children: [
        {
          key: "/eodreport",
          label: "EOD Report",
          roles: ["Admin", "Superadmin"],
          icon: <FileTextOutlined />, // Added Icon
        },
        {
          key: "/dashboard/deals",
          label: "Leads Dashboard",
          roles: ["Admin", "Superadmin", "Team Leader"],
          icon: <BarChartOutlined />, // Added Icon
        },
        {
          key: "/taskmanage",
          label: "Task Dashboard",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
          icon: <ScheduleOutlined />, // Added Icon
        }
        ,        { key: "/content", label: "Content Dashboard", roles: ["Admin", "Superadmin", "Team Leader", "Employee","Client"], icon: <ScheduleOutlined /> },

      ],
    },
    {
      key: "/Report",
      icon: <FolderOpenOutlined />,
      label: "Mange Reports",
      roles: ["Admin", "Superadmin", "Employee", "Team Leader"],
      children: [
        
        {
          key: "/manage-leaves",
          label: "ManageLeaves",
          roles: ["Admin", "Superadmin", "Team Leader"],
          icon: <UserSwitchOutlined />, // Added Icon
        },
        
        {
          key: "/dailyplan",
          label: "Daily Planner",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
          icon: <CalendarOutlined />, // Added Icon
        },
        {
          key: "/attendance",
          label: "TimeSheet",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
          icon: <LockOutlined />, // Added Icon
        },
        {
          key: "/workingdays",
          label: "Attendance", // Corrected typo from Attance
          roles: ["Admin", "Superadmin", "Team Leader"],
          icon: <SecurityScanOutlined />, // Added Icon
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
          key: "/process-step",
          icon: <StepForwardFilled />,
          label: "Process Step",
          roles: ["Admin", "Superadmin", "Team Leader"],
        },
       {
          key: "/projects",
          label: "Projects",
          roles: ["Admin", "Superadmin", "Team Leader", "Employee"],
          icon: <ProjectOutlined />, // Added Icon
        },
        {
          key: "/project-track",
          label: "Tracking",
          roles: ["Admin", "Superadmin", "Team Leader"],
          icon: <AppstoreOutlined />, // Added Icon
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
          key: "/process-step",
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
          label: "leave",
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
          icon: <UsergroupAddOutlined />, // Added Icon
          label: "User Management",
          roles: ["Superadmin"],
        },
        {
          key: "/profile",
          icon: <IdcardOutlined />, // Added Icon
          label: "Profile",
          roles: ["Superadmin", "Admin", "Employee", "Team Leader"],
        },
      ],
    },
    {
      key: "/clinet",
      icon: <NodeIndexOutlined />,
      label: "Client",
      roles: ["Superadmin", "Client"],
      children: [
        {
          key: "/client-dashboard",
          icon: <UsergroupAddOutlined />, // Added Icon
          label: "Projects Status",
          roles: ["Client"],
        },
        {
          key: "/subscriptions",
          icon: <UsergroupAddOutlined />, // Added Icon
          label: "Subscriptions",
          roles: ["Client"],
        },

        {
          key: "/createsubscriptions",
          icon: <IdcardOutlined />,
          label: "Create subscriptions ",
          roles: ["Superadmin", "Admin", "Employee", "Team Leader"],
        }
      ],
    },
  ];

  // Function to filter menu items based on the user's role
  const filterByRole = (items) =>
    items
      .map((item) => {
        if (item.children) {
          const filteredChildren = filterByRole(item.children);
          // Only include the parent if it has children for the current role OR the parent itself is allowed
          if (filteredChildren.length > 0 && (!item.roles || item.roles.includes(role))) {
            return { ...item, children: filteredChildren };
          }
          return null;
        } else {
          // Leaf item: check if the role is allowed
          return !item.roles || item.roles.includes(role) ? item : null;
        }
      })
      .filter(Boolean); // Remove null items

  const menuItems = filterByRole(rawMenuItems);

  const rootSubmenuKeys = menuItems.map((item) => item.key);
  const [openKeys, setOpenKeys] = useState([]);

  useEffect(() => {
    if (!collapsed) {
      // Find the parent key of the currently selected route
      const currentParent = rootSubmenuKeys.find((key) => location.pathname.startsWith(key));
      setOpenKeys(currentParent ? [currentParent] : []); // active route auto open
    } else {
      setOpenKeys([]); // collapse closes all
    }
  }, [collapsed, selectedKey, location.pathname]); // Added location.pathname to dependencies

  // Logic to only keep one submenu open at a time (Accordion effect)
  const onOpenChange = (keys) => {
    const latestOpenKey = keys.find((key) => !openKeys.includes(key));
    if (rootSubmenuKeys.includes(latestOpenKey)) {
      setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
    } else {
      setOpenKeys(keys);
    }
  };

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        height: "100vh",
        width: collapsed ? 80 : 200,
        overflowY: "auto",
        background: "#fafafa",
        transition: "all .3s",
      }}
    >
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <img
          src={collapsed ? logoCollapsed : logoExpanded}
          alt="Logo"
          style={{
            padding: 10,
            width: collapsed ? 55 : 160,
            transition: "all 0.3s",
          }}
        />
      </div>

      <Menu
        mode="inline"
        theme="light"
        items={menuItems}
        // selectedKeys needs to check the full path to select the correct leaf item
        selectedKeys={[location.pathname]}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        onClick={handleMenuClick}
        style={{
          height: "calc(100% - 64px)",
          borderRight: 0,
        }}
        inlineCollapsed={collapsed}
      />
    </div>
  );
};

export default Sidebar;