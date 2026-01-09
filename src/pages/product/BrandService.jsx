// src/pages/BrandService/BrandService.jsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Layout,
  Tabs,
  Popconfirm,
  Tag,
  Tooltip,
  Drawer,
  Collapse,
  Descriptions,
  Space,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  AppstoreAddOutlined,
  BranchesOutlined,
} from "@ant-design/icons";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import BrandServiceForm from "./BrandServiceForm";
import NotesDrawer from "./ServiceNotesDrawer";
import ServicePlanDrawer from "./ServicePlanDrawer";
import { useNavigate } from "react-router-dom";

const { Content, Header } = Layout;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const BrandService = () => {
  const [services, setServices] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [viewingService, setViewingService] = useState(null);
  const [notesVisible, setNotesVisible] = useState(false);
  const [plansVisible, setPlansVisible] = useState(false);

  const navigate = useNavigate();

  // Load Service List
  const fetchServices = async () => {
    try {
      const { data } = await axios.get("/api/service");
      setServices(data);
    } catch (err) {
      toast.error("Failed to load Services");
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSave = () => fetchServices();

  const getColumns = () => [
    { title: "S.No", render: (_, __, i) => i + 1, width: 60 },
    { title: "Name", dataIndex: "serviceName", width: 180 },

    {
      title: "Status",
      width: 100,
      render: (_, rec) =>
        rec.isActive ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },

    {
      title: "Plans",
      width: 200,
      render: (_, rec) =>
        rec.plans?.length ? (
          <Space wrap>
            {rec.plans.slice(0, 3).map((p) => (
              <Tag key={p._id}>{p.name}</Tag>
            ))}
            {rec.plans.length > 3 && (
              <Tag>+{rec.plans.length - 3 } more</Tag>
            )}
          </Space>
        ) : (
          <Tag>No Plans</Tag>
        ),
    },

    {
      title: "Actions",
      width: 350,
      render: (_, rec) => (
        <Space>
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} onClick={() => setViewingService(rec)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingService(rec);
                setDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Notes">
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={() => {
                setEditingService(rec);
                setNotesVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Plans">
            <Button
              type="text"
              icon={<AppstoreAddOutlined />}
              onClick={() => {
                setEditingService(rec);
                setPlansVisible(true);
              }}
            />
          </Tooltip>

          {/* ⭐ Workflow Button Added ⭐ */}
          <Tooltip title="Workflow Builder">
            <Button
              type="text"
              icon={<BranchesOutlined style={{ color: "#0E2B43" }} />}
              onClick={() =>
                navigate(`/workflow/${rec.service_id}/list`)
              }
              style={{ fontWeight: 600, color: "#0E2B43" }}
            >
              Flow
            </Button>
          </Tooltip>

          <Popconfirm
            title="Delete service?"
            onConfirm={async () => {
              await axios.delete(`/api/service/${rec._id}`);
              fetchServices();
              toast.success("Service deleted");
            }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <Header style={{ background: "#fff", padding: "12px 20px" }}>
        <h2 style={{ marginBottom: 0 }}>Brand Service Management</h2>
      </Header>

      <Content style={{ padding: 20 }}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="Active Services" key="1">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ marginBottom: 16, background: "#0E2B43", borderColor: "#0E2B43" }}
              onClick={() => {
                setEditingService(null);
                setDrawerVisible(true);
              }}
            >
              Add Service
            </Button>

            <Table
              columns={getColumns()}
              dataSource={services.filter((s) => s.isActive)}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1100 }}
            />
          </TabPane>

          <TabPane tab="Inactive Services" key="2">
            <Table
              columns={getColumns()}
              dataSource={services.filter((s) => !s.isActive)}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1100 }}
            />
          </TabPane>
        </Tabs>

        {/* Service Create/Edit Drawer */}
        <BrandServiceForm
          visible={drawerVisible}
          onClose={() => {
            setEditingService(null);
            setDrawerVisible(false);
          }}
          onSave={handleSave}
          initialValues={editingService}
        />

        {/* View Drawer */}
        <Drawer
          open={!!viewingService}
          title="Service Details"
          onClose={() => setViewingService(null)}
          width={700}
        >
          {viewingService && (
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Service ID">{viewingService.service_id}</Descriptions.Item>
              <Descriptions.Item label="Name">{viewingService.serviceName}</Descriptions.Item>
              <Descriptions.Item label="Description">{viewingService.description}</Descriptions.Item>
              <Descriptions.Item label="Status">
                {viewingService.isActive ? "Active" : "Inactive"}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>

        {/* Notes Drawer */}
        {editingService && (
          <NotesDrawer
            visible={notesVisible}
            onClose={() => setNotesVisible(false)}
            service={editingService}
            refreshServices={fetchServices}
          />
        )}

        {/* Plans Drawer */}
        {editingService && (
          <ServicePlanDrawer
            visible={plansVisible}
            onClose={() => setPlansVisible(false)}
            service={editingService}
            refreshServices={fetchServices}
          />
        )}
      </Content>
    </Layout>
  );
};

export default BrandService;
