import React from "react";
import {
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Space,
  Tooltip,
} from "antd";
import {
  FilterOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";

const { RangePicker } = DatePicker;
const { Option } = Select;

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "On Hold", value: "on-hold" },
];

const FilterBar = ({
  selectedMonth,
  selectedBusiness,
  selectedStatus,
  dateRange,
  availableMonths,
  businessAccounts,
  userRole,
  screens,
  exportLoading,
  onMonthChange,
  onBusinessChange,
  onStatusChange,
  onDateRangeChange,
  onReset,
  onExportExcel,
  onExportPDF,
}) => {
  const showBusinessFilter = ["Admin", "Superadmin", "Employee", "Team Leader"].includes(userRole);

  const formatMonthDisplay = (month) => {
    if (!month) return null;
    const [year, monthNum] = month.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
  };

  return (
    <div
      style={{
        background: "#fafafa",
        border: "1px solid #e8e8e8",
        borderRadius: 8,
        padding: screens.xs ? 12 : 16,
        marginBottom: 20,
      }}
    >
      <Row gutter={[12, 12]} align="middle">
        <Col>
          <Space>
            <FilterOutlined style={{ color: "#1677ff" }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Filters</span>
          </Space>
        </Col>

        <Col xs={24} sm={12} md={6} lg={5}>
          <Select
            placeholder="Select Month"
            value={selectedMonth}
            onChange={onMonthChange}
            allowClear
            style={{ width: "100%" }}
          >
            {availableMonths.map((month) => (
              <Option key={month} value={month}>
                {formatMonthDisplay(month)}
              </Option>
            ))}
          </Select>
        </Col>

        {showBusinessFilter && (
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Select Business"
              value={selectedBusiness}
              onChange={onBusinessChange}
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: "100%" }}
            >
              {businessAccounts.map((account) => (
                <Option key={account._id} value={account._id}>
                  {account.businessName || account.name}
                </Option>
              ))}
            </Select>
          </Col>
        )}

        <Col xs={24} sm={12} md={6} lg={4}>
          <Select
            placeholder="Select Status"
            value={selectedStatus}
            onChange={onStatusChange}
            allowClear
            style={{ width: "100%" }}
          >
            {STATUS_OPTIONS.map((s) => (
              <Option key={s.value} value={s.value}>
                {s.label}
              </Option>
            ))}
          </Select>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <RangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            style={{ width: "100%" }}
            size="middle"
          />
        </Col>

        <Col>
          <Space wrap>
            <Tooltip title="Reset Filters">
              <Button icon={<ReloadOutlined />} onClick={onReset}>
                {!screens.xs && "Reset"}
              </Button>
            </Tooltip>
            <Tooltip title="Export Excel">
              <Button
                icon={<FileExcelOutlined />}
                loading={exportLoading}
                onClick={onExportExcel}
                style={{ color: "#217346" }}
              >
                {!screens.xs && "Excel"}
              </Button>
            </Tooltip>
            <Tooltip title="Export PDF">
              <Button
                icon={<FilePdfOutlined />}
                loading={exportLoading}
                onClick={onExportPDF}
                danger
              >
                {!screens.xs && "PDF"}
              </Button>
            </Tooltip>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default FilterBar;