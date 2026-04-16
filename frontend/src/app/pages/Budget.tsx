import DashboardLayout from '../components/DashboardLayout';
import { DollarSign, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Budget() {
  const monthlyData = [
    { month: 'Jan', income: 15000, expenses: 8000 },
    { month: 'Feb', income: 18000, expenses: 9500 },
    { month: 'Mar', income: 22000, expenses: 10200 },
    { month: 'Apr', income: 19000, expenses: 8800 },
  ];

  const recentTransactions = [
    { id: 1, desc: 'Equipment Maintenance', amount: 1200, type: 'expense', date: '2026-04-15' },
    { id: 2, desc: 'Membership Renewals', amount: 4500, type: 'income', date: '2026-04-14' },
    { id: 3, desc: 'Electricity Bill', amount: 800, type: 'expense', date: '2026-04-12' },
    { id: 4, desc: 'New Dumbbells Set', amount: 2400, type: 'expense', date: '2026-04-10' },
  ];

  return (
    <DashboardLayout title="Budget & Financials">
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <h3 className="text-2xl font-bold">$42,500</h3>
              </div>
            </div>
            <div className="text-sm text-green-500 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> +12% from last month
            </div>
          </div>
          
          <div className="p-6 rounded-xl bg-card border border-border">
             <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <h3 className="text-2xl font-bold">$19,000</h3>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
             <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                <h3 className="text-2xl font-bold">$8,800</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 rounded-xl bg-card border border-border">
            <h3 className="text-lg font-semibold mb-6">Income vs Expenses</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="income" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
             <h3 className="text-lg font-semibold mb-6 flex justify-between items-center">
               Recent Transactions
               <button className="text-sm text-primary hover:underline">View All</button>
             </h3>
             <div className="space-y-4">
               {recentTransactions.map((tx, i) => (
                 <motion.div 
                   key={tx.id}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.1 }}
                   className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                 >
                   <div>
                     <p className="font-medium text-sm">{tx.desc}</p>
                     <p className="text-xs text-muted-foreground">{tx.date}</p>
                   </div>
                   <div className={`font-semibold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                     {tx.type === 'income' ? '+' : '-'}${tx.amount}
                   </div>
                 </motion.div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
