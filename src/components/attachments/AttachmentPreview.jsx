import React from "react";
import { Typography } from "antd";
import {
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import "./AttachmentPreview.css";

const { Text } = Typography;

/* ---------- FILE TYPE CHECKS ---------- */
const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
const isPDF = (url) => /\.pdf$/i.test(url);
const isDoc = (url) => /\.(doc|docx)$/i.test(url);
const isExcel = (url) => /\.(xls|xlsx|csv)$/i.test(url);

/* ---------- FILE NAME ---------- */
const getFileName = (url) =>
  decodeURIComponent(url.split("/").pop() || "file");

/* ---------- ICON SELECTOR ---------- */
const getIcon = (url) => {
  if (isPDF(url)) return <FilePdfOutlined className="file-icon pdf" />;
  if (isImage(url)) return <FileImageOutlined className="file-icon image" />;
  if (isDoc(url)) return <FileWordOutlined className="file-icon doc" />;
  if (isExcel(url)) return <FileExcelOutlined className="file-icon excel" />;
  return <FileOutlined className="file-icon other" />;
};

/* ---------- COMPONENT ---------- */
const AttachmentPreview = ({ url }) => {
  if (!url) return null;

  return (
    <div className="ios-attachment-card">
      {/* HEADER */}
      <div className="ios-attachment-header">
        {getIcon(url)}

        <div className="ios-file-meta">
          <Text
            className="ios-file-name"
            ellipsis={{ tooltip: getFileName(url) }}
          >
            {getFileName(url)}
          </Text>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ios-download-link"
          >
            <DownloadOutlined /> Open
          </a>
        </div>
      </div>

      {/* IMAGE PREVIEW */}
      {isImage(url) && (
        <img
          src={url}
          alt={getFileName(url)}
          className="ios-image-preview"
        />
      )}

      {/* PDF PREVIEW */}
      {isPDF(url) && (
        <iframe
          src={url}
          title={getFileName(url)}
          className="ios-pdf-preview"
        />
      )}

      {/* DOC NOTE */}
      {isDoc(url) && (
        <Text className="ios-doc-note">
          DOC/DOCX preview not supported. Click Open to view.
        </Text>
      )}

      {/* EXCEL NOTE */}
      {isExcel(url) && (
        <Text className="ios-doc-note">
          Excel preview not supported. Click Open to view.
        </Text>
      )}
    </div>
  );
};

export default AttachmentPreview;
