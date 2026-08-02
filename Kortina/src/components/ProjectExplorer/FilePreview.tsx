import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import './FilePreview.css';
interface FilePreviewProps {
  file: {
    name: string;
    path: string;
    type: string;
    size?: number;
  };
  isVisible: boolean;
  onClose: () => void;
}
const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  isVisible,
  onClose
}) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };
  const isImageFile = (fileName: string): boolean => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'];
    return imageExtensions.includes(getFileExtension(fileName));
  };
  const isTextFile = (fileName: string): boolean => {
    const textExtensions = ['txt', 'md', 'json', 'xml', 'csv', 'log', 'ini', 'yaml', 'yml', 'toml'];
    return textExtensions.includes(getFileExtension(fileName));
  };
  const isPdfFile = (fileName: string): boolean => {
    return getFileExtension(fileName) === 'pdf';
  };
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '未知大小';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return size.toFixed(1) + " " + units[unitIndex];
  };
  useEffect(() => {
    if (!isVisible || !file) return;
    const loadFileContent = async () => {
      setIsLoading(true);
      setError('');
      setContent('');
      try {
        if (isImageFile(file.name)) {
          setContent("file: " + file.path);
        } else if (isTextFile(file.name)) {
          try {
            setContent('文本内容预览功能需要使用Tauri API实现');
          } catch (err) {
            setError('无法读取文件内容');
          }
        } else if (isPdfFile(file.name)) {
          setContent(file.name + " 是PDF文件，暂不支持预览");
        } else {
          setError('不支持的文件类型预览');
        }
      } catch (err) {
        setError('加载文件失败');
      } finally {
        setIsLoading(false);
      }
    };
    loadFileContent();
  }, [isVisible, file]);
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = content;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  if (!isVisible) return null;
  return <div className="file-preview-overlay">
      <div className="file-preview-container">
        <div className="file-preview-header">
          <div className="file-preview-info">
            <h3 className="file-preview-title">{file.name}</h3>
            <span className="file-preview-size">{formatFileSize(file.size)}</span>
          </div>
          <div className="file-preview-actions">
            {isImageFile(file.name) && <>
                <button className="preview-action-button" onClick={handleZoomOut} title="缩小">
                  <ZoomOut size={16} />
                </button>
                <button className="preview-action-button" onClick={handleZoomIn} title="放大">
                  <ZoomIn size={16} />
                </button>
                <button className="preview-action-button" onClick={handleRotate} title="旋转">
                  <RotateCw size={16} />
                </button>
                <button className="preview-action-button" onClick={resetTransform} title="重置">
                  重置
                </button>
              </>}
            <button className="preview-action-button" onClick={handleDownload} title="下载">
              <Download size={16} />
            </button>
            <button className="preview-action-button close-button" onClick={onClose} title="关闭">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="file-preview-content">
          {isLoading ? <div className="file-preview-loading">加载中...</div> : error ? <div className="file-preview-error">
              <div className="error-message">{error}</div>
            </div> : <>
              {isImageFile(file.name) && <div className="image-preview-container">
                  <img src={content} alt={file.name} className="image-preview" style={{
              transform: "scale(" + zoom + ") rotate(" + rotation + "deg)",
              transition: 'transform 0.3s ease'
            }} />
                </div>}
              {isTextFile(file.name) && <div className="text-preview-container">
                  <pre className="text-preview">{content}</pre>
                </div>}
              {isPdfFile(file.name) && <div className="pdf-preview-container">
                  <iframe src={content} title={file.name} className="pdf-preview" width="100%" height="100%" />
                </div>}
            </>}
        </div>
      </div>
    </div>;
};
export default FilePreview;