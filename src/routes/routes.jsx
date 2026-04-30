// File: src/routes/routes.jsx
import React from "react";
import RoleGuard from "../components/auth/RoleGuard";

import NotificationPage from "../pages/notify/NotificationPage";
import Credentials from "../pages/passwords/Credentials";
import Chat from "../pages/chat/Chat";
import Scheduler from "../pages/secdule/Scheduler";
import ApplyLeave from "../pages/leave/ApplyLeave";
import ManageLeaves from "../pages/leave/ManageLeaves";
import AdminAttendance from "../pages/attendance/AdminAttendance";
import ProjectManagement from "../pages/projects/ProjectManagement";
import ProjectTracking from "../pages/projects/ProjectTracking";
import ClientProjectDashboard from "../pages/projects/ClientProjectDashboard";
import ClientDashboard from "../pages/clients/ClientDashboard";
import Subscriptions from "../pages/clients/Subscriptions";
import SubscriptionManagement from "../pages/clients/SubscriptionManagement";

// ⭐ ReactFlow Provider Fix
import { ReactFlowProvider } from "reactflow";
// import MonthlyContentDashboard from "../pages/content/MonthlyContentDashboard";
import PublicHolidayManager from "../pages/holiday/Publicholidaymanager";
import WeeklyReport from "../pages/content/WeeklyReport";
import ClientReportPage from "../pages/content/ClientReportPage";

// Lazy Pages
const Dashboard = React.lazy(() => import("../pages/dashboard/Dashboard"));
const EodReport = React.lazy(() => import("../pages/attendance/EodReport"));
const TimeSheetDashboard = React.lazy(() =>
  import("../pages/attendance/TimeSheetDashboard")
);
const TaskBoard = React.lazy(() => import("../pages/task/TaskBoard"));
const InvoiceDashboard = React.lazy(() =>
  import("../pages/invoice/InvoiceDashboard")
);
const Login = React.lazy(() => import("../pages/Login"));
const Profile = React.lazy(() => import("../pages/Profile"));
const Settings = React.lazy(() => import("../pages/Settings"));
const CardMaster = React.lazy(() => import("../pages/CardMaster"));
const QuotationPage = React.lazy(() =>
  import("../pages/quotation/QuotationPage")
);
const QuotationForm = React.lazy(() =>
  import("../pages/quotation/QuotationForm")
);
const QuotationList = React.lazy(() =>
  import("../pages/quotation/QuotationList")
);
const InvoicePage = React.lazy(() => import("../pages/invoice/InvoicePage"));
const InvoiceForm = React.lazy(() => import("../pages/invoice/InvoiceForm"));
const InvoiceList = React.lazy(() => import("../pages/invoice/InvoiceList"));
const Leads = React.lazy(() => import("../pages/leads/Leads"));
const Customers = React.lazy(() => import("../pages/leads/Customers"));
const CustomerProfile = React.lazy(() =>
  import("../components/CustomerProfile")
);
const UserManagement = React.lazy(() =>
  import("../pages/user/UserManagement")
);
const DepartmentManagement = React.lazy(() =>
  import("../pages/user/DepartmentManagement")
);
const TeamManagement = React.lazy(() =>
  import("../pages/user/TeamManagement")
);
const CombinedManagement = React.lazy(() =>
  import("../pages/user/CombinedManagement")
);
const BrandService = React.lazy(() =>
  import("../pages/product/BrandService")
);
const ZoneView = React.lazy(() => import("../pages/leads/ZoneView"));

const WorkflowBuilder = React.lazy(() =>import("../pages/flow/WorkflowBuilder"));
const WorkflowListPage = React.lazy(() =>
  import("../pages/flow/WorkflowListPage")
);
const WorkflowViewPage = React.lazy(() =>
  import("../pages/flow/WorkflowViewPage")
);
const ProcessStepPage = React.lazy(() =>
  import("../pages/process/ProcessStepPage")
);

