import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  message,
  Row,
  Col,
  Space,
  Upload,
  Tag,
  Tooltip,
  Alert
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ClearOutlined,
  InboxOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
import { ticketApi, getCurrentUser } from '../services/api';
import { 
  CreateTicketRequest, 
  TicketPriority, 
  PriorityLabelMap,
  AttachmentConfig,
  formatFileSize,
  User
} from '../types';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.txt', '.pdf'];
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'text/plain',
  'application/pdf'
];

const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [attachmentConfig, setAttachmentConfig] = useState<AttachmentConfig | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [handlerUsers, setHandlerUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await ticketApi.getAttachmentConfig();
        setAttachmentConfig(config);
      } catch (error) {
        console.error('Failed to fetch attachment config:', error);
      }
    };
    fetchConfig();

    const fetchHandlers = async () => {
      try {
        const handlers = await ticketApi.getHandlerUsers();
        setHandlerUsers(handlers);
      } catch (error) {
        console.error('Failed to fetch handlers:', error);
      }
    };
    fetchHandlers();
  }, []);

  const maxAttachments = attachmentConfig?.maxAttachmentsPerTicket || 3;
  const maxFileSize = attachmentConfig?.maxAttachmentSize || 5 * 1024 * 1024;
  const maxFileSizeMB = attachmentConfig?.maxAttachmentSizeMB || 5;

  const getFileExtension = (fileName: string): string => {
    return '.' + fileName.split('.').pop()?.toLowerCase() || '';
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const fileExtension = getFileExtension(file.name);
    const isAllowedExtension = ALLOWED_EXTENSIONS.includes(fileExtension);
    const isAllowedType = ALLOWED_MIME_TYPES.includes(file.type) || 
      (file.type === '' && ALLOWED_EXTENSIONS.includes(fileExtension));

    if (!isAllowedExtension && !isAllowedType) {
      message.error(`文件类型不允许！请上传 ${ALLOWED_EXTENSIONS.join(', ')} 格式的文件`);
      return Upload.LIST_IGNORE;
    }

    if (file.size > maxFileSize) {
      message.error(`文件大小不能超过 ${maxFileSizeMB}MB！`);
      return Upload.LIST_IGNORE;
    }

    if (filesToUpload.length >= maxAttachments) {
      message.error(`最多只能上传 ${maxAttachments} 个附件！`);
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handleFileChange: UploadProps['onChange'] = (info) => {
    const { fileList: newFileList } = info;
    
    setFileList(newFileList);
    
    const actualFiles: File[] = [];
    for (const f of newFileList) {
      if (f.originFileObj) {
        actualFiles.push(f.originFileObj);
      }
    }
    setFilesToUpload(actualFiles);
  };

  const handleRemoveFile = (file: UploadFile) => {
    const newFileList = fileList.filter(f => f.uid !== file.uid);
    setFileList(newFileList);
    
    const actualFiles: File[] = [];
    for (const f of newFileList) {
      if (f.originFileObj) {
        actualFiles.push(f.originFileObj);
      }
    }
    setFilesToUpload(actualFiles);
    return true;
  };

  const handleSubmit = async (values: CreateTicketRequest) => {
    setLoading(true);
    try {
      const ticket = await ticketApi.createTicket(values);
      message.success('工单创建成功！');

      if (filesToUpload.length > 0 && ticket.id) {
        for (const file of filesToUpload) {
          try {
            await ticketApi.uploadAttachment(ticket.id, file, values.submitter);
          } catch (uploadError) {
            console.error('Failed to upload attachment:', uploadError);
            message.warning(`附件「${file.name}」上传失败`);
          }
        }
        message.success('附件上传完成！');
      }

      navigate(`/ticket/${ticket.id}`);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      message.error('工单创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setFileList([]);
    setFilesToUpload([]);
  };

  const handleBack = () => {
    navigate('/');
  };

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload,
    onChange: handleFileChange,
    onRemove: handleRemoveFile,
    multiple: true,
    accept: '.jpg,.jpeg,.png,.txt,.pdf',
    maxCount: maxAttachments
  };

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={handleBack}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Card title="新建工单" className="page-container">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            priority: TicketPriority.MEDIUM
          }}
          style={{ maxWidth: 800 }}
        >
          <Form.Item
            name="title"
            label="工单标题"
            rules={[
              { required: true, message: '请输入工单标题' },
              { max: 200, message: '标题不能超过200个字符' }
            ]}
          >
            <Input
              placeholder="请输入工单标题，简要描述问题"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="submitter"
                label="提交人"
                rules={[
                  { required: true, message: '请输入提交人姓名' },
                  { max: 50, message: '提交人姓名不能超过50个字符' }
                ]}
                initialValue={getCurrentUser()?.displayName || ''}
              >
                <Input 
                  placeholder="请输入提交人姓名" 
                  maxLength={50} 
                  disabled={!!getCurrentUser()}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="assignee"
                label="处理人（可选）"
              >
                <Select 
                  placeholder="请选择处理人（可选）"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {handlerUsers.map(user => (
                    <Option key={user.username} value={user.username}>
                      {user.displayName} ({user.username})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="请选择优先级">
              {Object.entries(PriorityLabelMap).map(([key, label]) => (
                <Option key={key} value={key}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="详细描述"
            rules={[
              { required: true, message: '请输入问题描述' },
              { max: 2000, message: '描述不能超过2000个字符' }
            ]}
          >
            <TextArea
              placeholder="请详细描述问题或需求，包括相关背景、遇到的问题、期望结果等信息..."
              rows={8}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="附件上传"
            extra={
              <Space>
                <span>支持格式：</span>
                {ALLOWED_EXTENSIONS.map(ext => (
                  <Tag key={ext}>{ext}</Tag>
                ))}
              </Space>
            }
          >
            <Alert
              message={`附件限制：最多 ${maxAttachments} 个文件，单个文件不超过 ${maxFileSizeMB}MB`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
              <p className="ant-upload-hint">
                已上传 {fileList.length}/{maxAttachments} 个文件
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
              >
                提交工单
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={handleReset}
              >
                重置
              </Button>
              <Button onClick={handleBack}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateTicket;
