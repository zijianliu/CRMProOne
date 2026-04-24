import React, { useState, useEffect, useCallback } from 'react';
import {
  Badge,
  Dropdown,
  Menu,
  List,
  Typography,
  Button,
  Tag,
  Empty,
  Spin,
  message
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  MessageOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { notificationApi, setCurrentUser, getCurrentUser, userApi } from '../services/api';
import {
  Notification,
  NotificationType,
  NotificationTypeLabelMap,
  User,
  UserRole,
  RoleLabelMap,
  isAdmin,
  isHandler
} from '../types';

const { Text } = Typography;

interface NotificationCenterProps {
  onUserChange?: (user: User | null) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.TICKET_ASSIGNED:
      return <TeamOutlined style={{ color: '#722ed1' }} />;
    case NotificationType.STATUS_CHANGED:
      return <SyncOutlined style={{ color: '#1890ff' }} />;
    case NotificationType.SLA_WARNING:
      return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    case NotificationType.SLA_OVERDUE:
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    case NotificationType.COMMENT_ADDED:
      return <MessageOutlined style={{ color: '#13c2c2' }} />;
    default:
      return <BellOutlined />;
  }
};

const getNotificationTypeColor = (type: NotificationType) => {
  switch (type) {
    case NotificationType.SLA_OVERDUE:
      return 'red';
    case NotificationType.SLA_WARNING:
      return 'orange';
    case NotificationType.TICKET_ASSIGNED:
      return 'purple';
    case NotificationType.STATUS_CHANGED:
      return 'blue';
    case NotificationType.COMMENT_ADDED:
      return 'cyan';
    default:
      return 'default';
  }
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onUserChange }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentUser, setCurrentUserState] = useState<User | null>(getCurrentUser());
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!getCurrentUser()) return;
    try {
      const result = await notificationApi.getUnreadCount();
      setUnreadCount(result.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!getCurrentUser()) return;
    setLoading(true);
    try {
      const result = await notificationApi.getNotifications();
      setNotifications(result);
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      message.error('获取通知列表失败');
    } finally {
      setLoading(false);
    }
  }, [fetchUnreadCount]);

  const fetchAllUsers = useCallback(async () => {
    try {
      const result = await userApi.getAllUsers();
      setAllUsers(result);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleUserSelect = async (user: User) => {
    setCurrentUserState(user);
    setCurrentUser(user);
    onUserChange?.(user);
    fetchUnreadCount();
    message.success(`已切换到用户: ${user.displayName} (${RoleLabelMap[user.role]})`);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await notificationApi.markAsRead(notification.id);
        fetchUnreadCount();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    navigate(`/ticket/${notification.ticketId}`);
    setOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      fetchNotifications();
      message.success('已标记所有通知为已读');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      message.error('操作失败');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && getCurrentUser()) {
      fetchNotifications();
    }
  };

  const userMenuItems: MenuProps['items'] = allUsers.map(user => ({
    key: user.id,
    label: (
      <div style={{ padding: '4px 0' }}>
        <div style={{ fontWeight: 500 }}>{user.displayName}</div>
        <div style={{ fontSize: 12, color: '#999' }}>
          <Tag color={isAdmin(user) ? 'red' : isHandler(user) ? 'blue' : 'green'}>
            {RoleLabelMap[user.role]}
          </Tag>
          ({user.username})
        </div>
      </div>
    ),
    onClick: () => handleUserSelect(user)
  }));

  const notificationList = (
    <div style={{ width: 400, maxHeight: 500, overflow: 'auto' }}>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <Empty description="暂无通知" style={{ padding: 40 }} />
      ) : (
        <>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>通知列表</Text>
            {unreadCount > 0 && (
              <Button type="link" size="small" onClick={handleMarkAllAsRead}>
                全部已读
              </Button>
            )}
          </div>
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                style={{ 
                  cursor: 'pointer', 
                  background: item.isRead ? '#fff' : '#f5f5f5',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0'
                }}
                onClick={() => handleNotificationClick(item)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getNotificationIcon(item.type)}
                    </div>
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {!item.isRead && <span style={{ color: '#ff4d4f', marginRight: 4 }}>●</span>}
                        <Tag color={getNotificationTypeColor(item.type)} style={{ marginRight: 8 }}>
                          {NotificationTypeLabelMap[item.type]}
                        </Tag>
                        <Text strong>{item.title}</Text>
                      </span>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </Text>
                    </div>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {item.content}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}
    </div>
  );

  const userSelector = (
    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'white', marginRight: 16 }}>
        <div style={{ 
          width: 28, 
          height: 28, 
          borderRadius: '50%', 
          background: currentUser ? (isAdmin(currentUser) ? '#ff4d4f' : isHandler(currentUser) ? '#1890ff' : '#52c41a') : '#999', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: 8,
          fontSize: 14,
          fontWeight: 'bold',
          color: 'white'
        }}>
          {currentUser ? currentUser.displayName.charAt(0) : '?'}
        </div>
        <span style={{ marginRight: 4 }}>
          {currentUser ? currentUser.displayName : '选择用户'}
        </span>
        {currentUser && (
          <Tag color={isAdmin(currentUser) ? 'red' : isHandler(currentUser) ? 'blue' : 'green'} style={{ marginRight: 0 }}>
            {currentUser ? RoleLabelMap[currentUser.role] : ''}
          </Tag>
        )}
      </div>
    </Dropdown>
  );

  const notificationIcon = (
    <Badge count={unreadCount} overflowCount={99} offset={[5, 0]}>
      <BellOutlined style={{ fontSize: 18, color: 'white' }} />
    </Badge>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {userSelector}
      {currentUser && (
        <Dropdown
          dropdownRender={() => notificationList}
          open={open}
          onOpenChange={handleOpenChange}
          placement="bottomRight"
        >
          <div style={{ cursor: 'pointer', padding: '0 12px' }}>
            {notificationIcon}
          </div>
        </Dropdown>
      )}
    </div>
  );
};

export default NotificationCenter;
