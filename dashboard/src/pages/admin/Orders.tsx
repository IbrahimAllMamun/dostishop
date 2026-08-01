import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { formatTk, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ orders: Order[] }>('/orders/admin/all')
      .then((d) => setOrders(d.orders))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<Order>[] = [
    {
      key: 'orderNo',
      header: 'Order',
      sortable: true,
      value: (o) => o.orderNo,
      render: (o) => <span className="font-medium">{o.orderNo}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      value: (o) => o.createdAt,
      className: 'whitespace-nowrap text-muted-foreground',
      render: (o) => formatDate(o.createdAt),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      // Phone is in the search index too — it is how support looks an order up
      value: (o) => `${o.customerName} ${o.phone}`,
      render: (o) => (
        <>
          <div>{o.customerName}</div>
          <div className="text-xs text-muted-foreground">{o.phone}</div>
        </>
      ),
    },
    {
      key: 'shops',
      header: 'Shops / status',
      value: (o) => o.subOrders.map((s) => `${s.shop?.name ?? ''} ${s.status}`).join(' '),
      render: (o) => (
        <div className="flex flex-col gap-1">
          {o.subOrders.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{s.shop?.name}</span>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      sortable: true,
      value: (o) => o.paymentMethod,
      render: (o) => o.paymentMethod,
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      value: (o) => Number(o.grandTotal),
      render: (o) => <span className="font-medium">{formatTk(o.grandTotal)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Orders</h1>

      <DataTable
        columns={columns}
        rows={orders}
        getRowId={(o) => o.id}
        loading={loading}
        searchPlaceholder="Search by order no, name or phone…"
        empty="No orders yet."
        initialPageSize={25}
      />
    </div>
  );
}
