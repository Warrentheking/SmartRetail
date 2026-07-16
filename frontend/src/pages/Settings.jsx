import { useEffect, useState } from "react";
import { UserPlus, Trash2, Users as UsersIcon } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import { Badge } from "../components/Badge";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingScreen from "../components/LoadingScreen";

const emptyForm = { name: "", email: "", password: "", role: "cashier" };

export default function Settings() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  async function loadUsers() {
    const { data } = await api.get("/auth/users");
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.post("/auth/create-user", form);
      showToast(`${form.role === "owner" ? "Owner" : "Cashier"} account created for ${form.name}`);
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create the account.");
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    setDeleteError("");
    const name = pendingDelete.name;
    try {
      await api.delete(`/auth/users/${pendingDelete.user_id}`);
      showToast(`${name}'s account was removed`);
      setPendingDelete(null);
      await loadUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.detail || "Could not remove this account.");
      setPendingDelete(null);
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading settings..." />;
  }

  return (
    <AppShell title="Settings" subtitle="Manage staff accounts and access">
      <div className="space-y-6 max-w-3xl">
        {deleteError && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
            {deleteError}
          </div>
        )}

        <Card title="Add staff account">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
                placeholder="e.g. Ama Mensah"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
                placeholder="ama@smartretail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Temporary password</label>
              <input
                type="text"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-shadow"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              >
                <option value="cashier">Cashier</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            {error && (
              <div className="sm:col-span-2 bg-red-50 border border-red-100 text-red-600 text-sm px-3.5 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-card"
              >
                <UserPlus className="w-4 h-4" strokeWidth={2} />
                {creating ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Staff">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <UsersIcon className="w-8 h-8 mb-2" strokeWidth={1.5} />
              <p className="text-sm">No accounts yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-3 px-2 font-medium">Name</th>
                    <th className="pb-3 px-2 font-medium">Email</th>
                    <th className="pb-3 px-2 font-medium">Role</th>
                    <th className="pb-3 px-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-2 text-gray-900">
                        {u.name}
                        {u.user_id === currentUser.id && <span className="text-gray-400"> (you)</span>}
                      </td>
                      <td className="py-3 px-2 text-gray-500">{u.email}</td>
                      <td className="py-3 px-2">
                        <Badge tone={u.role === "owner" ? "violet" : "info"} className="capitalize">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => setPendingDelete(u)}
                          aria-label={`Remove ${u.name}`}
                          className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Remove ${pendingDelete?.name}?`}
        description="They'll immediately lose access to SmartRetail. This can't be undone."
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  );
}
