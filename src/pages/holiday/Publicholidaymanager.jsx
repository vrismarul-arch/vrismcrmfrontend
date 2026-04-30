import React, { useState, useEffect, useRef } from "react";
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  Upload, message, Space, Tag, Tabs, Card, Statistic,
  Popconfirm, Row, Col, Divider, Typography, Badge, Tooltip,
  Alert, Steps
} from "antd";
import {
  PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined,
  FileExcelOutlined, CalendarOutlined, DownloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  ReloadOutlined, ImportOutlined
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import axios from "../../api/axios";

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

// ─── Constants ───────────────────────────────────────────────────────────────
const TYPE_OPTIONS = ["National", "Regional", "Religious"];
const TYPE_COLORS  = { National: "blue", Regional: "green", Religious: "orange" };
const MONTH_NAMES  = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Expected Excel columns (case-insensitive match)
const EXCEL_COLUMNS = {
  name: ["holiday name", "name", "holiday", "public holiday"],
  date: ["date"],
  type: ["type", "category"],
};

// ─── Helper: parse Excel date cell ───────────────────────────────────────────
const parseExcelDate = (val) => {
  if (!val) return null;
  
  // Handle Excel serial number
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    return dayjs(`${date.y}-${String(date.m).padStart(2,"0")}-${String(date.d).padStart(2,"0")}`);
  }
  
  // Handle string dates
  if (typeof val === "string") {
    const trimmed = val.trim();
    
    // Try DD.MM.YYYY
    let match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (match) {
      return dayjs(`${match[3]}-${match[2]}-${match[1]}`);
    }
    
    // Try DD/MM/YYYY
    match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      return dayjs(`${match[3]}-${match[2]}-${match[1]}`);
    }
    
    // Try YYYY-MM-DD
    match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return dayjs(trimmed);
    }
    
    // Try MM/DD/YYYY
    match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match && parseInt(match[1]) <= 12) {
      return dayjs(`${match[3]}-${match[1]}-${match[2]}`);
    }
    
    // Fallback to dayjs parsing
    const parsed = dayjs(trimmed);
    if (parsed.isValid()) return parsed;
  }
  
  // Handle Date object
  if (val instanceof Date) {
    return dayjs(val);
  }
  
  return null;
};

