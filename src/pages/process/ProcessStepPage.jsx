import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Drawer,
  Input,
  Form,
  Popconfirm,
  Space,
  Divider,
  Tag,
  message,
  Select,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, ProductFilled } from "@ant-design/icons";
import axios from "../../api/axios"; // Assuming axios instance is configured

const { Option } = Select;

// Component for managing global process steps (templates)
export default function ProcessStepPage() {
  const [groupedSteps, setGroupedSteps] = useState([]); // All step templates from DB
  const [services, setServices] = useState([]); // List of Services (Step Types)
  const [loading, setLoading] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);

  // We only use the form data and the presence of the type in groupedSteps 
  // to determine if we are editing or creating.
  const [form] = Form.useForm();

  // --- DATA LOADING ---

  // Load all services (to act as Step Types options)
  const loadServices = async () => {
    try {
      const res = await axios.get("/api/service");
      // Assuming res.data contains an array of service objects
      setServices(res.data?.services || res.data || []); 
    } catch {
      message.error("Failed to load services");
    }
  };

  // Load all grouped step templates from the database
  const loadSteps = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/steps");
      setGroupedSteps(data);
    } catch {
      message.error("Failed to load steps!");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
    loadSteps();
  }, []);

  // --- HANDLERS ---

  /**
   * Handler for selecting an existing Service (Step Type) to edit.
   * Finds the existing template steps and pre-fills the form.
   */
  const handleSelectGroup = (serviceId) => {
    const service = services.find(s => s._id === serviceId);
    if (!service) return;

    const stepType = service.serviceName;

    // Find the existing step group for this stepType
    const group = groupedSteps.find((g) => g._id === stepType);
    
    // Set form fields: steps array is empty if no template exists yet
    form.setFieldsValue({
      stepType: stepType,
      steps: group ? group.steps : [{ stepName: '', status: 'Active' }], // Add initial empty step if none exist
      serviceId: serviceId,
    });
    setOpenDrawer(true);
  };

  /**
   * Handler for closing the Drawer.
   */
  const handleCloseDrawer = () => {
    setOpenDrawer(false);
    form.resetFields();
  }

  /**
   * Submission handler for the Drawer (handles both PUT and POST).
   */
  const handleSubmit = async (values) => {
    const typeToSave = values.stepType; 

    try {
      // Check if this stepType already exists in the loaded data
      const isUpdatingExisting = groupedSteps.some(g => g._id === typeToSave);
      
      if (isUpdatingExisting) {
        // UPDATE (PUT) - Use the stepType directly in the URL
        await axios.put(`/api/steps/${typeToSave}`, values);
        message.success(`Step Group ${typeToSave} Updated!`);
      } else {
        // CREATE (POST) - This is for a truly new stepType template
        await axios.post("/api/steps", values);
        message.success("Step Group Added!");
      }

      handleCloseDrawer();
      loadSteps(); // Reload data
    } catch (error) {
        // Use backend error message if available
        const errorMessage = error.response?.data?.message || "Error while saving!";
        message.error(errorMessage);
    }
  };

  /**
   * Deletes an entire Step Group template by stepType.
   */
  const handleDeleteGroup = async (stepType) => {
    try {
      // Calls the new DELETE /api/steps/:stepType endpoint
      await axios.delete(`/api/steps/${stepType}`);
      message.success(`Step Group '${stepType}' Deleted`);
      loadSteps();
    } catch (error) {
      message.error("Failed to delete step group.");
    }
  };

  // --- RENDER CONFIG ---

  const columns = [
    { title: "Step Name", dataIndex: "stepName" },
    {
      title: "URL/Path",
      dataIndex: "url",
      render: (url) => url ? <a href={url} target="_blank" rel="noreferrer">{url}</a> : '-',
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (s) => (
        <Tag color={s === "Active" ? "green" : "red"}>
          {s}
        </Tag>
      ),
    },
    {
        title: "Order",
        dataIndex: "order",
        width: 80,
    }
    // NOTE: If you still need to delete individual steps from the table, 
    // you must add the action column and call DELETE /api/steps/step/:id
  ];

  return (
    <>
      <h2> <ProductFilled/> Process Step Templates</h2>
      <Divider />

      <Space style={{ marginBottom: 15 }}>
        <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
                form.resetFields();
                form.setFieldsValue({ steps: [{ stepName: '', status: 'Active' }] }); // Initialize with one step row
                setOpenDrawer(true);
            }}
        >
            Add New Step Type Template
        </Button>
        <Divider type="vertical" />
        <Select
            placeholder="Select Service (Step Type) to Edit"
            style={{ width: 300 }}
            onChange={handleSelectGroup}
            options={services.map(s => ({
                label: `Edit Steps for: ${s.serviceName}`,
                value: s._id,
            }))}
        />
      </Space>

      {/* Display grouped steps */}
      {groupedSteps.map((g) => {
          // Find the service name that corresponds to the group name (g._id)
          const service = services.find(s => s.serviceName === g._id);
          const serviceId = service ? service._id : null;

          return (
            <div key={g._id} style={{ marginBottom: "30px" }}>
              <h3>
                Step Type: <Tag color="blue" style={{ fontSize: 16, padding: '5px 10px' }}>{g._id}</Tag>
                
                {/* Delete Group Button */}
                <Popconfirm
                    title={`Are you sure to delete the entire ${g._id} step group? This action is irreversible.`}
                    onConfirm={() => handleDeleteGroup(g._id)}
                >
                    <Button size="small" icon={<DeleteOutlined />} danger style={{ marginLeft: 10 }} />
                </Popconfirm>
                
                {/* Edit Group Button - only show if Service ID is found */}
                {serviceId && (
                    <Button 
                        size="small" 
                        icon={<EditOutlined />} 
                        style={{ marginLeft: 5 }} 
                        onClick={() => handleSelectGroup(serviceId)}
                    />
                )}
              </h3>

              <Table
                rowKey="_id" // Use MongoDB _id if available, otherwise use a combination key
                columns={columns}
                dataSource={g.steps}
                pagination={false}
                bordered
              />
            </div>
          );
      })}

      {/* CREATE/EDIT DRAWER */}
      <Drawer
        title={form.getFieldValue('stepType') ? `Edit Template: ${form.getFieldValue('stepType')}` : "Add New Step Type Template"}
        width={500}
        open={openDrawer}
        onClose={handleCloseDrawer}
        extra={
          <Space>
            <Button onClick={handleCloseDrawer}>Cancel</Button>
            <Button type="primary" onClick={() => form.submit()}>
              {groupedSteps.some(g => g._id === form.getFieldValue('stepType')) ? "Update Group" : "Save Group"}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          
          <Form.Item
            name="stepType"
            label="Step Type (Service Name)"
            rules={[{ required: true, message: "Step Type is required" }]}
          >
            <Input 
                placeholder="Enter Service Name (e.g., Website Development)" 
                // Disable input if a template for this type already exists 
                disabled={groupedSteps.some(g => g._id === form.getFieldValue('stepType'))}
            />
          </Form.Item>

          <Divider orientation="left">Individual Steps</Divider>

          {/* Dynamic list for adding/editing multiple steps */}
          <Form.List name="steps">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div
                    key={key}
                    style={{
                      border: "1px solid #e8e8e8",
                      padding: 15,
                      borderRadius: 8,
                      marginBottom: 15,
                      position: 'relative',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <Button 
                        danger 
                        size="small" 
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        style={{ position: 'absolute', top: 5, right: 5 }}
                    />
                    
                    <Form.Item
                      {...rest}
                      name={[name, "stepName"]}
                      label="Step Name"
                      rules={[{ required: true, message: "Step Name is required" }]}
                      style={{ marginBottom: 10 }}
                    >
                      <Input placeholder="e.g., Initial Client Brief" />
                    </Form.Item>

                    <Form.Item {...rest} name={[name, "url"]} label="Related URL" style={{ marginBottom: 10 }}>
                      <Input placeholder="/brief-template" />
                    </Form.Item>

                    <Form.Item
                      {...rest}
                      name={[name, "description"]}
                      label="Description"
                      style={{ marginBottom: 10 }}
                    >
                      <Input.TextArea rows={1} placeholder="Brief description of the step" />
                    </Form.Item>

                    <Form.Item
                      {...rest}
                      name={[name, "status"]}
                      label="Status"
                      initialValue="Active"
                      rules={[{ required: true, message: "Status is required" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select>
                        <Option value="Active">Active</Option>
                        <Option value="Inactive">Inactive</Option>
                      </Select>
                    </Form.Item>
                  </div>
                ))}

                <Button type="dashed" onClick={() => add({ status: 'Active' })} block icon={<PlusOutlined />}>
                  Add Step Row
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </>
  );
}