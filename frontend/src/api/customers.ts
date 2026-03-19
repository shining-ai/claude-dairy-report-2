import apiClient from './client';

export interface Customer {
  customer_id: number;
  company_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerData {
  company_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface CustomerListResponse {
  data: {
    customers: Customer[];
    pagination: {
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    };
  };
}

export interface CustomerResponse {
  data: Customer;
}

export const getCustomers = (params?: { q?: string; page?: number; per_page?: number }) =>
  apiClient.get<CustomerListResponse>('/customers', { params });

export const getCustomer = (id: number) =>
  apiClient.get<CustomerResponse>(`/customers/${id}`);

export const createCustomer = (data: CustomerData) =>
  apiClient.post<CustomerResponse>('/customers', data);

export const updateCustomer = (id: number, data: CustomerData) =>
  apiClient.put<CustomerResponse>(`/customers/${id}`, data);

export const deleteCustomer = (id: number) =>
  apiClient.delete(`/customers/${id}`);
