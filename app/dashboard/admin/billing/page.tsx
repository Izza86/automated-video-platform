import {
  CalendarDays,
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAllSubscriptions,
  getRecentPayments,
  getSubscriptionGrowth,
  getSubscriptionStats,
} from "@/server/admin-subscriptions";
import { checkIsAdmin } from "@/server/permissions";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const isAdmin = await checkIsAdmin();

  if (!isAdmin) {
    redirect("/dashboard");
  }

  let subscriptions, stats, recentPayments, growth;
  try {
    [subscriptions, stats, recentPayments, growth] = await Promise.all([
      getAllSubscriptions(),
      getSubscriptionStats(),
      getRecentPayments(10),
      getSubscriptionGrowth(),
    ]);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    // DB unreachable during build prerendering — redirect instead of crashing
    console.error("[AdminBillingPage] data fetch failed:", error);
    redirect("/dashboard");
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

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
        <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text font-bold text-3xl text-transparent">
          Subscription Management
        </h1>
        <p className="mt-2 text-muted-foreground">
          Monitor subscriptions, revenue, and billing analytics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/5 to-pink-900/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Active Subscriptions
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats.activeSubscriptions}
            </div>
            <p className="text-muted-foreground text-xs">Paying customers</p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/5 to-pink-900/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(stats.mrr)}
            </div>
            <p className="text-muted-foreground text-xs">
              Monthly recurring revenue
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/5 to-pink-900/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">ARR</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(stats.arr)}
            </div>
            <p className="text-muted-foreground text-xs">
              Annual recurring revenue
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/5 to-pink-900/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">This Month</CardTitle>
            <CalendarDays className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(stats.monthlyRevenue)}
            </div>
            <p className="text-muted-foreground text-xs">Revenue this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions by Plan */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/5 to-pink-900/5">
          <CardHeader>
            <CardTitle>Subscriptions by Plan</CardTitle>
            <CardDescription>Distribution of active plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.subscriptionsByPlan.map((plan) => (
                <div
                  className="flex items-center justify-between"
                  key={plan.planName}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-600" />
                    <span className="font-medium text-sm">{plan.planName}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {plan.count} users
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/5 to-pink-900/5">
          <CardHeader>
            <CardTitle>Subscriptions by Status</CardTitle>
            <CardDescription>Current subscription states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.subscriptionsByStatus.map((status) => (
                <div
                  className="flex items-center justify-between"
                  key={status.status}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${getStatusColor(status.status)}`}
                    />
                    <span className="font-medium text-sm capitalize">
                      {status.status.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {status.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/5 to-pink-900/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
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
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={5}
                  >
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
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/5 to-pink-900/5">
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
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={6}
                  >
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
                        className={getStatusColor(item.subscription.status)}
                        variant={
                          item.subscription.status === "active"
                            ? "default"
                            : "secondary"
                        }
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
