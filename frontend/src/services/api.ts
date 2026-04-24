import axios from 'axios';
import { 
  Ticket, 
  TicketComment, 
  Attachment,
  ActionLog,
  User,
  Notification,
  CreateTicketRequest, 
  UpdateTicketStatusRequest, 
  UpdateTicketAssigneeRequest,
  CreateCommentRequest,
  PaginatedResponse,
  Statistics,
  AttachmentConfig,
  TicketStatus,
  TicketPriority
} from '../types';

let currentUser: User | null = null;

export const setCurrentUser = (user: User | null) => {
  currentUser = user;
};

export const getCurrentUser = () => currentUser;

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    if (currentUser) {
      config.headers['X-User-Id'] = currentUser.id;
      config.headers['X-Username'] = currentUser.username;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const ticketApi = {
  async getTickets(
    page: number = 1,
    pageSize: number = 10,
    status?: TicketStatus,
    priority?: TicketPriority,
    search?: string,
    assignee?: string,
    myAssignee?: string,
    startDate?: string,
    endDate?: string
  ): Promise<PaginatedResponse<Ticket>> {
    const params: Record<string, any> = {
      page,
      pageSize
    };

    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (search) params.search = search;
    if (assignee) params.assignee = assignee;
    if (myAssignee) params.myAssignee = myAssignee;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await api.get('/tickets', { params });
    return response.data;
  },

  async getTicketById(id: string): Promise<Ticket> {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  async createTicket(data: CreateTicketRequest): Promise<Ticket> {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  async updateTicketStatus(id: string, status: TicketStatus, operator: string): Promise<Ticket> {
    const data: UpdateTicketStatusRequest = { status, operator };
    const response = await api.put(`/tickets/${id}/status`, data);
    return response.data;
  },

  async updateTicketAssignee(id: string, assignee: string | null, operator: string): Promise<Ticket> {
    const data: UpdateTicketAssigneeRequest = { assignee, operator };
    const response = await api.put(`/tickets/${id}/assignee`, data);
    return response.data;
  },

  async getComments(ticketId: string): Promise<TicketComment[]> {
    const response = await api.get(`/tickets/${ticketId}/comments`);
    return response.data;
  },

  async addComment(ticketId: string, data: CreateCommentRequest): Promise<TicketComment> {
    const response = await api.post(`/tickets/${ticketId}/comments`, data);
    return response.data;
  },

  async getActionLogs(ticketId: string): Promise<ActionLog[]> {
    const response = await api.get(`/tickets/${ticketId}/logs`);
    return response.data;
  },

  async getStatistics(myAssignee?: string): Promise<Statistics> {
    const params: Record<string, any> = {};
    if (myAssignee) params.myAssignee = myAssignee;
    
    const response = await api.get('/tickets/statistics', { params });
    return response.data;
  },

  async getAllAssignees(): Promise<string[]> {
    const response = await api.get('/tickets/assignees');
    return response.data;
  },

  async getHandlerUsers(): Promise<User[]> {
    const response = await api.get('/tickets/handlers');
    return response.data;
  },

  async getAttachmentConfig(): Promise<AttachmentConfig> {
    const response = await api.get('/tickets/attachments/config');
    return response.data;
  },

  async getAttachments(ticketId: string): Promise<Attachment[]> {
    const response = await api.get(`/tickets/${ticketId}/attachments`);
    return response.data;
  },

  async uploadAttachment(ticketId: string, file: File, uploadedBy: string): Promise<Attachment> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const response = await api.post(`/tickets/${ticketId}/attachments`, {
            originalName: file.name,
            mimeType: file.type,
            fileData: base64,
            uploadedBy
          });
          resolve(response.data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  },

  getAttachmentDownloadUrl(attachmentId: string): string {
    return `/api/tickets/attachments/${attachmentId}/download`;
  }
};

export const userApi = {
  async getAllUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/users/me');
    return response.data;
  },

  async getHandlers(): Promise<User[]> {
    const response = await api.get('/users/handlers');
    return response.data;
  }
};

export const notificationApi = {
  async getNotifications(limit: number = 50, offset: number = 0): Promise<Notification[]> {
    const params = { limit, offset };
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  async getUnreadNotifications(): Promise<Notification[]> {
    const response = await api.get('/notifications/unread');
    return response.data;
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const response = await api.get('/notifications/unread/count');
    return response.data;
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    const response = await api.put('/notifications/read-all');
    return response.data;
  }
};

export default api;
