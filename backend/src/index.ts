import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './config/database';
import ticketRoutes from './routes/ticketRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import * as userService from './services/userService';
import { UserRole } from './types';

const app = express();
const PORT = process.env.PORT || 3001;

const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Uploads directory created at: ${uploadsDir}`);
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function initializeDefaultUsers() {
  try {
    const existingUsers = await userService.getAllUsers();
    
    if (existingUsers.length === 0) {
      console.log('Creating default users...');
      
      await userService.createUser('admin', '管理员', UserRole.ADMIN);
      console.log('Created user: admin (管理员) - role: admin');
      
      await userService.createUser('handler1', '处理人小明', UserRole.HANDLER);
      console.log('Created user: handler1 (处理人小明) - role: handler');
      
      await userService.createUser('handler2', '处理人小红', UserRole.HANDLER);
      console.log('Created user: handler2 (处理人小红) - role: handler');
      
      await userService.createUser('submitter1', '提交人张三', UserRole.SUBMITTER);
      console.log('Created user: submitter1 (提交人张三) - role: submitter');
      
      await userService.createUser('submitter2', '提交人李四', UserRole.SUBMITTER);
      console.log('Created user: submitter2 (提交人李四) - role: submitter');
      
      console.log('Default users created successfully!');
    }
  } catch (error) {
    console.error('Failed to initialize default users:', error);
  }
}

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    
    await initializeDefaultUsers();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API endpoint: http://localhost:${PORT}/api`);
      console.log('');
      console.log('=== Default Users ===');
      console.log('admin / 管理员 - Role: admin (所有权限)');
      console.log('handler1 / 处理人小明 - Role: handler (处理分配的工单)');
      console.log('handler2 / 处理人小红 - Role: handler (处理分配的工单)');
      console.log('submitter1 / 提交人张三 - Role: submitter (提交和查看自己的工单)');
      console.log('submitter2 / 提交人李四 - Role: submitter (提交和查看自己的工单)');
      console.log('');
      console.log('Use X-User-Id or X-Username header to specify the current user.');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
