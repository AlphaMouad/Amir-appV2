export interface Project {
  id: string;
  name: string;
  clientName: string;
  contractorName?: string;
  status: 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface Trade {
  id: string;
  projectId: string;
  designation: string;
  supplierName?: string;
  quantity?: number;
  amount: number;
  totalAdvances: number;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface Payment {
  id: string;
  projectId: string;
  tradeId: string;
  date: Date;
  amount: number;
  type: 'advance' | 'expense' | 'income';
  designation?: string;
  receiptUrl?: string;
  createdAt: Date;
  ownerId: string;
}
