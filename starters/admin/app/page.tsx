import { SignOutButton } from "@repo/auth/components";
import { requireAdmin } from "@repo/auth/next";
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { BanButton } from "@/components/ban-button";
import { auth } from "@/lib/auth";

const PAGE_SIZE = 50;

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireAdmin(auth());
  const page = Math.max(1, Number((await searchParams).page) || 1);

  // Goes through the admin plugin, which checks the admin role again on the server.
  const { users, total } = await auth().api.listUsers({
    headers: await headers(),
    query: {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users ({total})</h1>
        <SignOutButton />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  {user.role ?? "user"}
                </Badge>
                {user.banned && <Badge variant="destructive" className="ml-2">banned</Badge>}
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                {user.id !== session.user.id && (
                  <BanButton userId={user.id} banned={Boolean(user.banned)} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">
          Page {page} of {pages}
        </span>
        {page > 1 && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/?page=${page - 1}`}>Previous</Link>
          </Button>
        )}
        {page < pages && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/?page=${page + 1}`}>Next</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
