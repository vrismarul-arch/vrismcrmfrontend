import {
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Divider,
  Space,
  theme,
  Tooltip,
} from "antd";
import {
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "../../api/axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { generateQuotationFormStyles } from "./QuotationFormStyles";

const { Option } = Select;
const { TextArea } = Input;
const { useToken } = theme;

// Add 'isSaving' prop to control button disabled state
const QuotationForm = ({ onCancel, onSave, initialValues, isSaving }) => {
  const [form] = Form.useForm();
  const [businessOptions, setBusinessOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [items, setItems] = useState([
    {
      id: 1,
      productId: null,
      description: "",
      hsnSac: "",
      quantity: 1,
      quantityType: "",
      rate: 0,
      specifications: [{ key: Date.now(), name: "", value: "" }],
    },
  ]);
  const [notes, setNotes] = useState([]);
  // const [loading, setLoading] = useState(false); // Removed, controlled by parent's isSaving
  const [gstType, setGstType] = useState(null);
  const [selectedBusinessDetails, setSelectedBusinessDetails] = useState(null);

  const { token } = useToken();
  const styles = generateQuotationFormStyles(token);

  const hasFetchedBusinessOptions = useRef(false);
  const hasFetchedProductOptions = useRef(false);

  const formatBusinessInfo = useCallback((business) => {
    if (!business) return "";
    return `
${business.businessName?.toUpperCase()}
${business.contactName ? `Mr. ${business.contactName?.toUpperCase()}` : ""}
${business.addressLine1 || ""}${
      business.addressLine2 ? ", " + business.addressLine2 : ""
    }
${business.city || ""}${business.pincode ? " - " + business.pincode : ""}
${business.state || ""}, ${business.country || ""}
${business.gstNumber || ""}
${business.email || ""} 
`.trim();
  }, []);

  const fetchBusinessOptions = useCallback(async () => {
    if (hasFetchedBusinessOptions.current) return;
    hasFetchedBusinessOptions.current = true;

    const toastId = toast.loading("Loading business options...");
    try {
      const res = await axios.get("/api/quotations/leads/customer");
      setBusinessOptions(res.data);
      toast.success("Business options loaded", { id: toastId });
    } catch (error) {
      toast.error("Failed to load businesses", { id: toastId });
      console.error("Error fetching business options:", error);
      hasFetchedBusinessOptions.current = false;
    }
  }, []);

  const fetchProductOptions = useCallback(async () => {
    if (hasFetchedProductOptions.current) return;
    hasFetchedProductOptions.current = true;

    const toastId = toast.loading("Loading product options...");
    try {
      const res = await axios.get("/api/service");
      setProductOptions(
        res.data.map((p) => ({
          ...p,
          hsnSac: p.hsnSac || "",
          quantityType: p.quantityType || "",
          options: p.options || [],
        }))
      );
      toast.success("Product options loaded", { id: toastId });
    } catch (error) {
      toast.error("Failed to load products", { id: toastId });
      console.error("Error fetching product options:", error);
      hasFetchedProductOptions.current = false;
    }
  }, []);

  useEffect(() => {
    fetchBusinessOptions();
    fetchProductOptions();

    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        date: initialValues.date ? dayjs(initialValues.date) : null,
        validUntil: initialValues.validUntil
          ? dayjs(initialValues.validUntil)
          : null,
        noteText: "",
      });
      setItems(initialValues.items || []);
      setNotes(initialValues.notes || []);
      setGstType(initialValues.gstType || null);

      if (initialValues.businessId && businessOptions.length > 0) {
        const preSelected = businessOptions.find(
          (b) => b._id === initialValues.businessId
        );
        if (preSelected) {
          setSelectedBusinessDetails(preSelected);
          form.setFieldsValue({
            businessName: preSelected.businessName,
            businessType: preSelected.type,
            gstin: preSelected.gstNumber,
            businessInfo: formatBusinessInfo(preSelected),
          });
        }
      }
    }
  }, [
    initialValues,
    fetchBusinessOptions,
    fetchProductOptions,
    form,
    formatBusinessInfo,
    businessOptions,
  ]);

  const onFinish = async (values) => {
    if (!items || items.length === 0) {
      toast.error("At least one item is required.");
      return;
    }
    if (!gstType) {
      toast.error("Please select a GST type.");
      return;
    }



    const timestamp = new Date().toLocaleString();
    const newNote = values.noteText
      ? { text: values.noteText, timestamp }
      : null;

    const quotation = {
      ...values,
      date: values.date?.format("DD-MM-YYYY"),
      validUntil: values.validUntil?.format("DD-MM-YYYY"),
      items,
      notes: newNote ? [...notes, newNote] : notes,
      subTotal: calculateSubTotal(),
      tax: calculateTax(),
      total: calculateTotal(),
      createdDate: new Date().toLocaleDateString(),
      gstType: gstType,
      businessName: selectedBusinessDetails?.businessName,
      businessType: selectedBusinessDetails?.type,
      gstin: selectedBusinessDetails?.gstNumber,
      businessInfo: selectedBusinessDetails
        ? formatBusinessInfo(selectedBusinessDetails)
        : "",
      // Customer details are now included in values from form fields
      customerName: values.customerName,
      customerEmail: values.customerEmail,
    };

    // Delegate the actual saving (axios call) to the parent component
    // The parent will handle the loading state and toast messages related to the API call
    try {
      await onSave(quotation);
      // The parent (QuotationPage) will show success toast and close drawer
    } catch (error) {
      // Parent (QuotationPage) will show error toast
      console.error("Error in QuotationForm onFinish:", error);
    } finally {
      // setLoading(false); // Removed, parent's isSaving handles this
    }
  };

  const addItem = () =>
    setItems([
      ...items,
      {
        id: Date.now(),
        productId: null,
        description: "",
        hsnSac: "",
        quantity: 1,
        rate: 0,
        quantityType: "",
        specifications: [{ key: Date.now(), name: "", value: "" }],
      },
    ]);

  const removeItem = (id) => setItems(items.filter((item) => item.id !== id));

  const updateItem = (id, field, value) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          if (field === "productId") {
            const selectedProduct = productOptions.find((p) => p._id === value);
            if (selectedProduct) {
              return {
                ...item,
                productId: value,
                description: selectedProduct.description || "",
                hsnSac: selectedProduct.hsnSac || "",
                rate: selectedProduct.price || 0,
                quantityType: selectedProduct.quantityType || "",
                specifications:
                  selectedProduct.options && selectedProduct.options.length > 0
                    ? selectedProduct.options.map((opt) => ({
                        key: Date.now() + Math.random(),
                        name: opt.type || "",
                        value: opt.description || "",
                      }))
                    : [
                        {
                          key: Date.now() + Math.random(),
                          name: "",
                          value: "",
                        },
                      ],
              };
            }
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const addSpecification = (itemId) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              specifications: [
                ...item.specifications,
                { key: Date.now() + Math.random(), name: "", value: "" },
              ],
            }
          : item
      )
    );
  };

  const removeSpecification = (itemId, specKey) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              specifications: item.specifications.filter(
                (spec) => spec.key !== specKey
              ),
            }
          : item
      )
    );
  };

  const updateSpecification = (itemId, specKey, field, value) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              specifications: item.specifications.map((spec) =>
                spec.key === specKey ? { ...spec, [field]: value } : spec
              ),
            }
          : item
      )
    );
  };

  const calculateSubTotal = () =>
    items.reduce((sum, i) => sum + (i.quantity || 0) * (i.rate || 0), 0);
  const calculateTax = () => calculateSubTotal() * 0.18;
  const calculateTotal = () => calculateSubTotal() + calculateTax();

  const handleBusinessSelect = (id) => {
    const selected = businessOptions.find((b) => b._id === id);
    if (selected) {
      setSelectedBusinessDetails(selected);
      const fullInfo = formatBusinessInfo(selected);
      form.setFieldsValue({
        businessId: selected._id,
        businessName: selected.businessName,
        businessType: selected.type,
        gstin: selected.gstNumber,
        businessInfo: fullInfo,
      });
    } else {
      setSelectedBusinessDetails(null);
      form.setFieldsValue({
        businessId: null,
        businessName: null,
        businessType: null,
        gstin: null,
        businessInfo: "",
      });
    }
  };

  return (
    <Card
      title={
        <span style={styles.mainCardTitle}>
          {initialValues ? "Edit Quotation" : "Create New Quotation"}
        </span>
      }
      loading={isSaving} // Use isSaving from props for loading state
      style={styles.quotationCard}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* Customer Details Section */}
        <Divider style={styles.divider}>Customer Details</Divider>
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Customer Name"
              name="customerName"
              rules={[
                { required: true, message: "Please enter customer name!" },
                { min: 2, message: "Customer name must be at least 2 characters!" }
              ]}
            >
              <Input
                placeholder="Enter customer full name"
                style={styles.formField}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Customer Email"
              name="customerEmail"
              rules={[
                { required: true, message: "Please enter customer email!" },
                { type: "email", message: "Please enter a valid email address!" }
              ]}
            >
              <Input
                placeholder="Enter customer email address"
                style={styles.formField}
                type="email"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Business Details Section */}
        <Divider style={styles.divider}>Business Details</Divider>
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Business Name"
              name="businessId"
              rules={[{ required: true, message: "Please select a business!" }]}
            >
              <Select
                placeholder="Select business"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children || "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                onChange={handleBusinessSelect}
                allowClear
                style={styles.formField}
              >
                {businessOptions.map((b) => (
                  <Option key={b._id} value={b._id}>
                    {b.businessName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="businessName" hidden>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="businessType" label="Type">
              <Input readOnly style={styles.readOnlyFormField} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="gstType"
              label="GST Type"
              rules={[{ required: true, message: "Please select a GST type!" }]}
            >
              <Select
                placeholder="Select GST calculation type"
                onChange={(value) => setGstType(value)}
                value={gstType}
                style={styles.formField}
              >
                <Option value="interstate">
                  Interstate - IGST (Integrated GST)
                </Option>
                <Option value="intrastate">
                  Intrastate - SGST/CGST (State/Central GST)
                </Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Business Info">
              <Card bordered style={styles.businessInfoCard}>
                <pre style={styles.businessInfoPre}>
                  {form.getFieldValue("businessInfo") ||
                    "Select a business to view details..."}
                </pre>
              </Card>
            </Form.Item>
          </Col>
        </Row>

        {/* Quotation Details Section */}
        <Divider style={styles.divider}>Quotation Details</Divider>
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: "Please select a date!" }]}
            >
              <DatePicker style={styles.formField} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="validUntil" label="Valid Until">
              <DatePicker style={styles.formField} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={styles.divider}>Quotation Items</Divider>
        {items.map((item, index) => {
          const isProductSelected = item.productId !== null;
          return (
            <Card key={item.id} style={styles.itemCard} size="small">
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={8}>
                  <Form.Item label="Product" noStyle>
                    <Select
                      placeholder="Search or select a product"
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children || "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      onChange={(value) =>
                        updateItem(item.id, "productId", value)
                      }
                      value={item.productId}
                      style={styles.formField}
                    >
                      {productOptions.map((p) => (
                        <Option key={p._id} value={p._id}>
                          {p.productName || p.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={12} sm={4}>
                  <Form.Item label="Qty" noStyle>
                    <InputNumber
                      placeholder="1"
                      value={item.quantity}
                      onChange={(val) => updateItem(item.id, "quantity", val)}
                      style={styles.formField}
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Item label="Unit Type" noStyle>
                    <Input
                      placeholder="e.g., Pcs, Kg, Mtr"
                      value={item.quantityType}
                      onChange={(e) =>
                        updateItem(item.id, "quantityType", e.target.value)
                      }
                      style={
                        isProductSelected
                          ? styles.readOnlyFormField
                          : styles.formField
                      }
                      readOnly={isProductSelected}
                      disabled={isProductSelected}
                    />
                  </Form.Item>
                </Col>
                <Col
                  xs={24}
                  sm={6}
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                  }}
                >
                  {items.length > 1 && (
                    <Tooltip title="Remove Item">
                      <Button
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => removeItem(item.id)}
                        type="text"
                        style={styles.deleteButton}
                      />
                    </Tooltip>
                  )}
                </Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: token.marginS }}>
                <Col xs={24} sm={8}>
                  <Form.Item label="Price (per unit)" noStyle>
                    <Input
                      prefix="₹"
                      value={item.rate.toFixed(2)}
                      readOnly
                      style={styles.readOnlyFormField}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={16}>
                  <Form.Item label="Description" noStyle>
                    <TextArea
                      placeholder="Detailed description of the item"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      style={
                        isProductSelected
                          ? styles.readOnlyTextArea
                          : styles.textAreaField
                      }
                      rows={2}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: token.marginS }}>
                <Col xs={24} sm={8}>
                  <Form.Item label="HSN/SAC Code" noStyle>
                    <Input
                      placeholder="HSN/SAC"
                      value={item.hsnSac}
                      onChange={(e) =>
                        updateItem(item.id, "hsnSac", e.target.value)
                      }
                      style={
                        isProductSelected
                          ? styles.readOnlyFormField
                          : styles.formField
                      }
                      readOnly={isProductSelected}
                      disabled={isProductSelected}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="Item Total" noStyle>
                    <Input
                      value={`₹${(
                        (item.quantity || 0) * (item.rate || 0)
                      ).toFixed(2)}`}
                      readOnly
                      style={styles.totalItemField}
                    />
                  </Form.Item>
                </Col>
              </Row>
              {item.specifications && item.specifications.length > 0 && (
                <>
                  <Divider
                    orientation="left"
                    style={styles.specificationDivider}
                  >
                    Specifications
                  </Divider>
                  {item.specifications.map((spec, specIndex) => (
                    <Row
                      key={spec.key}
                      gutter={16}
                      style={styles.specificationRow}
                      align="middle"
                    >
                      <Col xs={24} sm={10}>
                        <Input
                          placeholder="Specification Name (e.g., Color)"
                          value={spec.name}
                          onChange={(e) =>
                            updateSpecification(
                              item.id,
                              spec.key,
                              "name",
                              e.target.value
                            )
                          }
                          style={styles.formField}
                        />
                      </Col>
                      <Col xs={24} sm={10}>
                        <Input
                          placeholder="Specification Value (e.g., Blue)"
                          value={spec.value}
                          onChange={(e) =>
                            updateSpecification(
                              item.id,
                              spec.key,
                              "value",
                              e.target.value
                            )
                          }
                          style={styles.formField}
                        />
                      </Col>
                      <Col xs={24} sm={4}>
                        <Space>
                          {item.specifications.length > 1 && (
                            <Tooltip title="Remove Specification">
                              <Button
                                icon={<MinusCircleOutlined />}
                                onClick={() =>
                                  removeSpecification(item.id, spec.key)
                                }
                                type="text"
                                danger
                                style={styles.deleteButton}
                              />
                            </Tooltip>
                          )}
                          {specIndex === item.specifications.length - 1 && (
                            <Tooltip title="Add New Specification">
                              <Button
                                icon={<PlusOutlined />}
                                onClick={() => addSpecification(item.id)}
                                type="dashed"
                                style={styles.addButton}
                              />
                            </Tooltip>
                          )}
                        </Space>
                      </Col>
                    </Row>
                  ))}
                </>
              )}
              {/* Only show 'Add Specification' button if there are no specs or the last one is filled */}
              {(!item.specifications ||
                item.specifications.length === 0 ||
                (item.specifications.length > 0 &&
                  item.specifications[item.specifications.length - 1].name &&
                  item.specifications[item.specifications.length - 1]
                    .value)) && (
                <Button
                  onClick={() => addSpecification(item.id)}
                  block
                  type="dashed"
                  style={styles.addSpecButton}
                >
                  + Add Specification
                </Button>
              )}
            </Card>
          );
        })}
        <Button
          onClick={addItem}
          block
          type="dashed"
          style={styles.addItemButton}
        >
          + Add Another Item
        </Button>

        <Divider style={styles.divider}>Quotation Summary</Divider>
        <Row gutter={[16, 16]} style={styles.summaryRow}>
          <Col xs={24} sm={8}>
            <Form.Item label="Sub Total">
              <Input
                readOnly
                value={`₹${calculateSubTotal().toFixed(2)}`}
                style={styles.totalField}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="GST (18%)">
              <Input
                readOnly
                value={`₹${calculateTax().toFixed(2)}`}
                style={styles.totalField}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Total Amount">
              <Input
                readOnly
                value={`₹${calculateTotal().toFixed(2)}`}
                style={styles.grandTotalField}
              />
            </Form.Item>
          </Col>
        </Row>

        {notes.length > 0 && (
          <Form.Item label="Existing Notes">
            <Card style={styles.notesCard}>
              {notes.map((note, index) => (
                <p key={index} style={styles.noteText}>
                  <strong>{note.timestamp}:</strong> {note.text}
                </p>
              ))}
            </Card>
          </Form.Item>
        )}

        <Form.Item name="noteText" label="Add New Note">
          <TextArea
            rows={3}
            style={styles.textAreaField}
            placeholder="Add any additional notes, terms, or conditions for this quotation..."
          />
        </Form.Item>

        <Form.Item style={styles.buttonGroup}>
          <Space size="middle">
            <Button onClick={onCancel} disabled={isSaving} size="large">
              Cancel
            </Button>
            <Button
              htmlType="submit"
              type="primary"
              icon={<SaveOutlined />}
              loading={isSaving} // Disable button when saving
              size="large"
            >
              Save Quotation
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default QuotationForm;