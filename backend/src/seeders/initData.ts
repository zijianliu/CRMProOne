import { initDatabase, saveDatabase, getDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { TicketStatus, TicketPriority } from '../types';

const sampleTickets = [
  {
    title: '系统登录页面响应慢',
    description: '最近一周发现登录页面加载时间过长，有时需要等待5-10秒才能显示。请技术团队检查一下服务器性能。',
    submitter: '张三',
    priority: TicketPriority.HIGH,
    status: TicketStatus.PENDING
  },
  {
    title: '客户投诉订单处理不及时',
    description: '客户反映上周提交的订单已经过去3天还没有处理状态更新。客户希望能尽快得到处理。',
    submitter: '李四',
    priority: TicketPriority.URGENT,
    status: TicketStatus.IN_PROGRESS
  },
  {
    title: '建议增加报表导出功能',
    description: '希望系统能支持按月导出销售报表，方便财务部门进行数据分析。建议支持 Excel 格式。',
    submitter: '王五',
    priority: TicketPriority.LOW,
    status: TicketStatus.PENDING
  },
  {
    title: '用户权限管理需要优化',
    description: '当前系统的权限设置不够灵活，希望能够支持自定义角色和权限分配。建议参考主流权限管理系统的设计。',
    submitter: '赵六',
    priority: TicketPriority.MEDIUM,
    status: TicketStatus.RESOLVED
  },
  {
    title: '移动端适配问题',
    description: '在手机浏览器上访问系统时，部分页面排版混乱，按钮难以点击。需要优化移动端体验。',
    submitter: '钱七',
    priority: TicketPriority.MEDIUM,
    status: TicketStatus.PENDING
  },
  {
    title: '数据备份功能异常',
    description: '最近尝试手动备份数据时，系统一直显示备份失败。需要检查备份日志和存储容量。',
    submitter: '孙八',
    priority: TicketPriority.HIGH,
    status: TicketStatus.IN_PROGRESS
  },
  {
    title: '新员工培训材料更新',
    description: '系统功能有更新，但培训材料还是旧版本。需要同步更新新员工的培训文档和视频教程。',
    submitter: '周九',
    priority: TicketPriority.LOW,
    status: TicketStatus.PENDING
  },
  {
    title: '邮件通知功能失效',
    description: '工单状态变更时，相关人员没有收到邮件通知。需要检查邮件服务配置和发送日志。',
    submitter: '吴十',
    priority: TicketPriority.HIGH,
    status: TicketStatus.RESOLVED
  }
];

const sampleComments = [
  {
    ticketIndex: 1,
    content: '已联系客户确认订单详情，正在核实库存情况。',
    author: '客服小明',
    offsetMinutes: -60
  },
  {
    ticketIndex: 1,
    content: '库存已确认，订单正在处理中，预计今天下午可以发货。',
    author: '仓库小红',
    offsetMinutes: -30
  },
  {
    ticketIndex: 3,
    content: '已完成权限管理模块的重构，支持自定义角色和权限分配。建议测试后验收。',
    author: '开发小张',
    offsetMinutes: -120
  },
  {
    ticketIndex: 3,
    content: '测试通过，功能已上线。感谢开发团队的支持！',
    author: '产品经理',
    offsetMinutes: -60
  },
  {
    ticketIndex: 7,
    content: '已检查邮件服务配置，发现SMTP服务器地址变更。已更新配置并重启服务。',
    author: '运维小李',
    offsetMinutes: -180
  },
  {
    ticketIndex: 7,
    content: '测试邮件发送正常，通知功能已恢复。',
    author: '测试小王',
    offsetMinutes: -120
  }
];

async function seedData() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    const db = getDatabase();

    console.log('Clearing existing data...');
    db.run('DELETE FROM comments');
    db.run('DELETE FROM tickets');

    console.log('Inserting sample tickets...');
    const ticketIds: string[] = [];
    const now = new Date();

    for (let i = 0; i < sampleTickets.length; i++) {
      const ticket = sampleTickets[i];
      const id = uuidv4();
      ticketIds.push(id);
      
      const createdAt = new Date(now.getTime() - (sampleTickets.length - i) * 24 * 60 * 60 * 1000);
      const updatedAt = ticket.status === TicketStatus.RESOLVED 
        ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000)
        : createdAt;

      db.run(
        `INSERT INTO tickets (id, title, description, submitter, priority, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          ticket.title,
          ticket.description,
          ticket.submitter,
          ticket.priority,
          ticket.status,
          createdAt.toISOString(),
          updatedAt.toISOString()
        ]
      );
    }

    console.log('Inserting sample comments...');
    for (const comment of sampleComments) {
      const ticketId = ticketIds[comment.ticketIndex];
      if (ticketId) {
        const commentTime = new Date(now.getTime() + comment.offsetMinutes * 60 * 1000);
        db.run(
          `INSERT INTO comments (id, ticketId, content, author, createdAt)
           VALUES (?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            ticketId,
            comment.content,
            comment.author,
            commentTime.toISOString()
          ]
        );
      }
    }

    saveDatabase();
    console.log('Sample data inserted successfully!');
    console.log(`Inserted ${sampleTickets.length} tickets and ${sampleComments.length} comments`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
