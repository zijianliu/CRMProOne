import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tag,
  Button,
  Select,
  Form,
  Input,
  List,
  Spin,
  message,
  Row,
  Col,
  Descriptions,
  Space,
  Divider,
  Timeline,
  Upload,
  Alert,
  Tooltip,
  Typography,
  Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  InboxOutlined,
  DownloadOutlined,
  FileOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload/interface';
import { ticketApi, userApi, getCurrentUser } from '../services/api';
import {
  Ticket,
  TicketComment,
  Attachment,
  ActionLog,
  TicketStatus,
  TicketPriority,
  ActionType,
  UserRole,
  SLAStatus,
  SLAInfo,
  User,
  StatusLabelMap,
  PriorityLabelMap,
  ActionTypeLabelMap,
  SLAStatusLabelMap,
  RoleLabelMap,
  getNextStatusOptions,
  formatFileSize,
  AttachmentConfig,
  isAdmin,
  isHandler
} from '../types';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.txt', '.pdf'];
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'text/plain',
  'application/pdf'
];

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImageOutlined style={{ color: '#52c41a' }} />;
  if (mimeType === 'application/pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
  if (mimeType === 'text/plain') return <FileTextOutlined style={{ color: '#1890ff' }} />;
  return <FileOutlined style={{ color: '#8c8c8c' }} />;
};

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [attachmentConfig, setAttachmentConfig] = useState<AttachmentConfig | null>(null);
  
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assigneeUpdating, setAssigneeUpdating] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'comments'>('logs');
  
  const [form] = Form.useForm();
  const [assigneeForm] = Form.useForm();

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await ticketApi.getTicketById(id);
      setTicket(data);
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      message.error('获取工单详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const data = await ticketApi.getComments(id);
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      message.error('获取备注失败');
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  const fetchActionLogs = useCallback(async () => {
    if (!id) return;
    setLogsLoading(true);
    try {
      const data = await ticketApi.getActionLogs(id);
      setActionLogs(data);
    } catch (error) {
      console.error('Failed to fetch action logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, [id]);

  const fetchAttachments = useCallback(async () => {
    if (!id) return;
    setAttachmentsLoading(true);
    try {
      const data = await ticketApi.getAttachments(id);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [id]);

  const fetchAssignees = useCallback(async () => {
    try {
      const users = await userApi.getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  const fetchAttachmentConfig = useCallback(async () => {
    try {
      const config = await ticketApi.getAttachmentConfig();
      setAttachmentConfig(config);
    } catch (error) {
      console.error('Failed to fetch attachment config:', error);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchTicket();
      fetchComments();
      fetchActionLogs();
      fetchAttachments();
      fetchAssignees();
      fetchAttachmentConfig();
    }
  }, [id, fetchTicket, fetchComments, fetchActionLogs, fetchAttachments, fetchAssignees, fetchAttachmentConfig]);

  const maxAttachments = attachmentConfig?.maxAttachmentsPerTicket || 3;
  const maxFileSize = attachmentConfig?.maxAttachmentSize || 5 * 1024 * 1024;
  const maxFileSizeMB = attachmentConfig?.maxAttachmentSizeMB || 5;
  const remainingSlots = maxAttachments - attachments.length;

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!id || !ticket) return;
    
    setStatusUpdating(true);
    try {
      const updatedTicket = await ticketApi.updateTicketStatus(id, newStatus, '当前用户');
      setTicket(updatedTicket);
      message.success('状态更新成功');
      fetchActionLogs();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      const errorMsg = error.response?.data?.message || error.message || '状态更新失败';
      message.error(errorMsg);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssigneeChange = async (values: { assignee: string }) => {
    if (!id || !ticket) return;
    
    setAssigneeUpdating(true);
    try {
      const newAssignee = values.assignee || null;
      const updatedTicket = await ticketApi.updateTicketAssignee(id, newAssignee, '当前用户');
      setTicket(updatedTicket);
      message.success('处理人更新成功');
      fetchActionLogs();
    } catch (error: any) {
      console.error('Failed to update assignee:', error);
      const errorMsg = error.response?.data?.message || error.message || '处理人更新失败';
      message.error(errorMsg);
    } finally {
      setAssigneeUpdating(false);
    }
  };

  const handleCommentSubmit = async (values: { content: string; author: string }) => {
    if (!id) return;
    
    setCommentSubmitting(true);
    try {
      const newComment = await ticketApi.addComment(id, {
        content: values.content,
        author: values.author
      });
      setComments(prev => [...prev, newComment]);
      form.resetFields();
      message.success('备注添加成功');
      fetchActionLogs();
    } catch (error) {
      console.error('Failed to add comment:', error);
      message.error('备注添加失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

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

    if (filesToUpload.length >= remainingSlots) {
      message.error(`该工单还能上传 ${remainingSlots} 个附件！`);
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

  const handleUploadAttachments = async () => {
    if (!id || filesToUpload.length === 0) return;
    
    setUploading(true);
    try {
      for (const file of filesToUpload) {
        try {
          await ticketApi.uploadAttachment(id, file, '当前用户');
        } catch (uploadError) {
          console.error('Failed to upload attachment:', uploadError);
          message.warning(`附件「${file.name}」上传失败`);
        }
      }
      message.success('附件上传成功！');
      setFileList([]);
      setFilesToUpload([]);
      fetchAttachments();
      fetchActionLogs();
    } catch (error) {
      console.error('Failed to upload attachments:', error);
      message.error('附件上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    const url = ticketApi.getAttachmentDownloadUrl(attachment.id);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBack = () => {
    navigate('/');
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.PENDING:
        return 'warning';
      case TicketStatus.IN_PROGRESS:
        return 'processing';
      case TicketStatus.RESOLVED:
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.LOW:
        return 'default';
      case TicketPriority.MEDIUM:
        return 'blue';
      case TicketPriority.HIGH:
        return 'orange';
      case TicketPriority.URGENT:
        return 'red';
      default:
        return 'default';
    }
  };

  const getLogIcon = (actionType: ActionType) => {
    switch (actionType) {
      case ActionType.STATUS_CHANGE:
        return <SyncOutlined style={{ color: '#1890ff' }} />;
      case ActionType.ASSIGNEE_CHANGE:
        return <UserOutlined style={{ color: '#722ed1' }} />;
      case ActionType.COMMENT_ADD:
        return <MessageOutlined style={{ color: '#13c2c2' }} />;
      case ActionType.ATTACHMENT_ADD:
        return <FileOutlined style={{ color: '#fa8c16' }} />;
      case ActionType.TICKET_CREATE:
        return <PlusOutlined style={{ color: '#52c41a' }} />;
      default:
        return <EditOutlined />;
    }
  };

  const formatLogDescription = (log: ActionLog) => {
    switch (log.actionType) {
      case ActionType.STATUS_CHANGE:
        const oldStatus = log.oldValue as TicketStatus;
        const newStatus = log.newValue as TicketStatus;
        return (
          <span>
            状态从 <Tag color={getStatusColor(oldStatus)}>{StatusLabelMap[oldStatus]}</Tag> 变更为 
            <Tag color={getStatusColor(newStatus)}>{StatusLabelMap[newStatus]}</Tag>
          </span>
        );
      case ActionType.ASSIGNEE_CHANGE:
        return (
          <span>
            处理人从「{log.oldValue || '未分配'}」变更为「{log.newValue || '未分配'}」
          </span>
        );
      case ActionType.COMMENT_ADD:
        return <span>添加了备注：{log.description}</span>;
      case ActionType.ATTACHMENT_ADD:
        return <span>上传了附件：{log.description}</span>;
      case ActionType.TICKET_CREATE:
        return <span>创建了工单</span>;
      default:
        return <span>{log.description}</span>;
    }
  };

  const currentUser = getCurrentUser();
  
  const hasPermissionToChangeStatus = (): boolean => {
    if (!currentUser || !ticket) return false;
    if (isAdmin(currentUser)) return true;
    if (isHandler(currentUser) && ticket.assignee === currentUser.username) return true;
    return false;
  };

  const hasPermissionToChangeAssignee = (): boolean => {
    if (!currentUser) return false;
    return isAdmin(currentUser);
  };

  const hasPermissionToAddComment = (): boolean => {
    if (!currentUser || !ticket) return false;
    if (isAdmin(currentUser)) return true;
    if (isHandler(currentUser)) return true;
    return false;
  };

  const nextStatusOptions = ticket ? getNextStatusOptions(ticket.status) : [];
  const canChangeStatus = nextStatusOptions.length > 0 && hasPermissionToChangeStatus();

  if (loading) {
    return (
      <div className="loading-container" style={{ padding: '100px 0', textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>加载中...</p>
      </div>
    );
  }

  if (!ticket) {
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
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Empty description="工单不存在或已被删除" />
            <Button type="primary" onClick={handleBack} style={{ marginTop: 16 }}>
              返回列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload,
    onChange: handleFileChange,
    onRemove: handleRemoveFile,
    multiple: true,
    accept: '.jpg,.jpeg,.png,.txt,.pdf',
    maxCount: remainingSlots
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

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
              <Col>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                  {ticket.title}
                </h2>
              </Col>
              <Col>
                <Space>
                  <Tag color={getStatusColor(ticket.status)}>
                    {StatusLabelMap[ticket.status]}
                  </Tag>
                  <Tag color={getPriorityColor(ticket.priority)}>
                    {PriorityLabelMap[ticket.priority]}
                  </Tag>
                </Space>
              </Col>
            </Row>

            <Descriptions bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="提交人">
                {(() => {
                  const user = allUsers.find(u => u.username === ticket.submitter);
                  return user ? user.displayName : ticket.submitter;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="处理人">
                {ticket.assignee ? (
                  <Tag color="blue" icon={<UserOutlined />}>
                    {(() => {
                      const user = allUsers.find(u => u.username === ticket.assignee);
                      return user ? user.displayName : ticket.assignee;
                    })()}
                  </Tag>
                ) : (
                  <Tag color="default">未分配</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(ticket.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(ticket.updatedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="工单ID" span={2}>
                <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>
                  {ticket.id}
                </code>
              </Descriptions.Item>
            </Descriptions>

            {ticket.slaInfo && (
              <Card 
                title={
                  <Space>
                    <ClockCircleOutlined />
                    SLA 服务等级
                  </Space>
                } 
                size="small" 
                style={{ marginBottom: 24 }}
              >
                <Descriptions bordered column={{ xs: 2, sm: 4 }} size="small">
                  <Descriptions.Item label="响应时限">
                    {ticket.priority === TicketPriority.URGENT ? '30 分钟' :
                     ticket.priority === TicketPriority.HIGH ? '2 小时' :
                     ticket.priority === TicketPriority.MEDIUM ? '4 小时' : '1 天'}
                  </Descriptions.Item>
                  <Descriptions.Item label="解决时限">
                    {ticket.priority === TicketPriority.URGENT ? '4 小时' :
                     ticket.priority === TicketPriority.HIGH ? '1 天' :
                     ticket.priority === TicketPriority.MEDIUM ? '2 天' : '3 天'}
                  </Descriptions.Item>
                  <Descriptions.Item label="当前状态">
                    <Tag color={
                      ticket.slaInfo.overallStatus === SLAStatus.NORMAL ? 'success' :
                      ticket.slaInfo.overallStatus === SLAStatus.WARNING ? 'warning' : 'error'
                    }>
                      {SLAStatusLabelMap[ticket.slaInfo.overallStatus]}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="剩余时间">
                    {(() => {
                      const deadline = new Date(ticket.slaInfo.resolutionDeadline);
                      const now = new Date();
                      
                      if (isNaN(deadline.getTime())) {
                        return <Text type="secondary">--</Text>;
                      }
                      
                      const remainingMs = deadline.getTime() - now.getTime();
                      const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
                      
                      if (remainingMinutes < 0) {
                        return (
                          <Text type="danger" strong>
                            已超时 {Math.abs(remainingMinutes)} 分钟
                          </Text>
                        );
                      }
                      
                      if (remainingMinutes < 60) {
                        return <Text>{remainingMinutes} 分钟</Text>;
                      }
                      
                      const hours = Math.floor(remainingMinutes / 60);
                      const minutes = remainingMinutes % 60;
                      
                      if (hours < 24) {
                        return <Text>{hours} 小时 {minutes} 分钟</Text>;
                      }
                      
                      const days = Math.floor(hours / 24);
                      const remainingHours = hours % 24;
                      
                      return <Text>{days} 天 {remainingHours} 小时</Text>;
                    })()}
                  </Descriptions.Item>
                </Descriptions>
                
                <Divider />
                
                <Row gutter={16}>
                  <Col xs={12} sm={6}>
                    <Text strong>响应时间:</Text>
                  </Col>
                  <Col xs={12} sm={18}>
                    <Space>
                      {(() => {
                        const date = new Date(ticket.slaInfo.responseDeadline);
                        if (isNaN(date.getTime())) {
                          return <Text type="secondary">--</Text>;
                        }
                        return <Text>{date.toLocaleString('zh-CN')}</Text>;
                      })()}
                      <Tag color={
                        ticket.slaInfo.responseStatus === SLAStatus.NORMAL ? 'success' :
                        ticket.slaInfo.responseStatus === SLAStatus.WARNING ? 'warning' : 'error'
                      }>
                        {SLAStatusLabelMap[ticket.slaInfo.responseStatus]}
                      </Tag>
                      {ticket.slaInfo.responseTime && (() => {
                        const date = new Date(ticket.slaInfo.responseTime);
                        if (isNaN(date.getTime())) {
                          return null;
                        }
                        return (
                          <Text type="success">
                            实际响应: {date.toLocaleString('zh-CN')}
                          </Text>
                        );
                      })()}
                    </Space>
                  </Col>
                </Row>
                
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col xs={12} sm={6}>
                    <Text strong>解决时间:</Text>
                  </Col>
                  <Col xs={12} sm={18}>
                    <Space>
                      {(() => {
                        const date = new Date(ticket.slaInfo.resolutionDeadline);
                        if (isNaN(date.getTime())) {
                          return <Text type="secondary">--</Text>;
                        }
                        return <Text>{date.toLocaleString('zh-CN')}</Text>;
                      })()}
                      <Tag color={
                        ticket.slaInfo.resolutionStatus === SLAStatus.NORMAL ? 'success' :
                        ticket.slaInfo.resolutionStatus === SLAStatus.WARNING ? 'warning' : 'error'
                      }>
                        {SLAStatusLabelMap[ticket.slaInfo.resolutionStatus]}
                      </Tag>
                      {ticket.slaInfo.resolutionTime && (() => {
                        const date = new Date(ticket.slaInfo.resolutionTime);
                        if (isNaN(date.getTime())) {
                          return null;
                        }
                        return (
                          <Text type="success">
                            实际解决: {date.toLocaleString('zh-CN')}
                          </Text>
                        );
                      })()}
                    </Space>
                  </Col>
                </Row>
              </Card>
            )}

            <Card title="问题描述" size="small" style={{ marginBottom: 24 }}>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {ticket.description}
              </div>
            </Card>

            <Divider />

            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12}>
                <Card 
                  title={
                    <Space>
                      <EditOutlined />
                      修改状态
                    </Space>
                  } 
                  size="small"
                >
                  {canChangeStatus ? (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text type="secondary">
                        当前状态：<Tag color={getStatusColor(ticket.status)}>{StatusLabelMap[ticket.status]}</Tag>
                      </Text>
                      <Select
                        placeholder="选择目标状态"
                        onChange={handleStatusChange}
                        loading={statusUpdating}
                        style={{ width: '100%' }}
                      >
                        {nextStatusOptions.map(option => (
                          <Option key={option.value} value={option.value}>
                            {option.value === TicketStatus.IN_PROGRESS && (
                              <SyncOutlined spin style={{ color: '#1890ff', marginRight: 8 }} />
                            )}
                            {option.value === TicketStatus.RESOLVED && (
                              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                            )}
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </Space>
                  ) : (
                    <Alert
                      message="该工单已处于最终状态，无法再修改状态"
                      type="info"
                      showIcon
                      size="small"
                    />
                  )}
                </Card>
              </Col>

              {hasPermissionToChangeAssignee() && (
                <Col xs={24} sm={12}>
                  <Card 
                    title={
                      <Space>
                        <TeamOutlined />
                        修改处理人
                      </Space>
                    } 
                    size="small"
                  >
                    <Form
                      form={assigneeForm}
                      layout="vertical"
                      onFinish={handleAssigneeChange}
                      initialValues={{ assignee: ticket.assignee || undefined }}
                    >
                      <Form.Item name="assignee" style={{ marginBottom: 12 }}>
                        <Select
                          placeholder="选择处理人（可清空）"
                          allowClear
                          showSearch
                          optionFilterProp="children"
                        >
                          {allUsers.filter(u => u.role === UserRole.HANDLER).map(user => (
                            <Option key={user.username} value={user.username}>
                              {user.displayName} ({user.username})
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={assigneeUpdating}
                          size="small"
                        >
                          确认修改
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>
              )}
            </Row>

            <Divider />

            <Card 
              title={
                <Space>
                  <InboxOutlined />
                  附件管理
                  <Tag color="orange">{attachments.length}/{maxAttachments}</Tag>
                </Space>
              }
              size="small"
              style={{ marginBottom: 24 }}
            >
              {attachments.length > 0 && (
                <List
                  dataSource={attachments}
                  style={{ marginBottom: 16 }}
                  renderItem={(attachment) => (
                    <List.Item
                      actions={[
                        <Button
                          key="download"
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadAttachment(attachment)}
                        >
                          下载
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={getFileIcon(attachment.mimeType)}
                        title={
                          <Tooltip title={attachment.originalName}>
                            <Text ellipsis style={{ maxWidth: 200 }}>
                              {attachment.originalName}
                            </Text>
                          </Tooltip>
                        }
                        description={
                          <Space>
                            <Text type="secondary">{formatFileSize(attachment.fileSize)}</Text>
                            <Text type="secondary">上传者: {attachment.uploadedBy}</Text>
                            <Text type="secondary">
                              {new Date(attachment.createdAt).toLocaleString('zh-CN')}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}

              {attachments.length === 0 && (
                <Empty
                  description="暂无附件"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ marginBottom: 16 }}
                />
              )}

              {remainingSlots > 0 && (
                <div>
                  <Divider />
                  <Alert
                    message={`还可上传 ${remainingSlots} 个附件，单个文件不超过 ${maxFileSizeMB}MB`}
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
                      支持格式：{ALLOWED_EXTENSIONS.join(', ')}
                    </p>
                  </Dragger>
                  {filesToUpload.length > 0 && (
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <Button
                        type="primary"
                        onClick={handleUploadAttachments}
                        loading={uploading}
                      >
                        上传 {filesToUpload.length} 个文件
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {remainingSlots === 0 && (
                <Alert
                  message="该工单附件数量已达上限"
                  type="warning"
                  showIcon
                />
              )}
            </Card>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            tabList={[
              {
                key: 'logs',
                tab: (
                  <Space>
                    <EditOutlined />
                    处理记录
                    <Tag color="purple">{actionLogs.length}</Tag>
                  </Space>
                )
              },
              {
                key: 'comments',
                tab: (
                  <Space>
                    <MessageOutlined />
                    备注列表
                    <Tag color="blue">{comments.length}</Tag>
                  </Space>
                )
              }
            ]}
            activeTabKey={activeTab}
            onTabChange={(key) => setActiveTab(key as 'logs' | 'comments')}
          >
            {activeTab === 'logs' && (
              <div>
                {hasPermissionToAddComment() && (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCommentSubmit}
                    style={{ marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8 }}
                  >
                    <Form.Item
                      name="author"
                      label="处理人"
                      rules={[{ required: true, message: '请输入处理人姓名' }]}
                      initialValue={currentUser?.displayName || ''}
                    >
                      <Input placeholder="请输入您的姓名" maxLength={50} disabled={!!currentUser} />
                    </Form.Item>
                    <Form.Item
                      name="content"
                      label="备注内容"
                      rules={[{ required: true, message: '请输入备注内容' }]}
                    >
                      <TextArea
                        placeholder="请输入处理备注，记录当前处理进度、遇到的问题或解决方案等信息..."
                        rows={3}
                        maxLength={1000}
                        showCount
                      />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={commentSubmitting}
                        icon={<MessageOutlined />}
                      >
                        添加备注
                      </Button>
                    </Form.Item>
                  </Form>
                )}

                <Spin spinning={logsLoading}>
                  {actionLogs.length === 0 ? (
                    <Empty description="暂无处理记录" />
                  ) : (
                    <Timeline
                      mode="left"
                      items={actionLogs.map((log) => ({
                        color: log.actionType === ActionType.STATUS_CHANGE ? 'blue' : 
                               log.actionType === ActionType.COMMENT_ADD ? 'cyan' :
                               log.actionType === ActionType.ASSIGNEE_CHANGE ? 'purple' :
                               log.actionType === ActionType.ATTACHMENT_ADD ? 'orange' : 'green',
                        dot: getLogIcon(log.actionType),
                        children: (
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              <Space>
                                <Tag color="default">{ActionTypeLabelMap[log.actionType]}</Tag>
                                <Text strong>{log.operator}</Text>
                              </Space>
                            </div>
                            <div style={{ marginBottom: 4 }}>
                              {formatLogDescription(log)}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(log.createdAt).toLocaleString('zh-CN')}
                            </Text>
                          </div>
                        )
                      }))}
                    />
                  )}
                </Spin>
              </div>
            )}

            {activeTab === 'comments' && (
              <div>
                {hasPermissionToAddComment() && (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCommentSubmit}
                    style={{ marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8 }}
                  >
                    <Form.Item
                      name="author"
                      label="处理人"
                      rules={[{ required: true, message: '请输入处理人姓名' }]}
                      initialValue={currentUser?.displayName || ''}
                    >
                      <Input placeholder="请输入您的姓名" maxLength={50} disabled={!!currentUser} />
                    </Form.Item>
                    <Form.Item
                      name="content"
                      label="备注内容"
                      rules={[{ required: true, message: '请输入备注内容' }]}
                    >
                      <TextArea
                        placeholder="请输入处理备注，记录当前处理进度、遇到的问题或解决方案等信息..."
                        rows={3}
                        maxLength={1000}
                        showCount
                      />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={commentSubmitting}
                        icon={<MessageOutlined />}
                      >
                        添加备注
                      </Button>
                    </Form.Item>
                  </Form>
                )}

                <Spin spinning={commentsLoading}>
                  {comments.length === 0 ? (
                    <Empty description="暂无处理备注" />
                  ) : (
                    <List
                      dataSource={comments}
                      renderItem={(comment) => (
                        <List.Item style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
                          <List.Item.Meta
                            avatar={
                              <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: '#1890ff',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                                fontWeight: 'bold'
                              }}>
                                {comment.author.charAt(0)}
                              </div>
                            }
                            title={
                              <Space>
                                <span style={{ fontWeight: 600 }}>{comment.author}</span>
                                <span style={{ fontSize: 12, color: '#999' }}>
                                  {new Date(comment.createdAt).toLocaleString('zh-CN')}
                                </span>
                              </Space>
                            }
                            description={
                              <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                {comment.content}
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Spin>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TicketDetail;
