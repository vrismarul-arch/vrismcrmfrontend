import React, { useEffect, useState } from "react";
import {
  Drawer,
  Form,
  Input,
  Select,
  Row,
  Col,
  Button,
  message,
  Card,
  Typography,
  Switch,
  TimePicker,
  Upload
} from "antd";
import { InboxOutlined } from "@ant-design/icons";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import axios from "../../api/axios";
import { uploadFile } from "../../utils/fileStorage";
import "./TaskForm.css";

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { Dragger } = Upload;

/* ---------- FILE TYPES ---------- */
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp"
];

const TaskForm = ({ visible, onClose, editing, onSaved }) => {
  const [form] = Form.useForm();

  /* ---------- CURRENT USER ---------- */
  const currentUser =
    JSON.parse(localStorage.getItem("user")) || {
      _id: "temp",
      role: "Employee",
      name: "You"
    };

  const canAssign = ["Admin", "TeamLead", "SuperAdmin", "Superadmin"].includes(
    currentUser.role
  );

  /* ---------- STATE ---------- */
  const [allUsers, setAllUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [services, setServices] = useState([]);

  const [assignedDate, setAssignedDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(moment().add(1, "days").toDate());
  const [startTime, setStartTime] = useState(moment("09:00", "HH:mm"));

  const [saving, setSaving] = useState(false);
  const [fileList, setFileList] = useState([]);

  /* ---------- NOTES (NEW – ONLY ADDITION) ---------- */
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  /* ---------- LOAD MASTER DATA ---------- */
  useEffect(() => {
    const loadAll = async () => {
      const u = await axios.get("/api/users");
      const a = await axios.get("/api/accounts");
      const s = await axios.get("/api/service");

      setAllUsers(u.data || []);
      setAccounts(a.data || []);
      setServices(s.data || []);
    };
    loadAll();
  }, []);

  /* ---------- LOAD FORM ---------- */
  useEffect(() => {
    form.resetFields();

    if (editing) {
      form.setFieldsValue({
        title: editing.title,
        description: editing.description,
        reason: editing.reason,
        assignedTo: editing.assignedTo?.map(u => u._id) || [],
        status: editing.status,
        isImportant: editing.isImportant || false,
        extraAttachment: editing.extraAttachment?.[0] || "",
        accountId: editing.accountId || undefined,
        serviceId: editing.serviceId || undefined
      });

      setAssignedDate(new Date(editing.assignedDate));
      setDueDate(new Date(editing.dueDate));
      setStartTime(
        editing.startTime
          ? moment(editing.startTime, "HH:mm")
          : moment("09:00", "HH:mm")
      );
    } else {
      form.setFieldsValue({
        assignedTo: [currentUser._id],
        status: "To Do",
        isImportant: false
      });

      setAssignedDate(new Date());
      setDueDate(moment().add(1, "days").toDate());
      setStartTime(moment("09:00", "HH:mm"));
    }
  }, [editing, visible]);

  /* ---------- FILE VALIDATION ---------- */
  const beforeUpload = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      message.error("Only PDF, DOC, DOCX or image files allowed");
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  /* ---------- SAVE TASK ---------- */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const uploadedFiles = [];
      for (const file of fileList) {
        const res = await uploadFile(file.originFileObj);
        if (res?.url) uploadedFiles.push(res.url);
      }

      const payload = {
        ...values,
        assignedBy: editing ? editing.assignedBy?._id : currentUser._id,
        assignedDate: moment.utc(assignedDate).startOf("day").toISOString(),
        dueDate: moment.utc(dueDate).startOf("day").toISOString(),
        startTime: startTime.format("HH:mm"),
        extraAttachment: values.extraAttachment
          ? [values.extraAttachment]
          : [],
        attachments: uploadedFiles
      };

      if (editing) {
        await axios.put(`/api/tasks/${editing._id}`, payload);
        message.success("Task updated");
      } else {
        await axios.post("/api/tasks", payload);
        message.success("Task created");
      }

      setFileList([]);
      onSaved();
      onClose();
    } catch {
      message.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* ================= RENDER ================= */
  return (
    <Drawer
      title={editing ? "Edit Task" : "Create Task"}
      width={720}
      open={visible}
      onClose={onClose}
      destroyOnClose
      footer={
        <div style={{ textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            {editing ? "Update Task" : "Create Task"}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">

        {/* ================= BASIC ================= */}
        <Card className="zoho-section-card">
          <Title level={5}>Basic Information</Title>

          <Form.Item
            name="title"
            label="Task Title"
            rules={[{ required: true, message: "Task title required" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item name="isImportant" label="Mark Important">
            <Switch />
          </Form.Item>
        </Card>

        {/* ================= ADDITIONAL ================= */}
        <Card className="zoho-section-card">
          <Title level={5}>Additional Details</Title>

          <Form.Item name="reason" label="Reason">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item label="Start Time">
            <TimePicker
              value={startTime}
              use12Hours
              format="hh:mm A"
              style={{ width: "100%" }}
              onChange={setStartTime}
            />
          </Form.Item>

          <Form.Item name="extraAttachment" label="Attachment URL">
            <Input />
          </Form.Item>

          <Form.Item label="Upload Files">
            <Dragger
              multiple
              beforeUpload={beforeUpload}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
            >
              <InboxOutlined />
              <p>Drag & drop files here</p>
            </Dragger>
          </Form.Item>
        </Card>

        {/* ================= ACCOUNT ================= */}
        <Card className="zoho-section-card">
          <Title level={5}>Account & Service</Title>

          <Form.Item name="accountId" label="Account">
            <Select allowClear>
              {accounts.map(a => (
                <Option key={a._id} value={a._id}>
                  {a.businessName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="serviceId" label="Service">
            <Select allowClear>
              {services.map(s => (
                <Option key={s._id} value={s._id}>
                  {s.serviceName}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Card>

        {/* ================= ASSIGN ================= */}
        <Card className="zoho-section-card">
          <Title level={5}>Assignment</Title>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignedTo"
                label="Assign To"
                rules={[{ required: true }]}
              >
                <Select mode="multiple" disabled={!canAssign}>
                  {allUsers.map(u => (
                    <Option key={u._id} value={u._id}>
                      {u.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Select>
                  <Option value="To Do">To Do</Option>
                  <Option value="In Progress">In Progress</Option>
                  <Option value="Review">Review</Option>
                  <Option value="Completed">Completed</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ================= DATES ================= */}
        <Card className="zoho-section-card">
          <Title level={5}>Dates</Title>

          <Row gutter={16}>
            <Col span={12}>
              <DatePicker selected={assignedDate} onChange={setAssignedDate} />
            </Col>
            <Col span={12}>
              <DatePicker selected={dueDate} onChange={setDueDate} />
            </Col>
          </Row>

          <Text>
            Assigned By:{" "}
            <b>{editing ? editing.assignedBy?.name : currentUser.name}</b>
          </Text>
        </Card>

        {/* ================= NOTES HISTORY (NEW) ================= */}
        {editing && (
          <Card className="zoho-section-card">
            <Title level={5}>Reason / Notes History</Title>

            <TextArea
              rows={3}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add note"
            />

            <Button
              type="primary"
              disabled={!noteText.trim()}
              loading={addingNote}
              style={{ marginTop: 8 }}
              onClick={async () => {
                try {
                  setAddingNote(true);
                  await axios.put(
                    `/api/tasks/${editing._id}/add-note`,
                    { text: noteText }
                  );
                  setNoteText("");
                  onSaved();
                } finally {
                  setAddingNote(false);
                }
              }}
            >
              Add Note
            </Button>

            <div style={{ marginTop: 16 }}>
              {editing.reasonHistory?.length ? (
                editing.reasonHistory
                  .slice()
                  .reverse()
                  .map((n, i) => (
                    <Card key={i} size="small">
                      <Text strong>{n.addedBy?.name}</Text>
                      <br />
                      <Text type="secondary">
                        {moment(n.createdAt).format("DD MMM YYYY hh:mm A")}
                      </Text>
                      <p>{n.text}</p>
                    </Card>
                  ))
              ) : (
                <Text type="secondary">No notes yet</Text>
              )}
            </div>
          </Card>
        )}

      </Form>
    </Drawer>
  );
};

export default TaskForm;
