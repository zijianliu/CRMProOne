import React, { useState, useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu, Alert } from 'antd';
import {
  UnorderedListOutlined,
  PlusOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import TicketList from './pages/TicketList';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';
import NotificationCenter from './components/NotificationCenter';
import { setCurrentUser, getCurrentUser } from './services/api';
import { User, isSubmitter } from './types';

const { Header, Content } = Layout;

const App: React.FC = () => {
  const [currentUser, setCurrentUserState] = useState<User | null>(getCurrentUser());
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUserChange = useCallback((user: User | null) => {
    setCurrentUserState(user);
    setRefreshKey(prev => prev + 1);
  }, []);

  const menuItems = [
    {
      key: '/',
      icon: <UnorderedListOutlined />,
      label: <Link to="/">工单列表</Link>
    },
    ...(isSubmitter(currentUser) ? [
      {
        key: '/create',
        icon: <PlusOutlined />,
        label: <Link to="/create">新建工单</Link>
      }
    ] : [])
  ];

  return (
    <Layout>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div className="logo" style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginRight: '24px' }}>
          工单管理系统
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['/']}
          items={menuItems}
          style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
        />
        <NotificationCenter onUserChange={handleUserChange} />
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
        {!currentUser && (
          <Alert
            message="请先选择用户"
            description="点击右上角的「选择用户」来切换当前登录用户，体验不同角色的权限控制。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Routes key={refreshKey}>
          <Route path="/" element={<TicketList />} />
          <Route path="/create" element={<CreateTicket />} />
          <Route path="/ticket/:id" element={<TicketDetail />} />
        </Routes>
      </Content>
    </Layout>
  );
};

export default App;