// ---------------------------------------------
// PROTECTED ROUTES
// ---------------------------------------------
export const appRoutes = [
  { path: "/dashboard", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><Dashboard/></RoleGuard> },

  { path: "/projects", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><ProjectManagement/></RoleGuard> },

  { path: "/project-track", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}><ProjectTracking/></RoleGuard> },

  { path: "/workingdays", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><AdminAttendance/></RoleGuard> },

  { path: "/apply-leave", element: <RoleGuard allowedRoles={['Admin','Superadmin','Employee','Team Leader']}><ApplyLeave/></RoleGuard> },

  { path: "/manage-leaves", element: <RoleGuard allowedRoles={['Admin','Superadmin','Team Leader']}><ManageLeaves/></RoleGuard> },

  { path: "/eodreport", element: <RoleGuard allowedRoles={['Admin','Superadmin']}><EodReport/></RoleGuard> },

  { path: "/master", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><CardMaster/></RoleGuard> },

  // Task Routes
  { path: "/taskboard", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><TaskBoard/></RoleGuard> },
  { path: "/content", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}><WeeklyReport/></RoleGuard> },
  { path: "/mycontent", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}><ClientReportPage/></RoleGuard> },
  { path: "/taskmanage", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><TaskBoard/></RoleGuard> },

  { path: "/chat", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><Chat/></RoleGuard> },

  { path: "/wallets", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><Credentials/></RoleGuard> },

  { path: "/attendance", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><TimeSheetDashboard/></RoleGuard> },

  { path: "/invoicedashboard", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}><InvoiceDashboard/></RoleGuard> },

  { path: "/profile", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><Profile/></RoleGuard> },

  { path: "/settings", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Employee','Team Leader']}><Settings/></RoleGuard> },

  { path: "/leads", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader','Employee']}><Leads/></RoleGuard> },

  { path: "/notifications", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader','Employee']}><NotificationPage/></RoleGuard> },

  { path: "/clients", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader','Employee']}><Customers/></RoleGuard> },

  { path: "/zone-view", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader','Employee']}><ZoneView/></RoleGuard> },

  { path: "/customers/:id", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader','Employee']}><CustomerProfile/></RoleGuard> },

  // Invoice
  { path: "/invoice", element: <RoleGuard allowedRoles={['Admin','Superadmin']}><InvoicePage/></RoleGuard> },
  { path: "/invoice/form", element: <RoleGuard allowedRoles={['Admin','Superadmin']}><InvoiceForm/></RoleGuard> },
  { path: "/invoice/list", element: <RoleGuard allowedRoles={['Admin','Superadmin']}><InvoiceList/></RoleGuard> },

  // Brand Service Page
  { path: "/service", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}><BrandService/></RoleGuard> },

  // Quotation
  { path: "/quotation", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}><QuotationPage/></RoleGuard> },
  { path: "/quotation/form", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}><QuotationForm/></RoleGuard> },
  { path: "/quotation/list", element: <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}><QuotationList/></RoleGuard> },

  // Management
  { path: "/management", element: <RoleGuard allowedRoles={['Superadmin','Client','Admin']}><CombinedManagement/></RoleGuard> },

  { path: "/dailyplan", element: <RoleGuard allowedRoles={['Superadmin','Client','Admin','Team Leader','Employee']}><Scheduler/></RoleGuard> },
  { path: "/holidays", element: <RoleGuard allowedRoles={['Superadmin','Client','Admin','Team Leader','Employee']}><PublicHolidayManager/></RoleGuard> },

  // { path: "/client-dashboard", element: <RoleGuard allowedRoles={['Superadmin','Client','Admin','Team Leader','Employee']}><ClientDashboard/></RoleGuard> },

  { path: "/subscriptions", element: <RoleGuard allowedRoles={['Superadmin','Client','Admin','Team Leader','Employee']}><Subscriptions/></RoleGuard> },
  { path: "/createsubscriptions", element: <RoleGuard allowedRoles={['Superadmin','Client','Admin','Team Leader','Employee']}><SubscriptionManagement/></RoleGuard> },
  { path: "/process-step", element: <RoleGuard allowedRoles={['Superadmin','Client','Admin','Team Leader','Employee']}><ProcessStepPage/></RoleGuard> },
  { path: "/client-dashboard", element: <RoleGuard allowedRoles={['Superadmin','Client',]}><ClientProjectDashboard/></RoleGuard> },

  // ⭐ WORKFLOW ROUTES ⭐ (with React Flow Provider)
  {
    path: "/workflow/:service_id/list",
    element: (
      <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}>
        <WorkflowListPage />
      </RoleGuard>
    ),
  },
  {
    path: "/workflow/:service_id/create",
    element: (
      <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}>
        <ReactFlowProvider>
          <WorkflowBuilder isEdit={false} />
        </ReactFlowProvider>
      </RoleGuard>
    ),
  },
  {
    path: "/workflow/edit/:workflow_id",
    element: (
      <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}>
        <ReactFlowProvider>
          <WorkflowBuilder isEdit={true} />
        </ReactFlowProvider>
      </RoleGuard>
    ),
  },
  {
    path: "/workflow/view/:workflow_id",
    element: (
      <RoleGuard allowedRoles={['Admin','Superadmin','Client','Team Leader']}>
        <ReactFlowProvider>
          <WorkflowViewPage />
        </ReactFlowProvider>
      </RoleGuard>
    ),
  },
];

// ---------------------------------------------
// PUBLIC ROUTES
// ---------------------------------------------
export const loginRoutes = [
  { path: "/login", element: <Login /> },
  { path: "/", element: <Login /> },
];
