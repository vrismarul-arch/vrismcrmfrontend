import React from "react";
import { Space, Typography } from "antd";
import AttachmentPreview from "./AttachmentPreview";

const { Text } = Typography;

const AttachmentList = ({ extraAttachment = [], attachments = [] }) => {
  const allFiles = [
    ...(Array.isArray(extraAttachment) ? extraAttachment : []),
    ...(Array.isArray(attachments) ? attachments : [])
  ];

  if (!allFiles.length) return <Text>-</Text>;

  return (
    <Space direction="vertical">
      {allFiles.map((url, index) => (
        <AttachmentPreview key={index} url={url} />
      ))}
    </Space>
  );
};

export default AttachmentList;
