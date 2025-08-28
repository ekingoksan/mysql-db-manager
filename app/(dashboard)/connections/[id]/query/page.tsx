import QueryEditor from "@/components/query/QueryEditor";
import Link from "next/link";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Query Editor</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Only SELECT/WITH queries are allowed</p>
        </div>
        <Link
          href={`/connections/${id}`}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Back
        </Link>
      </div>

      <QueryEditor connectionId={id} />
    </div>
  );
}