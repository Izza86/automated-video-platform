import { 
  getAllSubscriptions, 
  getSubscriptionStats, 
  getRecentPayments,
  getSubscriptionGrowth 
} from "@/server/admin-subscriptions";
import { checkIsAdmin } from "@/server/permissions";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  CreditCard,
  CalendarDays 
} from "lucide-react";

export default async function AdminBillingPage() {
  const isAdmin = await checkIsAdmin();
  
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [subscriptions, stats, recentPayments, growth] = await Promise.all([
    getAllSubscriptions(),
    getSubscriptionStats(),
    getRecentPayments(10),
    getSubscriptionGrowth(),
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500",
      trialing: "bg-blue-500",
      canceled: "bg-red-500",
      past_due: "bg-yellow-500",
      paused: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor subscriptions, revenue, and billing analytics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Paying customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.mrr)}</div>
            <p className="text-xs text-muted-foreground">
              Monthly recurring revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.arr)}</div>
            <p className="text-xs text-muted-foreground">
              Annual recurring revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.monthlyRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions by Plan */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by Plan</CardTitle>
            <CardDescription>Distribution of active plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.subscriptionsByPlan.map((plan) => (
                <div key={plan.planName} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm font-medium">{plan.planName}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {plan.count} users
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by Status</CardTitle>
            <CardDescription>Current subscription states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.subscriptionsByStatus.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(status.status)}`} />
                    <span className="text-sm font-medium capitalize">
                      {status.status.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {status.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recent Payments
          </CardTitle>
          <CardDescription>Latest successful transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No payments yet
                  </TableCell>
                </TableRow>
              ) : (
                recentPayments.map((item) => (
                  <TableRow key={item.payment.id}>
                    <TableCell className="font-medium">
                      {item.user.name}
                    </TableCell>
                    <TableCell>{item.user.email}</TableCell>
                    <TableCell>
                      {formatCurrency(Number(item.payment.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.payment.status === "succeeded"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {item.payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(item.payment.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* All Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>Complete list of user subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Period End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No subscriptions yet
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((item) => (
                  <TableRow key={item.subscription.id}>
                    <TableCell className="font-medium">
                      {item.user.name}
                    </TableCell>
                    <TableCell>{item.user.email}</TableCell>
                    <TableCell>{item.plan.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.subscription.status === "active"
                            ? "default"
                            : "secondary"
                        }
                        className={getStatusColor(item.subscription.status)}
                      >
                        {item.subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(item.plan.price))}/
                      {item.plan.interval}
                    </TableCell>
                    <TableCell>
                      {new Date(
                        item.subscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