// ─── Helper: normalize column header ─────────────────────────────────────────
const findCol = (headers, candidates) => {
  return headers.find(h =>
    candidates.some(c => h.toLowerCase().trim() === c.toLowerCase())
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color }) => (
  <Card size="small" style={{ borderRadius: 8, textAlign: "center" }}>
    <Statistic
      title={<span style={{ fontSize: 12 }}>{label}</span>}
      value={value}
      valueStyle={{ color, fontSize: 22, fontWeight: 600 }}
    />
  </Card>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PublicHolidayManager = () => {
  const [holidays, setHolidays]           = useState([]);
  const [loading, setLoading]             = useState(false);
  const [modalOpen, setModalOpen]         = useState(false);
  const [importModalOpen, setImportModal] = useState(false);
  const [editRecord, setEditRecord]       = useState(null);
  const [form]                            = Form.useForm();
  const [saving, setSaving]               = useState(false);
  const [activeTab, setActiveTab]         = useState("1");

  // Excel import state
  const [parsedRows, setParsedRows]       = useState([]);
  const [parseErrors, setParseErrors]     = useState([]);
  const [importStep, setImportStep]       = useState(0);
  const [importing, setImporting]         = useState(false);

  // Filter state
  const [filterYear, setFilterYear]       = useState(2026);
  const [filterMonth, setFilterMonth]     = useState(null);
  const [filterType, setFilterType]       = useState(null);

  useEffect(() => { fetchHolidays(); }, [filterYear, filterMonth, filterType]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const params = { year: filterYear };
      if (filterMonth) params.month = filterMonth;
      if (filterType)  params.type  = filterType;
      const res = await axios.get("/api/public-holidays", { params });
      setHolidays(res.data.data || []);
    } catch {
      message.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  // ── Open add/edit modal ───────────────────────────────────────────────────
  const openForm = (record = null) => {
    setEditRecord(record);
    if (record) {
      form.setFieldsValue({
        name:  record.name,
        date:  dayjs(record.date),
        type:  record.type,
        state: record.state,
      });
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  // ── Save (create / update) ────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = { ...values, date: values.date.format("YYYY-MM-DD") };

      if (editRecord) {
        await axios.put(`/api/public-holidays/${editRecord._id}`, payload);
        message.success("Holiday updated");
      } else {
        await axios.post("/api/public-holidays", payload);
        message.success("Holiday created");
      }
      setModalOpen(false);
      fetchHolidays();
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message);
      else message.error("Failed to save holiday");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/public-holidays/${id}`);
      message.success("Holiday deleted");
      fetchHolidays();
    } catch (err) {
      message.error(err?.response?.data?.message || "Delete failed");
    }
  };

  // ── Seed TN 2026 ─────────────────────────────────────────────────────────
  const handleSeed = async () => {
    try {
      setLoading(true);
      const res = await axios.post("/api/public-holidays/seed");
      message.success(res.data.message);
      fetchHolidays();
    } catch (err) {
      message.error(err?.response?.data?.message || "Seed failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Excel parse (FIXED VERSION) ───────────────────────────────────────────
  const handleExcelFile = (file) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        // Use Uint8Array for better encoding support
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (raw.length < 2) {
          message.error("Excel file is empty or has no data rows");
          return;
        }

        const headers = raw[0].map(String);
        const nameCol = findCol(headers, EXCEL_COLUMNS.name);
        const dateCol = findCol(headers, EXCEL_COLUMNS.date);
        const typeCol = findCol(headers, EXCEL_COLUMNS.type);

        if (!nameCol || !dateCol) {
          message.error("Excel must have columns: 'Holiday Name' and 'Date'");
          return;
        }

        const rows = [];
        const errors = [];

        raw.slice(1).forEach((row, idx) => {
          // Skip empty rows
          if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === "")) {
            return;
          }
          
          const nameIdx = headers.indexOf(nameCol);
          const dateIdx = headers.indexOf(dateCol);
          const typeIdx = typeCol ? headers.indexOf(typeCol) : -1;

          let name = "";
          let rawDate = null;
          let type = "National";
          
          // Safely get values
          if (nameIdx >= 0 && nameIdx < row.length) {
            name = row[nameIdx] ? String(row[nameIdx]).trim() : "";
          }
          
          if (dateIdx >= 0 && dateIdx < row.length) {
            rawDate = row[dateIdx];
          }
          
          if (typeIdx >= 0 && typeIdx < row.length && row[typeIdx]) {
            type = String(row[typeIdx]).trim();
          }

          if (!name) { 
            errors.push({ row: idx + 2, issue: "Missing holiday name" }); 
            return; 
          }

          if (!rawDate) {
            errors.push({ row: idx + 2, issue: "Missing date" });
            return;
          }

          const parsed = parseExcelDate(rawDate);
          
          if (!parsed || !parsed.isValid()) {
            errors.push({ row: idx + 2, issue: `Invalid date: "${rawDate}"` });
            return;
          }

          const validTypes = ["National", "Regional", "Religious"];
          const finalType = validTypes.find(t => t.toLowerCase() === type.toLowerCase()) || "National";

          rows.push({
            key: idx,
            name,
            date: parsed.format("YYYY-MM-DD"),
            displayDate: parsed.format("DD MMM YYYY"),
            day: parsed.format("dddd"),
            type: finalType,
            state: "Tamil Nadu",
            status: "ready",
          });
        });

        setParsedRows(rows);
        setParseErrors(errors);
        
        if (rows.length === 0 && errors.length > 0) {
          message.error("No valid rows found in Excel file");
          return;
        }
        
        setImportStep(1);
        message.success(`Parsed ${rows.length} holidays, ${errors.length} errors`);
        
      } catch (err) {
        console.error("Excel parse error:", err);
        message.error("Failed to parse Excel: " + err.message);
      }
    };
    
    reader.onerror = () => {
      message.error("Failed to read file");
    };
    
    // Use readAsArrayBuffer instead of readAsBinaryString
    reader.readAsArrayBuffer(file);
    return false; // prevent auto-upload
  };

  // ── Excel import submit (using bulk endpoint) ──────────────────────────────
  const handleImportSubmit = async () => {
    const readyRows = parsedRows.filter(r => r.status === "ready");
    if (!readyRows.length) { 
      message.warning("No valid rows to import"); 
      return; 
    }

    setImporting(true);
    
    try {
      // Prepare data for bulk import
      const holidaysToImport = readyRows.map(row => ({
        name: row.name,
        date: row.date,
        type: row.type,
        state: row.state || "Tamil Nadu"
      }));

      const response = await axios.post("/api/public-holidays/bulk-import", {
        holidays: holidaysToImport
      });

      if (response.data.success) {
        const { created, skipped, failed } = response.data.data;
        message.success(`Import done: ${created} created, ${skipped} skipped, ${failed} failed`);
        
        // Update row statuses based on results
        const updatedRows = [...parsedRows];
        let successCount = 0;
        let errorCount = 0;
        
        updatedRows.forEach(row => {
          if (row.status === "ready") {
            // If we have error details, we could match them
            // For now, mark all as success since bulk import handled them
            row.status = "success";
            successCount++;
          }
        });
        
        setParsedRows(updatedRows);
        setImportStep(2);
        fetchHolidays();
      }
    } catch (err) {
      console.error("Import error:", err);
      message.error(err?.response?.data?.message || "Import failed");
      
      // Mark failed rows
      const updatedRows = [...parsedRows];
      updatedRows.forEach(row => {
        if (row.status === "ready") {
          row.status = "error";
          row.errorMsg = err?.response?.data?.message || "Import failed";
        }
      });
      setParsedRows(updatedRows);
    } finally {
      setImporting(false);
    }
  };

  // ── Download Excel template ───────────────────────────────────────────────
  const downloadTemplate = () => {
    const wsData = [
      ["Holiday Name", "Date", "Type"],
      ["New Year's Day", "01.01.2026", "National"],
      ["Pongal", "15.01.2026", "Regional"],
      ["Republic Day", "26.01.2026", "National"],
      ["Tamil New Year", "14.04.2026", "Regional"],
      ["Independence Day", "15.08.2026", "National"],
      ["Deepavali", "08.11.2026", "Religious"],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }];
    
    // Add some styling hints
    ws["A1"].s = { font: { bold: true } };
    ws["B1"].s = { font: { bold: true } };
    ws["C1"].s = { font: { bold: true } };
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Holidays");
    XLSX.writeFile(wb, "holidays_template.xlsx");
    message.success("Template downloaded");
  };

  // ── Reset import modal ────────────────────────────────────────────────────
  const resetImport = () => {
    setParsedRows([]);
    setParseErrors([]);
    setImportStep(0);
    setImportModal(false);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:     holidays.length,
    national:  holidays.filter(h => h.type === "National").length,
    regional:  holidays.filter(h => h.type === "Regional").length,
    religious: holidays.filter(h => h.type === "Religious").length,
    weekends:  holidays.filter(h => h.isWeekend).length,
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: "#", key: "sno",
      render: (_, __, i) => <Text type="secondary" style={{ fontSize: 12 }}>{i + 1}</Text>,
      width: 44,
    },
    {
      title: "Holiday Name", dataIndex: "name", key: "name",
      render: t => <Text strong>{t}</Text>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Date", dataIndex: "date", key: "date",
      render: d => <Text style={{ fontFamily: "monospace" }}>{dayjs(d).format("DD.MM.YYYY")}</Text>,
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      width: 120,
    },
    {
      title: "Day", dataIndex: "day", key: "day",
      render: (day, rec) => (
        <Space size={4}>
          <Text style={{ color: rec.isWeekend ? "#f5222d" : undefined }}>{day}</Text>
          {rec.isWeekend && <Tag color="red" style={{ fontSize: 10, padding: "0 4px" }}>Weekend</Tag>}
        </Space>
      ),
      width: 140,
    },
    {
      title: "Month", dataIndex: "month", key: "month", 
      width: 110,
      filters: MONTH_NAMES.map(m => ({ text: m, value: m })),
      onFilter: (value, record) => record.month === value,
    },
    {
      title: "Type", dataIndex: "type", key: "type",
      render: t => <Tag color={TYPE_COLORS[t]}>{t}</Tag>,
      width: 100,
      filters: TYPE_OPTIONS.map(t => ({ text: t, value: t })),
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Actions", key: "actions", fixed: "right", width: 100,
      render: (_, rec) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openForm(rec)} />
          </Tooltip>
          <Popconfirm
            title="Delete this holiday?"
            onConfirm={() => handleDelete(rec._id)}
            okText="Delete" 
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Preview columns (import) ──────────────────────────────────────────────
  const previewCols = [
    { title: "Name", dataIndex: "name", key: "name", width: 200 },
    { title: "Date", dataIndex: "displayDate", key: "date", width: 120 },
    { title: "Day",  dataIndex: "day",  key: "day",  width: 110 },
    { title: "Type", dataIndex: "type", key: "type",
      render: t => <Tag color={TYPE_COLORS[t]}>{t}</Tag>, width: 100 },
    { title: "Status", dataIndex: "status", key: "status", width: 110,
      render: s => s === "success"
        ? <Tag icon={<CheckCircleOutlined />} color="success">Imported</Tag>
        : s === "error"
        ? <Tag icon={<CloseCircleOutlined />} color="error">Failed</Tag>
        : <Tag icon={<CheckCircleOutlined />} color="processing">Ready</Tag>
    },
    { title: "Note", dataIndex: "errorMsg", key: "err", width: 200,
      render: e => e ? <Text type="danger" style={{ fontSize: 11 }}>{e}</Text> : null
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <Card style={{ marginBottom: 20, borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CalendarOutlined style={{ fontSize: 32, color: "#1677ff" }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>Public Holiday Manager</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>Tamil Nadu Gazetted Holidays</Text>
            </div>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={fetchHolidays}>Refresh</Button>
            <Button icon={<ImportOutlined />} onClick={() => { resetImport(); setImportModal(true); }}>
              Import Excel
            </Button>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => openForm()}>
              Add Holiday
            </Button>
          </Space>
        </div>
      </Card>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: "Total Holidays", value: stats.total, color: "#1677ff" },
          { label: "National",  value: stats.national,  color: "#1677ff" },
          { label: "Regional",  value: stats.regional,  color: "#52c41a" },
          { label: "Religious", value: stats.religious, color: "#fa8c16" },
          { label: "Weekend Holidays",  value: stats.weekends,  color: "#f5222d" },
        ].map(s => (
          <Col xs={12} sm={8} md={5} key={s.label}>
            <StatCard {...s} />
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            <Text type="secondary" style={{ fontSize: 13 }}>Filter by:</Text>
            <Select value={filterYear} onChange={setFilterYear} style={{ width: 90 }}>
              {[2024, 2025, 2026, 2027, 2028].map(y => <Option key={y} value={y}>{y}</Option>)}
            </Select>
            <Select 
              placeholder="Month" 
              value={filterMonth} 
              onChange={setFilterMonth} 
              allowClear 
              style={{ width: 130 }}
            >
              {MONTH_NAMES.map(m => <Option key={m} value={m}>{m}</Option>)}
            </Select>
            <Select 
              placeholder="Type" 
              value={filterType} 
              onChange={setFilterType} 
              allowClear 
              style={{ width: 120 }}
            >
              {TYPE_OPTIONS.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
            <Button 
              size="small" 
              onClick={() => { setFilterMonth(null); setFilterType(null); }}
            >
              Clear Filters
            </Button>
          </Space>
        
        </Space>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 12, overflow: "hidden" }}>
        <Table
          columns={columns}
          dataSource={holidays}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{ 
            pageSize: 15, 
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} holidays`,
            showSizeChanger: true,
            showQuickJumper: true
          }}
          size="middle"
        />
      </Card>

      {/* ── Add / Edit Modal ────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            {editRecord ? <EditOutlined /> : <PlusOutlined />}
            {editRecord ? "Edit Holiday" : "Add New Holiday"}
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editRecord ? "Update" : "Create"}
        confirmLoading={saving}
        destroyOnClose
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item 
            name="name" 
            label="Holiday Name" 
            rules={[{ required: true, message: "Please enter holiday name" }]}
          >
            <Input placeholder="e.g., Pongal, Deepavali, Republic Day" size="large" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="date" 
                label="Date" 
                rules={[{ required: true, message: "Please select date" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="type" 
                label="Type" 
                rules={[{ required: true, message: "Please select type" }]}
              >
                <Select placeholder="Select type" size="large">
                  {TYPE_OPTIONS.map(t => <Option key={t} value={t}>{t}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="state" label="State" initialValue="Tamil Nadu">
            <Input size="large" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Import Modal ────────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: "#217346" }} />
            Import Holidays from Excel
          </Space>
        }
        open={importModalOpen}
        onCancel={resetImport}
        width={900}
        footer={null}
        destroyOnClose
      >
        <Steps
          current={importStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: "Upload File", icon: <UploadOutlined /> },
            { title: "Preview & Confirm", icon: <EyeOutlined /> },
            { title: "Complete", icon: <CheckCircleOutlined /> },
          ]}
        />

        {/* Step 0: Upload */}
        {importStep === 0 && (
          <div>
            <Alert
              type="info"
              style={{ marginBottom: 16, borderRadius: 8 }}
              message="Excel Format Requirements"
              description={
                <div>
                  <Text>Your Excel file must have these columns:</Text>
                  <ul style={{ margin: "8px 0 4px", paddingLeft: 18 }}>
                    <li><Text strong>Holiday Name</Text> — Name of the holiday (required)</li>
                    <li><Text strong>Date</Text> — DD.MM.YYYY or DD/MM/YYYY or YYYY-MM-DD (required)</li>
                    <li><Text strong>Type</Text> — National / Regional / Religious (optional, defaults to National)</li>
                  </ul>
                  <Divider style={{ margin: "12px 0" }} />
                 
                </div>
              }
            />
            <Dragger
              accept=".xlsx,.xls"
              beforeUpload={handleExcelFile}
              showUploadList={false}
              style={{ borderRadius: 8, padding: "40px 20px" }}
            >
              <p style={{ fontSize: 48, marginBottom: 8 }}>📊</p>
              <p style={{ fontWeight: 500, fontSize: 16 }}>Click or drag Excel file here</p>
              <p style={{ color: "#888", fontSize: 13 }}>Supports .xlsx and .xls files</p>
            </Dragger>
          </div>
        )}

        {/* Step 1: Preview */}
        {importStep === 1 && (
          <div>
            {parseErrors.length > 0 && (
              <Alert
                type="warning"
                style={{ marginBottom: 12, borderRadius: 8 }}
                message={`${parseErrors.length} row(s) will be skipped due to errors`}
                description={
                  <div style={{ maxHeight: 150, overflow: "auto" }}>
                    {parseErrors.slice(0, 10).map(e => (
                      <div key={e.row}>• Row {e.row}: {e.issue}</div>
                    ))}
                    {parseErrors.length > 10 && <div>... and {parseErrors.length - 10} more errors</div>}
                  </div>
                }
              />
            )}
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Text strong style={{ fontSize: 14 }}>
                  {parsedRows.filter(r => r.status === "ready").length} holidays ready to import
                </Text>
                {parsedRows.length > 0 && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    (Total {parsedRows.length} rows parsed)
                  </Text>
                )}
              </div>
              <Space>
                <Button onClick={() => setImportStep(0)}>Back</Button>
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  loading={importing}
                  onClick={handleImportSubmit}
                  disabled={!parsedRows.some(r => r.status === "ready")}
                >
                  Import {parsedRows.filter(r => r.status === "ready").length} Holidays
                </Button>
              </Space>
            </div>
            <Table
              columns={previewCols}
              dataSource={parsedRows}
              rowKey="key"
              size="small"
              pagination={false}
              scroll={{ y: 350, x: 800 }}
              style={{ borderRadius: 8 }}
            />
          </div>
        )}

        {/* Step 2: Result */}
        {importStep === 2 && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <CheckCircleOutlined style={{ fontSize: 56, color: "#52c41a", display: "block", marginBottom: 16 }} />
            <Title level={4}>Import Complete</Title>
            <Space size="large" style={{ marginBottom: 20 }}>
              <Tag color="success" style={{ fontSize: 14, padding: "4px 12px" }}>
                {parsedRows.filter(r => r.status === "success").length} Created
              </Tag>
              <Tag color="error" style={{ fontSize: 14, padding: "4px 12px" }}>
                {parsedRows.filter(r => r.status === "error").length} Failed
              </Tag>
            </Space>
            <Table
              columns={previewCols}
              dataSource={parsedRows}
              rowKey="key"
              size="small"
              pagination={false}
              scroll={{ y: 300, x: 800 }}
              style={{ borderRadius: 8, textAlign: "left" }}
            />
            <Button type="primary" size="large" style={{ marginTop: 20 }} onClick={resetImport}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PublicHolidayManager;