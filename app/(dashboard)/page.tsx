export default function Page() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Welcome</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Manage your MySQL connections, browse tables, and edit records.
        </p>
      </div>
      <a
        href="/connections"
        className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md dark:bg-gray-800"
      >
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Connections</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Add and manage database connections
        </p>
      </a>
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Status</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          All systems operational
        </p>
      </div>
    </div>
  );
}