import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Select,
  Input,
  DatePicker,
  Row,
  Col,
  Card,
  Tag,
  Space,
  Spin,
  message,
  Pagination,
  Statistic,
  Divider,
  Empty
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ticketApi, userApi } from '../services/api';
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  SLAStatus,
  SLAInfo,
  User,
  StatusLabelMap,
  PriorityLabelMap,
  SLAStatusLabelMap,
  Statistics
} from '../types';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface FilterParams {
  page: number;
  pageSize: number;
  filterStatus: TicketStatus | undefined;
  filterPriority: TicketPriority | undefined;
  filterAssignee: string | undefined;
  myAssignee: string;
  searchKeyword: string;
  startDate: string | undefined;
  endDate: string | undefined;
}

const TicketList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    pending: 0,
    inProgress: 0,
    resolved: 0,
    total: 0,
    myTickets: 0
  });
  const [allAssignees, setAllAssignees] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  const [params, setParams] = useState<FilterParams>({
    page: 1,
    pageSize: 10,
    filterStatus: undefined,
    filterPriority: undefined,
    filterAssignee: undefined,
    myAssignee: '',
    searchKeyword: '',
    startDate: undefined,
    endDate: undefined
  });
  const [total, setTotal] = useState(0);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | undefined>();

  const fetchAssignees = useCallback(async () => {
    try {
      const assignees = await ticketApi.getAllAssignees();
      setAllAssignees(assignees);
    } catch (error) {
      console.error('Failed to fetch assignees:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const users = await userApi.getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    setStatisticsLoading(true);
    try {
      const data = await ticketApi.getStatistics(params.myAssignee || undefined);
      setStatistics(data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      message.error('获取统计数据失败');
    } finally {
      setStatisticsLoading(false);
    }
  }, [params.myAssignee]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ticketApi.getTickets(
        params.page,
        params.pageSize,
        params.filterStatus,
        params.filterPriority,
        params.searchKeyword,
        params.filterAssignee,
        params.myAssignee || undefined,
        params.startDate,
        params.endDate
      );
      setTickets(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      message.error('获取工单列表失败');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchAssignees();
    fetchUsers();
  }, [fetchAssignees, fetchUsers]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const updateParams = (newParams: Partial<FilterParams>) => {
    setParams(prev => ({
      ...prev,
      ...newParams,
      page: newParams.page !== undefined ? newParams.page : 1
    }));
  };

  const handleSearch = (value: string) => {
    updateParams({ searchKeyword: value });
  };

  const handleStatusChange = (value: TicketStatus | undefined) => {
    updateParams({ filterStatus: value });
  };

  const handlePriorityChange = (value: TicketPriority | undefined) => {
    updateParams({ filterPriority: value });
  };

  const handleAssigneeChange = (value: string | undefined) => {
    updateParams({ filterAssignee: value });
  };

  const handleMyAssigneeChange = (value: string) => {
    updateParams({ myAssignee: value });
  };

  const handleDateRangeChange = (dates: [Dayjs, Dayjs] | null) => {
    setDateRange(dates || undefined);
    if (dates) {
      updateParams({
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      });
    } else {
      updateParams({
        startDate: undefined,
        endDate: undefined
      });
    }
  };

  const handleReset = () => {
    setDateRange(undefined);
    setParams({
      page: 1,
      pageSize: 10,
      filterStatus: undefined,
      filterPriority: undefined,
      filterAssignee: undefined,
      myAssignee: '',
      searchKeyword: '',
      startDate: undefined,
      endDate: undefined
    });
  };

  const handlePageChange = (newPage: number) => {
    setParams(prev => ({ ...prev, page: newPage }));
  };

  const handleViewDetail = (id: string) => {
    navigate(`/ticket/${id}`);
  };

  const handleCreateTicket = () => {
    navigate('/create');
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

  const columns = [
    {
      title: '工单标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 200,
      render: (text: string, record: Ticket) => (
        <a onClick={() => handleViewDetail(record.id)} style={{ color: '#1890ff' }}>
          {text}
        </a>
      )
    },
    {
      title: '提交人',
      dataIndex: 'submitter',
      key: 'submitter',
      width: 100,
      render: (submitter: string) => {
        const user = allUsers.find(u => u.username === submitter);
        return user ? user.displayName : submitter;
      }
    },
    {
      title: '处理人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 100,
      render: (assignee: string | null) => (
        assignee ? (
          <Tag color="blue" icon={<UserOutlined />}>
            {(() => {
              const user = allUsers.find(u => u.username === assignee);
              return user ? user.displayName : assignee;
            })()}
          </Tag>
        ) : (
          <Tag color="default">未分配</Tag>
        )
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: TicketPriority) => (
        <Tag color={getPriorityColor(priority)}>
          {PriorityLabelMap[priority]}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: TicketStatus) => (
        <Tag color={getStatusColor(status)}>
          {StatusLabelMap[status]}
        </Tag>
      )
    },
    {
      title: 'SLA状态',
      key: 'slaStatus',
      width: 100,
      render: (_: any, record: Ticket) => {
        const slaInfo = record.slaInfo;
        if (!slaInfo) {
          return <Tag color="default">--</Tag>;
        }
        
        const getSLAStatusColor = (status: SLAStatus) => {
          switch (status) {
            case SLAStatus.NORMAL:
              return 'success';
            case SLAStatus.WARNING:
              return 'warning';
            case SLAStatus.OVERDUE:
              return 'error';
            default:
              return 'default';
          }
        };

        return (
          <Tag color={getSLAStatusColor(slaInfo.overallStatus)}>
            {SLAStatusLabelMap[slaInfo.overallStatus]}
          </Tag>
        );
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: Ticket) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record.id)}
        >
          详情
        </Button>
      )
    }
  ];

  const statisticsCards = [
    {
      title: '待处理',
      value: statistics.pending,
      color: '#fa8c16',
      icon: <ClockCircleOutlined />,
      onClick: () => handleStatusChange(TicketStatus.PENDING)
    },
    {
      title: '处理中',
      value: statistics.inProgress,
      color: '#1890ff',
      icon: <SyncOutlined />,
      onClick: () => handleStatusChange(TicketStatus.IN_PROGRESS)
    },
    {
      title: '已解决',
      value: statistics.resolved,
      color: '#52c41a',
      icon: <CheckCircleOutlined />,
      onClick: () => handleStatusChange(TicketStatus.RESOLVED)
    },
    {
      title: '我负责的',
      value: statistics.myTickets,
      color: '#722ed1',
      icon: <TeamOutlined />,
      onClick: () => handleMyAssigneeChange(params.myAssignee ? '' : '当前用户')
    },
    {
      title: '总工单',
      value: statistics.total,
      color: '#13c2c2',
      icon: <FileTextOutlined />,
      onClick: () => handleReset()
    }
  ];

  const hasActiveFilter = !!(
    params.filterStatus ||
    params.filterPriority ||
    params.filterAssignee ||
    params.myAssignee ||
    params.searchKeyword ||
    params.startDate ||
    params.endDate
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {statisticsCards.map((stat, index) => (
            <Col xs={12} sm={4} key={index}>
              <Card 
                hoverable
                onClick={stat.onClick}
                style={{ cursor: 'pointer' }}
              >
                <Statistic
                  title={stat.title}
                  value={stat.value}
                  valueStyle={{ color: stat.color }}
                  prefix={stat.icon}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Card>
        <div className="search-form">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={6}>
              <Select
                placeholder="选择状态"
                allowClear
                style={{ width: '100%' }}
                value={params.filterStatus}
                onChange={handleStatusChange}
              >
                <Option value={TicketStatus.PENDING}>待处理</Option>
                <Option value={TicketStatus.IN_PROGRESS}>处理中</Option>
                <Option value={TicketStatus.RESOLVED}>已解决</Option>
              </Select>
            </Col>
            <Col xs={24} sm={6}>
              <Select
                placeholder="选择优先级"
                allowClear
                style={{ width: '100%' }}
                value={params.filterPriority}
                onChange={handlePriorityChange}
              >
                <Option value={TicketPriority.LOW}>低</Option>
                <Option value={TicketPriority.MEDIUM}>中</Option>
                <Option value={TicketPriority.HIGH}>高</Option>
                <Option value={TicketPriority.URGENT}>紧急</Option>
              </Select>
            </Col>
            <Col xs={24} sm={6}>
              <Select
                placeholder="选择处理人"
                allowClear
                showSearch
                optionFilterProp="children"
                style={{ width: '100%' }}
                value={params.filterAssignee}
                onChange={handleAssigneeChange}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {allAssignees.map(assignee => (
                  <Option key={assignee} value={assignee}>
                    {assignee}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={6}>
              <Select
                placeholder="我负责的工单"
                allowClear
                style={{ width: '100%' }}
                value={params.myAssignee || undefined}
                onChange={handleMyAssigneeChange}
              >
                <Option value="当前用户">只看我负责的</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={handleDateRangeChange}
                placeholder={['开始日期', '结束日期']}
              />
            </Col>
            <Col xs={24} sm={10}>
              <Search
                placeholder="搜索工单标题、描述、提交人、处理人"
                allowClear
                enterButton={<SearchOutlined />}
                value={params.searchKeyword}
                onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                onSearch={handleSearch}
              />
            </Col>
            <Col xs={24} sm={6} style={{ textAlign: 'right' }}>
              <Button onClick={handleReset} style={{ marginRight: 8 }}>
                重置
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTicket}>
                新建工单
              </Button>
            </Col>
          </Row>
        </div>

        {hasActiveFilter && (
          <div style={{ marginTop: 16, padding: '8px 16px', background: '#fafafa', borderRadius: 4 }}>
            <Space size="small">
              <span>当前筛选：</span>
              {params.filterStatus && (
                <Tag closable onClose={() => handleStatusChange(undefined)}>
                  状态: {StatusLabelMap[params.filterStatus]}
                </Tag>
              )}
              {params.filterPriority && (
                <Tag closable onClose={() => handlePriorityChange(undefined)}>
                  优先级: {PriorityLabelMap[params.filterPriority]}
                </Tag>
              )}
              {params.filterAssignee && (
                <Tag closable onClose={() => handleAssigneeChange(undefined)}>
                  处理人: {params.filterAssignee}
                </Tag>
              )}
              {params.myAssignee && (
                <Tag color="purple" closable onClose={() => handleMyAssigneeChange('')}>
                  只看我负责的
                </Tag>
              )}
              {params.startDate && params.endDate && (
                <Tag closable onClose={() => handleDateRangeChange(null)}>
                  时间范围: {params.startDate} ~ {params.endDate}
                </Tag>
              )}
              {params.searchKeyword && (
                <Tag closable onClose={() => handleSearch('')}>
                  搜索: {params.searchKeyword}
                </Tag>
              )}
            </Space>
          </div>
        )}

        <Divider />

        <Spin spinning={loading}>
          {tickets.length === 0 && !loading ? (
            <Empty description="暂无工单数据" />
          ) : (
            <>
              <Table
                columns={columns}
                dataSource={tickets}
                rowKey="id"
                pagination={false}
                scroll={{ x: 1000 }}
              />
              
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Pagination
                  current={params.page}
                  pageSize={params.pageSize}
                  total={total}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                  showQuickJumper
                  showTotal={(total) => `共 ${total} 条记录`}
                />
              </div>
            </>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default TicketList;
