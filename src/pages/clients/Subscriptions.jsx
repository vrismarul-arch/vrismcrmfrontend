import React, { useEffect, useState } from "react";
import {
  Spin,
  Tag,
  Alert,
  Empty,
  Table,
  Descriptions,
  Drawer,
  List,
  Button,
} from "antd";
import axios from "../../api/axios";
import "./SubscriptionPage.css";

const SubscriptionPage = () => {
  const [business, setBusiness] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  const fetchData = async () => {
    try {
      const businessId =
        user?.businessAccount?._id || user?.businessAccount;

      if (!businessId) throw new Error("No BusinessAccount");

      const accRes = await axios.get(`/api/accounts/${businessId}`);
      setBusiness(accRes.data);

      const subRes = await axios.get(`/api/subscriptions/${businessId}`);
      setSubscriptions(subRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, []);

  const fetchSubscriptionDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await axios.get(`/api/subscriptions/details/${id}`);
      setDetails(res.data);
      setDrawerOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const columns = [
    {
      title: "Status",
      dataIndex: "status",
      render: (s) => (
        <Tag color={s === "active" ? "green" : "red"}>
          {s?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Service",
      render: (_, r) => r?.service?.serviceName || "-",
    },
    { title: "Plan", dataIndex: "planName" },
    { title: "Billing", dataIndex: "billingCycle" },
    {
      title: "Renewal",
      dataIndex: "renewalDate",
      render: (v) => (v ? new Date(v).toLocaleDateString() : "-"),
    },
    {
      title: "Amount",
      render: (_, r) => `₹${r.totalWithGST}`,
    },
    {
      title: "Action",
      render: (_, r) => (
        <Button
          size="small"
          type="primary"
          onClick={() => fetchSubscriptionDetails(r._id)}
        >
          View
        </Button>
      ),
    },
  ];

  if (loading)
    return (
      <div className="center">
        <Spin size="large" />
      </div>
    );

  if (!business)
    return <Alert type="error" message="No Business Account Linked" />;

  return (
    <div className="subscription-page">
      <h2>My Subscription</h2>

      {/* BUSINESS DETAILS */}
      <div className="business-box">
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Business Name">
            {business.businessName || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Phone">
            {business.contactNumber || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            {business.contactEmail || "-"}
          </Descriptions.Item>
        </Descriptions>
      </div>

      {/* DESKTOP TABLE */}
            <h2>Plan Details</h2>

      <div className="desktop-only">
        {subscriptions.length === 0 ? (
          <Empty />
        ) : (
          <Table
            columns={columns}
            dataSource={subscriptions}
            rowKey="_id"
            pagination={false}
          />
        )}
      </div>

      {/* MOBILE DIV VIEW */}
      <div className="mobile-only">
        {subscriptions.length === 0 ? (
          <Empty />
        ) : (
          subscriptions.map((s) => (
            <div key={s._id} className="mobile-subscription">
              <div className="row">
                <span>Status</span>
                <Tag color={s.status === "active" ? "green" : "red"}>
                  {s.status}
                </Tag>
              </div>

              <div className="row">
                <span>Service</span>
                <b>{s?.service?.serviceName || "-"}</b>
              </div>

              <div className="row">
                <span>Plan</span>
                <b>{s.planName}</b>
              </div>

              <div className="row">
                <span>Billing</span>
                <b>{s.billingCycle}</b>
              </div>

              <div className="row">
                <span>Renewal</span>
                <b>
                  {s.renewalDate
                    ? new Date(s.renewalDate).toLocaleDateString()
                    : "-"}
                </b>
              </div>

              <div className="row">
                <span>Total</span>
                <b>₹{s.totalWithGST}</b>
              </div>

              <Button
                block
                type="primary"
                onClick={() => fetchSubscriptionDetails(s._id)}
              >
                View Details
              </Button>
            </div>
          ))
        )}
      </div>

      {/* DETAILS DRAWER */}
      <Drawer
        title="Subscription Details"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={window.innerWidth < 768 ? "100%" : 480}
      >
        {loadingDetails || !details ? (
          <Spin />
        ) : (
          <>
            <h3>Features Included</h3>
            <List
              bordered
              dataSource={details.planFeatures || []}
              renderItem={(f) => <List.Item>{f?.name}</List.Item>}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default SubscriptionPage;
