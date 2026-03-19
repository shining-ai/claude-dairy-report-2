import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

interface ListCustomersQuery {
  q?: string;
  page?: number;
  per_page?: number;
}

interface CustomerInput {
  company_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

function formatCustomerFull(c: {
  id: number;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    customer_id: c.id,
    company_name: c.companyName,
    contact_name: c.contactName,
    phone: c.phone,
    email: c.email,
    address: c.address,
    notes: c.notes,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

export async function listCustomers(query: ListCustomersQuery) {
  const page = query.page ?? 1;
  const perPage = query.per_page ?? 20;
  const skip = (page - 1) * perPage;

  const where = query.q
    ? {
        OR: [
          { companyName: { contains: query.q } },
          { contactName: { contains: query.q } },
        ],
      }
    : undefined;

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { companyName: 'asc' },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        email: true,
      },
    }),
  ]);

  return {
    customers: customers.map((c) => ({
      customer_id: c.id,
      company_name: c.companyName,
      contact_name: c.contactName,
      phone: c.phone,
      email: c.email,
    })),
    pagination: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
  };
}

export async function createCustomer(input: CustomerInput) {
  if (!input.company_name) {
    throw new AppError(400, 'VALIDATION_ERROR', '会社名は必須です');
  }

  const customer = await prisma.customer.create({
    data: {
      companyName: input.company_name,
      contactName: input.contact_name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      notes: input.notes,
    },
  });

  return formatCustomerFull(customer);
}

export async function getCustomer(customerId: number) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new AppError(404, 'NOT_FOUND', '顧客が見つかりません');
  }
  return formatCustomerFull(customer);
}

export async function updateCustomer(customerId: number, input: Partial<CustomerInput>) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new AppError(404, 'NOT_FOUND', '顧客が見つかりません');
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(input.company_name !== undefined ? { companyName: input.company_name } : {}),
      ...(input.contact_name !== undefined ? { contactName: input.contact_name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  return {
    customer_id: updated.id,
    company_name: updated.companyName,
    contact_name: updated.contactName,
    phone: updated.phone,
    email: updated.email,
    address: updated.address,
    notes: updated.notes,
    updated_at: updated.updatedAt,
  };
}

export async function deleteCustomer(customerId: number) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new AppError(404, 'NOT_FOUND', '顧客が見つかりません');
  }

  const visitCount = await prisma.visitRecord.count({ where: { customerId } });
  if (visitCount > 0) {
    throw new AppError(409, 'CUSTOMER_IN_USE', '訪問記録に使用されている顧客は削除できません');
  }

  await prisma.customer.delete({ where: { id: customerId } });
}
