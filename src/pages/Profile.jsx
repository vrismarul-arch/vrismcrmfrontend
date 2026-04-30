// components/Profile.js (Updated with DOB field)

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Avatar,
  Button,
  Typography,
  Divider,
  Space,
  Tag,
  Row,
  Col,
  Spin,
  Modal,
  Alert,
  Form,
  Input,
  Select,
  Drawer,
  Popconfirm,
  Image,
  Upload,
  DatePicker,
} from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  ReloadOutlined,
  SaveOutlined,
  DeleteOutlined,
  UploadOutlined,
  CalendarOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import axios from "../api/axios";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { uploadFile } from "../utils/fileStorage";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [form] = Form.useForm();

  const [isImageRemoving, setIsImageRemoving] = useState(false);
  const [profileImageURL, setProfileImageURL] = useState(null);
  const [isBirthday, setIsBirthday] = useState(false);

  const getCurrentUserId = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser._id;
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        localStorage.removeItem("user");
        return null;
      }
    }
    return null;
  };

  const checkBirthday = (dob) => {
    if (!dob) return false;
    const today = new Date();
    const birthDate = new Date(dob);
    return today.getDate() === birthDate.getDate() && 
           today.getMonth() === birthDate.getMonth();
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fetchUserDetails = async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      setLoading(false);
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/users/${userId}`);
      setUser(response.data);
      setProfileImageURL(response.data.profileImage);
      setIsBirthday(checkBirthday(response.data.dob));
      localStorage.setItem("user", JSON.stringify(response.data));
    } catch (error) {
      console.error("Error fetching user details:", error);
      setError("Failed to load user profile.");

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setProfileImageURL(parsedUser.profileImage);
          setIsBirthday(checkBirthday(parsedUser.dob));
          toast.error("Failed to fetch latest data. Using cached profile.");
        } catch (e) {
          localStorage.removeItem("user");
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [navigate]);

  const handleLogout = () => {
    Modal.confirm({
      title: "Confirm Logout",
      content: "Are you sure you want to logout?",
      okText: "Yes, Logout",
      cancelText: "Cancel",
      okType: "danger",
      onOk: () => {
        localStorage.removeItem("user");
        navigate("/login");
      },
    });
  };

  const getStatusColor = (status) =>
    status?.toLowerCase() === "active" ? "success" : "error";

  const getStatusIcon = (status) =>
    status?.toLowerCase() === "active" ? (
      <CheckCircleOutlined />
    ) : (
      <CloseCircleOutlined />
    );

  const getRoleColor = (role) => {
    const colors = {
      superadmin: "red",
      admin: "blue",
      employee: "green",
      user: "green",
      manager: "orange",
      moderator: "purple",
    };
    return colors[role?.toLowerCase()] || "default";
  };

  const handleRefresh = () => {
    fetchUserDetails();
  };

  const openEditDrawer = () => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        mobile: user.mobile || "",
        role: user.role,
        status: user.status,
        dob: user.dob ? dayjs(user.dob) : null,
      });
      setProfileImageURL(user.profileImage);
      setEditDrawerOpen(true);
    } else {
      toast.error("User data not loaded yet. Please try refreshing.");
    }
  };

  const updateProfileData = async (data) => {
    try {
      setUpdating(true);
      const response = await axios.put(`/api/users/${user._id}`, data);

      setUser(response.data);
      setProfileImageURL(response.data.profileImage);
      setIsBirthday(checkBirthday(response.data.dob));
      localStorage.setItem("user", JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile.");
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const values = await form.validateFields();
      if (!values.password) delete values.password;
      
      // Format DOB properly
      if (values.dob) {
        values.dob = values.dob.toISOString();
      } else {
        values.dob = null;
      }
      
      const updatePayload = {
        ...values,
        profileImage: profileImageURL,
      };

      await updateProfileData(updatePayload);

      toast.success("Profile updated successfully!");
      setEditDrawerOpen(false);
    } catch (error) {
      // Error already handled
    }
  };

  const handleImageUpload = async ({ file, onSuccess, onError }) => {
    toast.loading("Uploading image...", { id: "avatar-upload" });
    try {
      const res = await uploadFile(file);
      if (!res?.url) {
        toast.error("Upload failed!", { id: "avatar-upload" });
        onError("Upload failed");
        return;
      }
      
      const updatedUser = await updateProfileData({ profileImage: res.url });
      setProfileImageURL(updatedUser.profileImage);

      toast.success("Profile photo updated!", { id: "avatar-upload" });
      onSuccess(res.url, file);

    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed!", { id: "avatar-upload" });
      onError(err);
    }
  };

  const handleRemoveImage = async () => {
    setIsImageRemoving(true);
    toast.loading("Removing image...", { id: "remove-avatar" });
    try {
      await updateProfileData({ profileImage: null });
      setProfileImageURL(null);
      toast.success("Profile photo removed!", { id: "remove-avatar" });
    } catch (err) {
      // Error handled by updateProfileData
    } finally {
      setIsImageRemoving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", minHeight: "60vh", alignItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <Alert message="No User Data" description="Could not load user profile." type="error" showIcon />
        <Button onClick={() => navigate("/login")} style={{ marginTop: "20px" }}>Go to Login</Button>
      </div>
    );
  }

  const userAge = calculateAge(user.dob);

  return (
    <div style={{ minHeight: "100vh", padding: "40px 20px", background: "#f5f5f5" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Birthday Banner */}
        {isBirthday && (
          <Alert
            message={
              <Space>
                <GiftOutlined style={{ fontSize: 20 }} />
                <span>🎉 Happy Birthday, {user.name}! 🎂</span>
              </Space>
            }
            description="Wishing you a fantastic day filled with joy and celebration!"
            type="success"
            showIcon
            closable
            style={{ marginBottom: "24px", borderRadius: "12px" }}
          />
        )}
        
        {/* Header Card */}
        <Card style={{ marginBottom: "24px", borderRadius: "16px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
          <Row align="middle" gutter={24}>
            <Col>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                {user.profileImage ? (
                  <Image.PreviewGroup items={[user.profileImage]}>
                    <Image
                      alt={`${user.name}'s profile`}
                      width={80}
                      height={80}
                      src={user.profileImage}
                      style={{ 
                        borderRadius: '50%', 
                        objectFit: 'cover', 
                        border: isBirthday ? '3px solid #ffd700' : '2px solid #0E2B43' 
                      }}
                    />
                  </Image.PreviewGroup>
                ) : (
                  <Avatar
                    size={80}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: "#0E2B43", fontSize: "32px" }}
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : null}
                  </Avatar>
                )}
                {isBirthday && (
                  <div style={{ position: 'absolute', bottom: -5, right: -5 }}>
                    <GiftOutlined style={{ fontSize: 24, color: "#ffd700" }} />
                  </div>
                )}
              </div>
            </Col>

            <Col flex="auto">
              <Title level={2} style={{ margin: 0, color: "#0E2B43" }}>
                {user.name}
                {isBirthday && <Tag color="gold" style={{ marginLeft: 12 }}>🎂 Birthday Today!</Tag>}
              </Title>
              <Text type="secondary" style={{ fontSize: "16px" }}>
                Welcome back to your profile
              </Text>
            </Col>

            <Col>
              <Space wrap>
                <Button
                  type="default"
                  icon={<ReloadOutlined />}
                  size="large"
                  onClick={handleRefresh}
                  style={{ borderRadius: "8px" }}
                />
                <Button
                  type="default"
                  icon={<EditOutlined />}
                  size="large"
                  onClick={openEditDrawer}
                  style={{ borderRadius: "8px" }}
                >
                  Edit Profile
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Profile Details Card */}
        <Card
          title={
            <Space>
              <IdcardOutlined />
              <span>Profile Information</span>
            </Space>
          }
          style={{
            borderRadius: "16px",
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
          }}
        >
          <Row gutter={[24, 24]}>
            {/* Full Name */}
            <Col xs={24} sm={12}>
              <div>
                <Text strong style={{ color: "#666", fontSize: "14px", display: "block", marginBottom: "4px" }}>
                  FULL NAME
                </Text>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <UserOutlined style={{ marginRight: "8px", color: "#0E2B43" }} />
                  <Text style={{ fontSize: "16px" }}>{user.name}</Text>
                </div>
              </div>
            </Col>

            {/* Email Address */}
            <Col xs={24} sm={12}>
              <div>
                <Text strong style={{ color: "#666", fontSize: "14px", display: "block", marginBottom: "4px" }}>
                  EMAIL ADDRESS
                </Text>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <MailOutlined style={{ marginRight: "8px", color: "#52c41a" }} />
                  <Text style={{ fontSize: "16px" }}>{user.email}</Text>
                </div>
              </div>
            </Col>

            {/* Mobile Number */}
            <Col xs={24} sm={12}>
              <div>
                <Text strong style={{ color: "#666", fontSize: "14px", display: "block", marginBottom: "4px" }}>
                  MOBILE NUMBER
                </Text>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <PhoneOutlined style={{ marginRight: "8px", color: user.mobile ? "#52c41a" : "#999" }} />
                  <Text style={{ fontSize: "16px" }}>
                    {user.mobile || "Not provided"}
                  </Text>
                </div>
              </div>
            </Col>

            {/* Date of Birth - NEW */}
            <Col xs={24} sm={12}>
              <div>
                <Text strong style={{ color: "#666", fontSize: "14px", display: "block", marginBottom: "4px" }}>
                  DATE OF BIRTH
                </Text>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <CalendarOutlined style={{ marginRight: "8px", color: "#faad14" }} />
                  <Text style={{ fontSize: "16px" }}>
                    {user.dob ? dayjs(user.dob).format("DD MMM YYYY") : "Not provided"}
                  </Text>
                  {userAge && (
                    <Tag color="cyan" style={{ marginLeft: 8 }}>
                      Age: {userAge} years
                    </Tag>
                  )}
                </div>
              </div>
            </Col>

            {/* Role */}
            <Col xs={24} sm={12}>
              <div>
                <Text strong style={{ color: "#666", fontSize: "14px", display: "block", marginBottom: "4px" }}>
                  ROLE
                </Text>
                <div style={{ marginTop: "4px" }}>
                  <Tag
                    icon={<CrownOutlined />}
                    color={getRoleColor(user.role)}
                    style={{
                      fontSize: "14px",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      textTransform: "capitalize",
                    }}
                  >
                    {user.role}
                  </Tag>
                </div>
              </div>
            </Col>

            {/* Status */}
            <Col xs={24} sm={12}>
              <div>
                <Text strong style={{ color: "#666", fontSize: "14px", display: "block", marginBottom: "4px" }}>
                  STATUS
                </Text>
                <div style={{ marginTop: "4px" }}>
                  <Tag
                    icon={getStatusIcon(user.status)}
                    color={getStatusColor(user.status)}
                    style={{
                      fontSize: "14px",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      textTransform: "capitalize",
                    }}
                  >
                    {user.status}
                  </Tag>
                </div>
              </div>
            </Col>
          </Row>

          <Divider />

          <div style={{ textAlign: "center", paddingTop: "16px" }}>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: "14px" }}>
                Profile last updated:{" "}
                {user.updatedAt
                  ? new Date(user.updatedAt).toLocaleString()
                  : new Date().toLocaleDateString()}
              </Text>
            </Space>
          </div>
        </Card>

        {/* Edit Profile Drawer */}
        <Drawer
          title={
            <Space>
              <EditOutlined />
              <span>Edit Profile</span>
            </Space>
          }
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          width={480}
          destroyOnClose
          extra={
            <Space>
              <Button onClick={() => setEditDrawerOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ backgroundColor: '#0E2B43', borderColor: '#0E2B43', color: 'white' }}
                icon={<SaveOutlined />}
                loading={updating}
                onClick={handleUpdateProfile}
              >
                Save Changes
              </Button>
            </Space>
          }
        >
          <Form form={form} layout="vertical">
            {/* Profile Image Field */}
            <Form.Item label="Profile Picture">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                {profileImageURL ? (
                  <div style={{ position: 'relative' }}>
                    <Image
                      src={profileImageURL}
                      alt="Profile"
                      width={100}
                      height={100}
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <Popconfirm
                      title="Are you sure to remove your profile picture?"
                      onConfirm={handleRemoveImage}
                      okText="Yes"
                      cancelText="No"
                      placement="right"
                    >
                      <Button
                        type="primary"
                        danger
                        shape="circle"
                        icon={<DeleteOutlined />}
                        size="small"
                        loading={isImageRemoving}
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          zIndex: 1,
                        }}
                      />
                    </Popconfirm>
                  </div>
                ) : (
                  <Avatar size={100} icon={<UserOutlined />} style={{ backgroundColor: "#0E2B43", fontSize: "40px" }} />
                )}
                
                <Upload 
                  customRequest={handleImageUpload} 
                  showUploadList={false} 
                  accept="image/*"
                >
                  <Button 
                    icon={<UploadOutlined />} 
                    style={{ marginLeft: '20px' }}
                    size="large"
                  >
                    {profileImageURL ? "Change Photo" : "Upload Photo"}
                  </Button>
                </Upload>
              </div>
            </Form.Item>

            <Divider orientation="left" style={{ margin: '0 0 24px 0' }}>Basic Info</Divider>

            <Form.Item
              name="name"
              label="Full Name"
              rules={[
                { required: true, message: "Please enter full name" },
                { min: 2, message: "Name must be at least 2 characters" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter full name"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: "Please enter email address" },
                { type: "email", message: "Please enter a valid email" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Enter email address"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="mobile"
              label="Mobile Number"
              rules={[
                {
                  pattern: /^[0-9]{10}$/,
                  message: "Please enter a valid 10-digit mobile number",
                },
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="Enter mobile number"
                size="large"
              />
            </Form.Item>

            {/* Date of Birth Field - NEW */}
            <Form.Item
              name="dob"
              label="Date of Birth"
              rules={[
                {
                  validator: async (_, value) => {
                    if (value) {
                      const age = new Date().getFullYear() - value.year();
                      if (age < 18) {
                        throw new Error("You must be at least 18 years old");
                      }
                      if (age > 100) {
                        throw new Error("Invalid age");
                      }
                    }
                  },
                },
              ]}
            >
              <DatePicker
                style={{ width: "100%" }}
                size="large"
                format="DD MMM YYYY"
                placeholder="Select date of birth"
                disabledDate={(current) => {
                  return current && current > dayjs().endOf('day');
                }}
                suffixIcon={<CalendarOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="New Password (Optional)"
              rules={[
                { min: 6, message: "Password must be at least 6 characters" },
              ]}
            >
              <Input.Password
                placeholder="Leave blank to keep current password"
                size="large"
              />
            </Form.Item>

            <Divider orientation="left" style={{ margin: '24px 0' }}>Access Control</Divider>

            <Form.Item name="role" label="Role">
              <Select
                placeholder="Select role"
                size="large"
                disabled={user?.role?.toLowerCase() !== "superadmin"}
                suffixIcon={<CrownOutlined />}
              >
                <Select.Option value="Superadmin">
                  <Space>
                    <CrownOutlined style={{ color: "#ff4d4f" }} />
                    <span>Superadmin</span>
                  </Space>
                </Select.Option>
                <Select.Option value="Admin">
                  <Space>
                    <CrownOutlined style={{ color: "#0E2B43" }} />
                    <span>Admin</span>
                  </Space>
                </Select.Option>
                <Select.Option value="Employee">
                  <Space>
                    <CrownOutlined style={{ color: "#52c41a" }} />
                    <span>Employee</span>
                  </Space>
                </Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="status" label="Status">
              <Select
                placeholder="Select status"
                size="large"
                disabled={user?.role?.toLowerCase() !== "superadmin"}
              >
                <Select.Option value="Active">
                  <Space>
                    <CheckCircleOutlined style={{ color: "#52c41a" }} />
                    <span>Active</span>
                  </Space>
                </Select.Option>
                <Select.Option value="Inactive">
                  <Space>
                    <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                    <span>Inactive</span>
                  </Space>
                </Select.Option>
              </Select>
            </Form.Item>

            <Alert
              message="Access Control"
              description={
                user?.role?.toLowerCase() !== "superadmin"
                  ? "Your **Role** and **Status** fields are locked and can only be changed by a **Superadmin** user."
                  : "As a **Superadmin**, you can update all profile fields including role and status."
              }
              type="info"
              showIcon
              style={{ marginTop: "16px" }}
            />
          </Form>
        </Drawer>
      </div>
    </div>
  );
};

export default Profile;